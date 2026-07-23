import Link from "next/link";
import { getAnimalReport } from "@/lib/queries/reports";
import { getBehaviorReportByAnimalId } from "@/lib/queries/reports";
import { getAnimalById } from "@/lib/queries/animals";
import { getShelterCaregivers } from "@/lib/queries/shelter-settings";
import { BEHAVIOR_VERZORGERS_ITEMS, BEHAVIOR_HONDEN_ITEMS } from "@/lib/constants";
import { formatDateBE } from "@/lib/reports/animal-report-format";
import {
  sortBehaviorRecordsAsc,
  behaviorAnswer,
  buildBehaviorColumns,
} from "@/lib/reports/behavior-report-format";
import AnimalSelect from "@/components/beheerder/rapporten/AnimalSelect";
import type { BehaviorRecord } from "@/types";

// Story 10.27: gealigneerd op de officiële Bijlage VIII B (KB 27/04/2007) — matrix
// met criteria als rijen en elke evaluatiedatum als kolom (minimum 5 kolommen).
const MIN_COLUMNS = 5;

type Column = BehaviorRecord | null;

function MatrixSection({
  title,
  items,
  andereKey,
  columns,
}: {
  title: string;
  items: readonly { key: string; label: string }[];
  andereKey: string;
  columns: Column[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold italic text-[#1b4332]">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold w-1/4">Datum :</th>
              {columns.map((col, i) => (
                <th key={i} className="border border-gray-300 px-2 py-1.5 text-center font-bold">
                  {col ? formatDateBE(col.date) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td className="border border-gray-300 px-2 py-1.5 text-gray-700">{item.label}</td>
                {columns.map((col, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1.5 text-center">
                    {col ? behaviorAnswer(col.checklist as Record<string, unknown>, item.key) : ""}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="border border-gray-300 px-2 py-1.5 text-gray-700">Andere :</td>
              {columns.map((col, i) => {
                const val = col ? (col.checklist as Record<string, unknown>)[andereKey] : null;
                return (
                  <td key={i} className="border border-gray-300 px-2 py-1.5 text-center">
                    {typeof val === "string" ? val : ""}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GedragsfichesRapportPage({ searchParams }: Props) {
  const params = await searchParams;
  const animalIdStr = typeof params.dier === "string" ? params.dier : undefined;
  const animalId = animalIdStr ? parseInt(animalIdStr, 10) : undefined;

  const { animals: dogs } = await getAnimalReport({ species: "hond" });

  const [selectedAnimal, records, caregivers] = await Promise.all([
    animalId ? getAnimalById(animalId) : Promise.resolve(null),
    animalId ? getBehaviorReportByAnimalId(animalId) : Promise.resolve([] as BehaviorRecord[]),
    getShelterCaregivers(),
  ]);

  const columns = selectedAnimal ? buildBehaviorColumns(records, MIN_COLUMNS) : [];
  const recordsWithNotes = selectedAnimal ? sortBehaviorRecordsAsc(records).filter((r) => r.notes) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/beheerder/rapporten"
            className="text-sm text-emerald-700 hover:text-emerald-800"
          >
            &larr; Terug naar rapporten
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            R4 — Gedragsfiches per hond
          </h1>
        </div>
        {animalId && selectedAnimal && (
          <a
            href={`/api/rapporten/gedragsfiches/${animalId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF Export
          </a>
        )}
      </div>

      <AnimalSelect
        animals={dogs.map((d) => ({ id: d.id, name: d.name, breed: d.breed }))}
        selectedId={animalIdStr}
      />

      {selectedAnimal && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          {/* Kop — Bijlage VIII B */}
          <div className="text-center">
            <p className="text-xs text-gray-500">Bijlage VIII B bij het koninklijk besluit van 27 april 2007</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">Dierenasiel : Dierenasiel Ninove</p>
            <p className="font-semibold text-gray-900">
              Dossiernummer : <span className="font-normal">{selectedAnimal.dossierNr ?? ""}</span>
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">Evaluatiefiche van het gedrag in het asiel.</h2>
            <p className="text-xs italic text-gray-500">
              Deze pagina bevat gegevens die zullen meegedeeld worden aan kandidaat-adoptanten
            </p>
          </div>

          {/* Identificatieblok */}
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Identificatieteken : </span>
              {selectedAnimal.identificationNr ?? ""}
            </p>
            <p>
              <span className="font-semibold">Naam van het dier (facultatief) : </span>
              {selectedAnimal.name}
            </p>
            <p>
              <span className="font-semibold">Datum van opname : </span>
              {formatDateBE(selectedAnimal.intakeDate)}
            </p>
            <p>
              <span className="font-semibold">
                Na(a)m(en) van de perso(o)n(en) (verzorgers) die het dier verzorgen in het asiel :{" "}
              </span>
              {caregivers.length > 0 ? (
                caregivers.join(", ")
              ) : (
                <span className="italic text-gray-400">
                  geen verzorgers ingesteld — beheer dit via Instellingen
                </span>
              )}
            </p>
          </div>

          {records.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
              Nog geen gedragsfiches geregistreerd. Het lege formulier wordt hieronder getoond.
            </div>
          )}

          <div className="space-y-5 pt-2">
            <MatrixSection
              title="1. Gedrag tegenover de verzorgers"
              items={BEHAVIOR_VERZORGERS_ITEMS}
              andereKey="verzorgers_andere"
              columns={columns}
            />
            <MatrixSection
              title="2. Gedrag tegenover andere honden"
              items={BEHAVIOR_HONDEN_ITEMS}
              andereKey="honden_andere"
              columns={columns}
            />
          </div>

          {recordsWithNotes.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Opmerkingen</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {recordsWithNotes.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{formatDateBE(r.date)}:</span> {r.notes}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!animalId && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Selecteer een hond om de gedragsfiches te bekijken.
        </div>
      )}
    </div>
  );
}
