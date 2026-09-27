"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAdoptionUpdate,
  deleteAdoptionUpdate,
  deleteAdoptionUpdateFile,
} from "@/lib/actions/adoption-updates";
import { prepareForUpload } from "@/lib/images/prepare-upload";
import {
  ADOPTION_UPDATE_CHANNELS,
  ADOPTION_UPDATE_MAX_FILE_BYTES,
  ADOPTION_UPDATE_MAX_FILES,
  adoptionChannelLabel,
  classifyAdoptionFile,
} from "@/lib/adoption-updates/rules";
import { formatBelgianDate } from "@/lib/animals/owner-return";
import PdfViewerButton from "@/components/beheerder/shared/PdfViewer";
import EmailViewer, { type EmailView } from "@/components/beheerder/shared/EmailViewer";
import type { AdoptionUpdateFileView, AdoptionUpdateView } from "@/lib/queries/adoption-updates";

interface Props {
  animalId: number;
  /** Toevoegen en verwijderen vraagt `adoption:write`; kijken kan iedereen die de sectie ziet. */
  canWrite: boolean;
  updates: AdoptionUpdateView[];
  /** Vandaag (Belgische tijd), door de server berekend: standaarddatum en bovengrens. */
  today: string;
}

const bestandUrl = (id: number) => `/api/adoptie/berichten/bestand/${id}`;

/** Een foto uit de galerij wordt toch verkleind; een HEIC-foto zet de browser om naar JPG. */
const FOTO_IN_BROWSER = /\.(heic|heif)$/i;

const knop =
  "rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
const veld =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500";

/**
 * Story 10.74 (Sven) — berichten en foto's die de adoptant na de adoptie stuurt
 * (WhatsApp, mail, …), ter opvolging. Bestanden staan in de private opslag en
 * openen enkel via de beveiligde route.
 */
export default function AdoptionUpdatesSection({ animalId, canWrite, updates, today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [receivedOn, setReceivedOn] = useState(today);
  const [channel, setChannel] = useState<string>("whatsapp");
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [voortgang, setVoortgang] = useState<string | null>(null);
  const [fouten, setFouten] = useState<string[]>([]);
  const [gelukt, setGelukt] = useState<string | null>(null);

  const [openMail, setOpenMail] = useState<AdoptionUpdateFileView | null>(null);
  const [mailView, setMailView] = useState<EmailView | null>(null);
  const [mailFout, setMailFout] = useState<string | null>(null);
  const [mailLaden, setMailLaden] = useState(false);

  const sluitMail = useCallback(() => {
    setOpenMail(null);
    setMailView(null);
    setMailFout(null);
  }, []);

  useEffect(() => {
    if (!openMail) return;
    const opToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") sluitMail();
    };
    document.addEventListener("keydown", opToets);
    return () => document.removeEventListener("keydown", opToets);
  }, [openMail, sluitMail]);

  async function leesMail(f: AdoptionUpdateFileView) {
    setOpenMail(f);
    setMailView(null);
    setMailFout(null);
    setMailLaden(true);
    try {
      const res = await fetch(`${bestandUrl(f.id)}/mail`);
      const data = await res.json();
      if (res.ok) setMailView(data as EmailView);
      else setMailFout(data.error || "Kon de mail niet openen.");
    } catch {
      setMailFout("Kon de mail niet openen. Probeer opnieuw.");
    } finally {
      setMailLaden(false);
    }
  }

  function kiesBestanden(lijst: FileList | null) {
    if (!lijst) return;
    const geweigerd: string[] = [];
    const nieuw: File[] = [];
    for (const f of Array.from(lijst)) {
      if (FOTO_IN_BROWSER.test(f.name) || classifyAdoptionFile(f.name)) nieuw.push(f);
      else geweigerd.push(`"${f.name}": enkel foto's (JPG, PNG, WebP), doorgestuurde mails (.eml) of PDF.`);
    }
    const samen = [...files, ...nieuw];
    if (samen.length > ADOPTION_UPDATE_MAX_FILES) {
      geweigerd.push(`Hooguit ${ADOPTION_UPDATE_MAX_FILES} bestanden per bericht.`);
    }
    setFiles(samen.slice(0, ADOPTION_UPDATE_MAX_FILES));
    setFouten(geweigerd);
    setGelukt(null);
  }

  function resetForm() {
    setReceivedOn(today);
    setChannel("whatsapp");
    setSender("");
    setMessage("");
    setFiles([]);
  }

  function bewaar() {
    setFouten([]);
    setGelukt(null);
    startTransition(async () => {
      const problemen: string[] = [];

      // 1. Foto's verkleinen in de browser; wat niet lukt, valt weg met een melding.
      const klaar: File[] = [];
      for (const f of files) {
        try {
          const bestand = await prepareForUpload(f);
          if (bestand.size > ADOPTION_UPDATE_MAX_FILE_BYTES) {
            problemen.push(`"${f.name}" is te groot (max. ${ADOPTION_UPDATE_MAX_FILE_BYTES / 1024 / 1024} MB).`);
          } else {
            klaar.push(bestand);
          }
        } catch (err) {
          problemen.push(err instanceof Error ? err.message : `"${f.name}" kon niet verwerkt worden.`);
        }
      }

      // 2. Het bericht zelf.
      const result = await createAdoptionUpdate({
        animalId,
        receivedOn,
        channel,
        sender,
        message,
        fileCount: klaar.length,
      });
      if (!result.success) {
        setFouten([result.error ?? "Het bericht kon niet bewaard worden.", ...problemen]);
        return;
      }

      // 3. De bestanden, één voor één (elk blijft zo onder de limiet van één aanvraag).
      for (const [i, bestand] of klaar.entries()) {
        setVoortgang(`Bestand ${i + 1} van ${klaar.length} opladen…`);
        const fd = new FormData();
        fd.append("updateId", String(result.data.id));
        fd.append("file", bestand);
        try {
          const res = await fetch("/api/adoptie/berichten/upload", { method: "POST", body: fd });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            problemen.push(data.error || `"${bestand.name}" kon niet opgeladen worden.`);
          }
        } catch {
          problemen.push(`"${bestand.name}" kon niet opgeladen worden.`);
        }
      }
      setVoortgang(null);

      setFormOpen(false);
      resetForm();
      if (problemen.length > 0) setFouten(["Het bericht is bewaard, maar niet alles lukte:", ...problemen]);
      else setGelukt("Bericht bewaard.");
      router.refresh();
    });
  }

  function verwijderBericht(u: AdoptionUpdateView) {
    const uitleg = u.files.length > 0 ? ` en ${u.files.length} bestand(en)` : "";
    if (!window.confirm(`Dit bericht${uitleg} definitief verwijderen?`)) return;
    startTransition(async () => {
      const r = await deleteAdoptionUpdate(u.id);
      if (r.success) router.refresh();
      else setFouten([r.error ?? "Verwijderen mislukt."]);
    });
  }

  function verwijderBestand(f: AdoptionUpdateFileView) {
    if (!window.confirm(`"${f.fileName}" definitief verwijderen?`)) return;
    startTransition(async () => {
      const r = await deleteAdoptionUpdateFile(f.id);
      if (r.success) router.refresh();
      else setFouten([r.error ?? "Verwijderen mislukt."]);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-gray-500">
          Foto&apos;s en berichten die de adoptant stuurt. Enkel zichtbaar voor wie adopties mag bekijken.
        </p>
        {canWrite && !formOpen && (
          <button type="button" onClick={() => { setFormOpen(true); setGelukt(null); setFouten([]); }} className={knop}>
            Bericht toevoegen
          </button>
        )}
      </div>

      {formOpen && (
        <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="adoptie-bericht-datum" className="block text-xs font-medium text-gray-600">Datum</label>
              <input id="adoptie-bericht-datum" type="date" max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} className={veld} />
            </div>
            <div>
              <label htmlFor="adoptie-bericht-kanaal" className="block text-xs font-medium text-gray-600">Kanaal</label>
              <select id="adoptie-bericht-kanaal" value={channel} onChange={(e) => setChannel(e.target.value)} className={veld}>
                {ADOPTION_UPDATE_CHANNELS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="adoptie-bericht-van" className="block text-xs font-medium text-gray-600">Van (optioneel)</label>
              <input id="adoptie-bericht-van" type="text" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="bv. de adoptant" className={veld} />
            </div>
          </div>
          <div>
            <label htmlFor="adoptie-bericht-tekst" className="block text-xs font-medium text-gray-600">Bericht</label>
            <textarea id="adoptie-bericht-tekst" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Wat schreef de adoptant? Plak hier bv. het WhatsApp-bericht." className={veld} />
          </div>
          <div>
            <label htmlFor="adoptie-bericht-bestanden" className="block text-xs font-medium text-gray-600">
              Foto&apos;s, mails (.eml) of PDF
            </label>
            <input
              id="adoptie-bericht-bestanden"
              type="file"
              multiple
              accept="image/*,.heic,.heif,.eml,message/rfc822,.pdf,application/pdf"
              onChange={(e) => { kiesBestanden(e.target.files); e.target.value = ""; }}
              className="mt-1 block w-full text-xs text-gray-600"
            />
            <p className="mt-0.5 text-[11px] text-gray-500">
              Foto&apos;s uit WhatsApp: eerst bewaren in de galerij van je gsm. Een mail: doorsturen naar jezelf en als .eml bewaren.
              Foto&apos;s worden automatisch verkleind.
            </p>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-xs text-gray-700">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`${f.name} weglaten`} className="text-gray-400 hover:text-red-600">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={bewaar} disabled={isPending} className="rounded-md bg-[#1b4332] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50">
              {isPending ? "Bezig…" : "Bewaren"}
            </button>
            <button type="button" onClick={() => { setFormOpen(false); setFouten([]); }} disabled={isPending} className={knop}>
              Annuleren
            </button>
            {voortgang && <span className="text-xs text-gray-600">{voortgang}</span>}
          </div>
        </div>
      )}

      {fouten.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-700">
          {fouten.map((f, i) => <p key={i}>{f}</p>)}
        </div>
      )}
      {gelukt && <p role="status" className="text-xs text-emerald-700">{gelukt}</p>}

      {updates.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nog geen berichten. Bewaar hier foto&apos;s en berichten die de adoptant stuurt (WhatsApp, mail, …).
        </p>
      ) : (
        <ul aria-label="Berichten na adoptie" className="space-y-3">
          {updates.map((u) => {
            const fotos = u.files.filter((f) => f.kind === "foto");
            const andere = u.files.filter((f) => f.kind !== "foto");
            return (
              <li key={u.id} className="rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-900">{formatBelgianDate(u.receivedOn)}</span>
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      {adoptionChannelLabel(u.channel)}
                    </span>
                    {u.sender && <span className="ml-2 text-gray-600">van {u.sender}</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    {u.createdByName && <span className="text-[11px] text-gray-400">bewaard door {u.createdByName}</span>}
                    {canWrite && (
                      <button type="button" onClick={() => verwijderBericht(u)} disabled={isPending} className="text-[11px] text-red-600 hover:underline">
                        Bericht verwijderen
                      </button>
                    )}
                  </div>
                </div>

                {u.message && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{u.message}</p>}

                {fotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fotos.map((f) => (
                      <div key={f.id} className="relative">
                        <a href={bestandUrl(f.id)} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- beveiligde route, geen next/image-optimalisatie */}
                          <img src={bestandUrl(f.id)} alt={f.fileName} loading="lazy" className="h-24 w-24 rounded-md object-cover hover:opacity-90" />
                        </a>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => verwijderBestand(f)}
                            disabled={isPending}
                            aria-label={`Bestand verwijderen: ${f.fileName}`}
                            className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs text-red-600 shadow hover:bg-white"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {andere.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {andere.map((f) => (
                      <li key={f.id} className="flex items-center gap-1">
                        {f.kind === "mail" ? (
                          <button type="button" onClick={() => leesMail(f)} aria-label={`Mail lezen: ${f.fileName}`} className={knop}>
                            ✉ {f.fileName}
                          </button>
                        ) : (
                          <PdfViewerButton src={bestandUrl(f.id)} title={f.fileName} className={knop}>
                            <span className="sr-only">PDF openen: </span>
                            {f.fileName}
                          </PdfViewerButton>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => verwijderBestand(f)}
                            disabled={isPending}
                            aria-label={`Bestand verwijderen: ${f.fileName}`}
                            className="text-xs text-gray-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {openMail && (
        <EmailViewer
          fileName={openMail.fileName}
          downloadUrl={`${bestandUrl(openMail.id)}?download=1`}
          attachmentHref={(index) => `${bestandUrl(openMail.id)}/mail/bijlage/${index}`}
          view={mailView}
          error={mailFout}
          isLoading={mailLaden}
          onClose={sluitMail}
        />
      )}
    </div>
  );
}
