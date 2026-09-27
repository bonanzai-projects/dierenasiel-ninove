"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PdfViewerButton from "@/components/beheerder/shared/PdfViewer";
import { emailIbnDossier } from "@/lib/actions/ibn-dossier";
import type { IbnDossierMailing } from "@/lib/queries/ibn-dossier";

interface Props {
  animalId: number;
  animalName: string;
  /** Mailen vraagt schrijfrechten; bekijken kan iedereen die de fiche ziet. */
  canMail: boolean;
  mailings: IbnDossierMailing[];
}

/** DD/MM/JJJJ UU:MM in Belgische tijd — gelijk op server en browser (geen hydration-verschil). */
function belgischTijdstip(iso: string): string {
  const delen = new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const d = (type: string) => delen.find((p) => p.type === type)?.value ?? "";
  return `${d("day")}/${d("month")}/${d("year")} ${d("hour")}:${d("minute")}`;
}

const knop =
  "rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50";

/**
 * Story 10.72 — het volledige IBN-dossier bekijken (venster van 10.71) of mailen
 * naar politie of Dierenwelzijn (Sven). Staat in het rode IBN-blok op de fiche.
 */
export default function IbnDossierActions({ animalId, animalName, canMail, mailings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [naar, setNaar] = useState("");
  const [bericht, setBericht] = useState("");
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);

  function verstuur() {
    setMelding(null);
    startTransition(async () => {
      const result = await emailIbnDossier(animalId, { recipients: naar, message: bericht });
      if (result.success) {
        setMelding({ ok: true, tekst: result.message ?? "Verstuurd." });
        setFormOpen(false);
        setNaar("");
        setBericht("");
        router.refresh();
      } else {
        setMelding({ ok: false, tekst: result.error ?? "Er ging iets mis" });
      }
    });
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <PdfViewerButton src={`/api/dieren/${animalId}/ibn-dossier/pdf`} title={`IBN-dossier ${animalName}`} className={knop}>
          IBN-dossier bekijken
        </PdfViewerButton>
        {canMail && !formOpen && (
          <button type="button" onClick={() => { setMelding(null); setFormOpen(true); }} className={knop}>
            IBN-dossier mailen…
          </button>
        )}
      </div>

      {formOpen && (
        <div className="space-y-2 rounded-md border border-red-200 bg-white p-3">
          <div>
            <label htmlFor="ibn-mail-naar" className="block text-xs font-medium text-gray-600">
              Naar
            </label>
            <input
              id="ibn-mail-naar"
              type="text"
              inputMode="email"
              autoComplete="email"
              value={naar}
              onChange={(e) => setNaar(e.target.value)}
              placeholder="bv. wijkagent@politie.be; dierenwelzijn@vlaanderen.be"
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
            <p className="mt-0.5 text-[11px] text-gray-500">
              Meerdere adressen scheiden met een komma of puntkomma. Antwoorden komen bij jou terecht.
            </p>
          </div>
          <div>
            <label htmlFor="ibn-mail-bericht" className="block text-xs font-medium text-gray-600">
              Bericht (optioneel)
            </label>
            <textarea
              id="ibn-mail-bericht"
              rows={3}
              value={bericht}
              onChange={(e) => setBericht(e.target.value)}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Het dossier (gegevens van het dier, de inbeslagname en het verwaarlozingsrapport met foto&apos;s) gaat als
            PDF in bijlage mee.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={verstuur}
              disabled={isPending}
              className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {isPending ? "Bezig met versturen..." : "Versturen"}
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setMelding(null); }}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {melding && (
        <p role={melding.ok ? "status" : "alert"} className={`text-xs ${melding.ok ? "text-emerald-700" : "text-red-600"}`}>
          {melding.tekst}
        </p>
      )}

      {mailings.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Eerder verstuurd</p>
          <ul aria-label="Eerder verstuurd" className="mt-1 space-y-0.5 text-xs text-gray-700">
            {mailings.map((m, i) => (
              <li key={`${m.sentAt}-${i}`}>
                {belgischTijdstip(m.sentAt)} — naar {m.to.join(", ")}
                {m.by ? <span className="text-gray-500"> (door {m.by})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
