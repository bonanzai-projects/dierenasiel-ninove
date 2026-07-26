"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importAnimalShelterAnimals } from "@/lib/actions/animalshelter";
import { SPECIES_LABELS, genderOptionsForSpecies } from "@/lib/constants";
import type { ImportCandidate } from "@/lib/animalshelter/import";

/**
 * Story 11.8 — de voorbeeldweergave vóór het aanmaken.
 *
 * Niets gebeurt automatisch: de beheerder ziet per dier wat er zou aangemaakt
 * worden, vinkt aan wat mee mag, en beantwoordt de vragen die wij niet mogen
 * gokken (soort bij "other", geslacht bij "O"). Geblokkeerde rijen zijn niet
 * aan te vinken en tonen waaróm.
 */

interface Props {
  kandidaten: ImportCandidate[];
}

type Keuzes = Record<number, { species?: string; gender?: string }>;

const SOORT_KEUZES = Object.entries(SPECIES_LABELS);

function datumNl(waarde: string | null): string {
  if (!waarde) return "—";
  const [jaar, maand, dag] = waarde.split("-");
  return `${dag}/${maand}/${jaar}`;
}

export default function ImportTable({ kandidaten }: Props) {
  const router = useRouter();
  const [bezig, startTransition] = useTransition();
  const [gekozen, setGekozen] = useState<Set<number>>(new Set());
  const [keuzes, setKeuzes] = useState<Keuzes>({});
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<{
    aangemaakt: { name: string }[];
    overgeslagen: { naam: string; reden: string }[];
  } | null>(null);

  const beschikbaar = useMemo(
    () => kandidaten.filter((k) => k.blockers.length === 0),
    [kandidaten],
  );

  /** Alles wat aangevinkt is én waarvan de vragen beantwoord zijn. */
  const klaar = useMemo(
    () =>
      beschikbaar.filter((k) => {
        if (!gekozen.has(k.externalId)) return false;
        const keuze = keuzes[k.externalId] ?? {};
        if (k.vragen.includes("species") && !keuze.species) return false;
        if (k.vragen.includes("gender") && !keuze.gender) return false;
        return true;
      }),
    [beschikbaar, gekozen, keuzes],
  );

  const onvolledig = gekozen.size - klaar.length;

  function wissel(externalId: number) {
    setGekozen((vorig) => {
      const volgend = new Set(vorig);
      if (volgend.has(externalId)) volgend.delete(externalId);
      else volgend.add(externalId);
      return volgend;
    });
  }

  function selecteerAlles() {
    const zonderVragen = beschikbaar.filter((k) => k.vragen.length === 0);
    setGekozen(new Set(zonderVragen.map((k) => k.externalId)));
  }

  function importeer() {
    setFout(null);
    setResultaat(null);
    startTransition(async () => {
      const result = await importAnimalShelterAnimals(
        klaar.map((k) => ({ externalId: k.externalId, ...keuzes[k.externalId] })),
      );
      if (!result.success) {
        setFout(result.error ?? "Er ging iets mis.");
        return;
      }
      setResultaat(result.data);
      setGekozen(new Set());
      router.refresh();
    });
  }

  if (kandidaten.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
        Er staan geen dieren bij AnimalShelter die nog niet in onze tool zitten.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {resultaat && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-900">
            {resultaat.aangemaakt.length}{" "}
            {resultaat.aangemaakt.length === 1 ? "dier aangemaakt" : "dieren aangemaakt"}:{" "}
            {resultaat.aangemaakt.map((a) => a.name).join(", ")}
          </p>
          {resultaat.overgeslagen.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-green-900/80">
              {resultaat.overgeslagen.map((o) => (
                <li key={o.naam + o.reden}>
                  {o.naam} overgeslagen — {o.reden}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {fout}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {beschikbaar.length} van {kandidaten.length} dieren kunnen aangemaakt worden.
          {onvolledig > 0 && (
            <span className="ml-1 text-amber-700">
              {onvolledig} aangevinkt {onvolledig === 1 ? "dier wacht" : "dieren wachten"} nog op een
              antwoord.
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={selecteerAlles}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Selecteer alles zonder vragen
          </button>
          <button
            type="button"
            disabled={bezig || klaar.length === 0}
            onClick={importeer}
            className="rounded-lg bg-[#1b4332] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
          >
            {bezig
              ? "Bezig met aanmaken…"
              : `Maak ${klaar.length} ${klaar.length === 1 ? "dier" : "dieren"} aan`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[52rem] text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Aanmaken</th>
              <th scope="col" className="px-3 py-2 font-medium">Naam</th>
              <th scope="col" className="px-3 py-2 font-medium">Soort</th>
              <th scope="col" className="px-3 py-2 font-medium">Geslacht</th>
              <th scope="col" className="px-3 py-2 font-medium">Chip</th>
              <th scope="col" className="px-3 py-2 font-medium">Intake</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {kandidaten.map((k) => {
              const geblokkeerd = k.blockers.length > 0;
              const keuze = keuzes[k.externalId] ?? {};
              const soort = k.species ?? keuze.species ?? "";

              return (
                <tr key={k.externalId} className={geblokkeerd ? "bg-gray-50 text-gray-400" : undefined}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`${k.name} aanmaken`}
                      disabled={geblokkeerd || bezig}
                      checked={gekozen.has(k.externalId)}
                      onChange={() => wissel(k.externalId)}
                      className="h-4 w-4 accent-[#1b4332]"
                    />
                  </td>

                  <th scope="row" className="px-3 py-2 text-sm font-medium text-gray-900">
                    {k.name}
                    <span className="block text-xs font-normal text-gray-500">{k.breed ?? "—"}</span>
                    {geblokkeerd && (
                      <span className="block text-xs font-normal text-gray-500">{k.blockers[0]}</span>
                    )}
                  </th>

                  <td className="px-3 py-2 text-sm">
                    {k.species ? (
                      SPECIES_LABELS[k.species] ?? k.species
                    ) : (
                      <>
                        <label htmlFor={`soort-${k.externalId}`} className="sr-only">
                          Soort van {k.name}
                        </label>
                        <select
                          id={`soort-${k.externalId}`}
                          value={keuze.species ?? ""}
                          disabled={geblokkeerd}
                          onChange={(e) =>
                            setKeuzes((v) => ({
                              ...v,
                              [k.externalId]: { ...v[k.externalId], species: e.target.value, gender: undefined },
                            }))
                          }
                          className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-sm"
                        >
                          <option value="">Kies een soort…</option>
                          {SOORT_KEUZES.map(([waarde, label]) => (
                            <option key={waarde} value={waarde}>{label}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </td>

                  <td className="px-3 py-2 text-sm">
                    {k.gender ? (
                      k.gender
                    ) : (
                      <>
                        <label htmlFor={`geslacht-${k.externalId}`} className="sr-only">
                          Geslacht van {k.name}
                        </label>
                        <select
                          id={`geslacht-${k.externalId}`}
                          value={keuze.gender ?? ""}
                          disabled={geblokkeerd || !soort}
                          onChange={(e) =>
                            setKeuzes((v) => ({
                              ...v,
                              [k.externalId]: { ...v[k.externalId], gender: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-sm disabled:bg-gray-100"
                        >
                          <option value="">{soort ? "Kies…" : "Kies eerst de soort"}</option>
                          {genderOptionsForSpecies(soort).map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </td>

                  <td className="px-3 py-2 text-sm text-gray-600">{k.chip ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{datumNl(k.intakeDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
