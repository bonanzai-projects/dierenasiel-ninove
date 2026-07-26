"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyAnimalShelterFields,
  clearAnimalShelterDecisions,
  ignoreAnimalShelterFields,
} from "@/lib/actions/animalshelter";
import type { DiffRow } from "@/lib/animalshelter/diff";

/**
 * Story 11.5 — onze fiche naast die van AnimalShelter, per veld.
 *
 * Uitgangspunten uit de koerswijziging §4:
 *  - de veilige keuze is de standaard ("negeren" is waardegebonden; "altijd
 *    negeren" staat er apart naast);
 *  - een genegeerde regel blijft zichtbaar en houdt altijd een weg terug;
 *  - waar de tool het verschil niet kan beslechten, staat de reden en géén knop.
 */

interface Props {
  externalId: number;
  animalId: number;
  rows: DiffRow[];
}

/** dd/mm/jjjj — `toLocaleDateString("nl-BE")` laat de voorloopnul weg. */
function datumNl(waarde: string | Date | null | undefined): string {
  if (!waarde) return "";
  const datum = waarde instanceof Date ? waarde : new Date(waarde);
  if (Number.isNaN(datum.getTime())) return "";
  const [jaar, maand, dag] = datum
    .toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" })
    .split("-");
  return `${dag}/${maand}/${jaar}`;
}

function Waarde({ tekst, multiline }: { tekst: string; multiline: boolean }) {
  if (multiline) {
    return (
      <span className="line-clamp-4 whitespace-pre-wrap break-words text-sm" title={tekst}>
        {tekst}
      </span>
    );
  }
  return <span className="break-words text-sm">{tekst}</span>;
}

export default function ComparisonTable({ externalId, animalId, rows }: Props) {
  const router = useRouter();
  const [bezig, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [toonGelijk, setToonGelijk] = useState(false);

  const open = useMemo(() => rows.filter((r) => r.state === "verschil"), [rows]);
  const gelijk = useMemo(() => rows.filter((r) => r.state === "gelijk"), [rows]);
  const zichtbaar = toonGelijk ? rows : rows.filter((r) => r.state !== "gelijk");

  function voerUit(actie: () => Promise<{ success: boolean; error?: string }>) {
    setFout(null);
    startTransition(async () => {
      const result = await actie();
      if (!result.success) {
        setFout(result.error ?? "Er ging iets mis.");
        return;
      }
      router.refresh();
    });
  }

  const overnemen = (keys: string[]) =>
    voerUit(() => applyAnimalShelterFields(externalId, animalId, keys));
  const negeren = (keys: string[], altijd: boolean) =>
    voerUit(() => ignoreAnimalShelterFields(externalId, animalId, keys, altijd));
  const terugdraaien = (keys: string[]) =>
    voerUit(() => clearAnimalShelterDecisions(externalId, animalId, keys));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {open.length === 0
            ? "Geen openstaande verschillen."
            : `${open.length} ${open.length === 1 ? "verschil" : "verschillen"} wachten op een beslissing.`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {open.length > 0 && (
            <>
              <button
                type="button"
                disabled={bezig}
                onClick={() => overnemen(open.map((r) => r.key))}
                className="rounded-lg bg-[#1b4332] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
              >
                Alles overnemen
              </button>
              <button
                type="button"
                disabled={bezig}
                onClick={() => negeren(open.map((r) => r.key), false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Alles negeren
              </button>
            </>
          )}
          {gelijk.length > 0 && (
            <button
              type="button"
              onClick={() => setToonGelijk((v) => !v)}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              {toonGelijk ? "Verberg" : "Toon"} {gelijk.length} velden die gelijk zijn
            </button>
          )}
        </div>
      </div>

      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {fout}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[46rem] text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Veld</th>
              <th scope="col" className="px-3 py-2 font-medium">Onze fiche</th>
              <th scope="col" className="px-3 py-2 font-medium">AnimalShelter</th>
              <th scope="col" className="px-3 py-2 font-medium">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {zichtbaar.map((row) => (
              <tr
                key={row.key}
                className={
                  row.state === "genegeerd"
                    ? "bg-gray-50 text-gray-500"
                    : row.state === "verschil"
                      ? "bg-amber-50/40"
                      : undefined
                }
              >
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                  {row.label}
                  {row.state === "genegeerd" && (
                    <span className="ml-1 block text-xs font-normal text-gray-500">
                      🔕 Genegeerd
                      {datumNl(row.decision?.decidedAt) && ` op ${datumNl(row.decision?.decidedAt)}`}
                      {row.decision?.decision === "negeer_altijd" && " (altijd)"}
                    </span>
                  )}
                </th>

                <td className="px-3 py-2 align-top">
                  <Waarde tekst={row.localText} multiline={row.multiline} />
                </td>

                <td className="px-3 py-2 align-top">
                  <Waarde tekst={row.remoteText} multiline={row.multiline} />
                  {row.state === "extern_leeg" && (
                    <span className="mt-0.5 block text-xs text-gray-500">
                      AnimalShelter heeft hier niets ingevuld — je fiche blijft zoals ze is.
                    </span>
                  )}
                  {row.state === "niet_overneembaar" && row.reason && (
                    <span className="mt-0.5 block text-xs text-gray-500">{row.reason}</span>
                  )}
                </td>

                <td className="px-3 py-2 align-top">
                  {row.state === "gelijk" && <span className="text-sm text-green-700">✓ gelijk</span>}

                  {row.state === "verschil" && (
                    <div className="flex flex-col items-start gap-1">
                      <button
                        type="button"
                        disabled={bezig}
                        aria-label={`Overnemen van AnimalShelter: ${row.label}`}
                        onClick={() => overnemen([row.key])}
                        className="rounded-lg bg-[#1b4332] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
                      >
                        ← Overnemen
                      </button>
                      <button
                        type="button"
                        disabled={bezig}
                        aria-label={`Verschil negeren: ${row.label}`}
                        onClick={() => negeren([row.key], false)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Negeren
                      </button>
                      <button
                        type="button"
                        disabled={bezig}
                        aria-label={`Altijd negeren: ${row.label}`}
                        onClick={() => negeren([row.key], true)}
                        className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
                      >
                        altijd negeren
                      </button>
                    </div>
                  )}

                  {row.state === "genegeerd" && (
                    <div className="flex flex-col items-start gap-1">
                      {row.takeable && (
                        <button
                          type="button"
                          disabled={bezig}
                          aria-label={`Toch overnemen: ${row.label}`}
                          onClick={() => overnemen([row.key])}
                          className="rounded-lg border border-[#1b4332] px-2.5 py-1 text-xs font-medium text-[#1b4332] hover:bg-[#1b4332]/5 disabled:opacity-50"
                        >
                          Toch overnemen
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={bezig}
                        aria-label={`Beslissing terugdraaien: ${row.label}`}
                        onClick={() => terugdraaien([row.key])}
                        className="text-xs text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
                      >
                        beslissing terugdraaien
                      </button>
                    </div>
                  )}

                  {row.state === "niet_overneembaar" && (
                    <button
                      type="button"
                      disabled={bezig}
                      aria-label={`Verschil negeren: ${row.label}`}
                      onClick={() => negeren([row.key], false)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Negeren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
