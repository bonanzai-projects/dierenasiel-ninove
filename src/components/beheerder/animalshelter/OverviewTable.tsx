"use client";

import { useState } from "react";
import Link from "next/link";
import type { OverviewBucket, OverviewModel } from "@/lib/animalshelter/overview";

/**
 * Story 11.4 — het overzicht in emmers.
 *
 * De volgorde van de tabbladen is de volgorde van de vragen die het scherm stelt:
 * eerst wat een beslissing vraagt, dan wat een keuze vraagt, dan wat er nog niet
 * is, en pas achteraan wat al in orde of bewust afgehandeld is.
 */

type Tab = OverviewBucket | "enkel_lokaal";

const TABS: { key: Tab; label: string }[] = [
  { key: "verschillen", label: "Verschillen" },
  { key: "ambigu", label: "Keuze nodig" },
  { key: "enkel_extern", label: "Enkel bij AnimalShelter" },
  { key: "enkel_lokaal", label: "Enkel bij ons" },
  { key: "gelijk", label: "Gelijk" },
  { key: "genegeerd", label: "Genegeerd" },
];

const CATEGORIE_LABEL: Record<string, string> = {
  dogs: "Hond",
  cats: "Kat",
  other: "Ander dier",
};

export default function OverviewTable({ model }: { model: OverviewModel }) {
  const [tab, setTab] = useState<Tab>("verschillen");

  const aantal = (key: Tab) =>
    key === "enkel_lokaal" ? model.tellers.enkelLokaal : model.tellers[key];

  const rijen = model.entries.filter((e) => e.bucket === tab);
  const leeg = tab === "enkel_lokaal" ? model.enkelLokaal.length === 0 : rijen.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === key
                ? "bg-[#1b4332] text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {label} ({aantal(key)})
          </button>
        ))}
      </div>

      {leeg && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          Hier is niets te tonen.
        </p>
      )}

      {!leeg && tab === "enkel_lokaal" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Dier</th>
                <th scope="col" className="px-3 py-2 font-medium">Soort</th>
                <th scope="col" className="px-3 py-2 font-medium">Toestand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {model.enkelLokaal.map((dier) => (
                <tr key={dier.id}>
                  <td className="px-3 py-2 text-sm">
                    <Link href={`/beheerder/dieren/${dier.id}`} className="font-medium text-[#1b4332] hover:underline">
                      {dier.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{dier.species ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    Staat niet bij AnimalShelter
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!leeg && tab !== "enkel_lokaal" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Bij AnimalShelter</th>
                <th scope="col" className="px-3 py-2 font-medium">Onze fiche</th>
                <th scope="col" className="px-3 py-2 font-medium">Toestand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rijen.map((entry) => (
                <tr key={entry.externalId}>
                  <td className="px-3 py-2">
                    <Link
                      href={`/beheerder/animalshelter/${entry.externalId}`}
                      className="text-sm font-medium text-[#1b4332] hover:underline"
                    >
                      {entry.externalName}
                    </Link>
                    <span className="block text-xs text-gray-500">
                      {CATEGORIE_LABEL[entry.category] ?? entry.category}
                      {entry.externalNumber ? ` · nr ${entry.externalNumber}` : ""}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-sm">
                    {entry.localName ? (
                      <>
                        <span className="text-gray-900">{entry.localName}</span>
                        {entry.matchMethod && (
                          <span className="block text-xs text-gray-500">
                            gekoppeld op {entry.matchMethod === "nummer" ? "dossiernummer" : entry.matchMethod}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2 text-sm">
                    {entry.bucket === "verschillen" && (
                      <span className="font-medium text-amber-700">
                        {entry.open} {entry.open === 1 ? "verschil" : "verschillen"}
                      </span>
                    )}
                    {entry.bucket === "gelijk" && <span className="text-green-700">✓ gelijk</span>}
                    {entry.bucket === "enkel_extern" && (
                      <span className="text-gray-600">Nog niet in onze tool</span>
                    )}
                    {entry.bucket === "ambigu" && (
                      <span className="text-red-700">
                        {entry.kandidaten?.length ?? 0} dieren met dezelfde sleutel — kies zelf
                      </span>
                    )}
                    {entry.bucket === "genegeerd" && (
                      <span className="text-gray-500">🔕 Bewust genegeerd</span>
                    )}
                    {entry.genegeerd > 0 && (
                      <span className="block text-xs text-gray-500">
                        {entry.genegeerd} genegeerd
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
