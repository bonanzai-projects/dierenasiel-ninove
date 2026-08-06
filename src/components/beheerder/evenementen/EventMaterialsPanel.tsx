"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteEventMaterial,
  toggleEventMaterial,
  type EventMaterialRow,
} from "@/lib/actions/event-materials";
import {
  materialSummary,
  needsReturn,
  originLabel,
  sortMaterials,
} from "@/lib/events/materials";
import EventMaterialForm from "./EventMaterialForm";

interface Props {
  eventId: number;
  materials: EventMaterialRow[];
  canWrite: boolean;
}

/**
 * Story 13.11 — wat moeten we hebben, waar komt het vandaan, en wat moet er terug.
 * Dat laatste is de reden dat de herkomst meer is dan een etiket.
 */
export default function EventMaterialsPanel({ eventId, materials, canWrite }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [nieuw, setNieuw] = useState(false);
  const [bewerktId, setBewerktId] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const lijst = sortMaterials(materials);
  const totaal = materialSummary(materials);

  function omzetten(m: EventMaterialRow, veld: "arranged" | "returned", waarde: boolean) {
    setFout(null);
    startTransition(async () => {
      const res = await toggleEventMaterial(m.id, veld, waarde);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Bijwerken mislukt");
    });
  }

  function verwijderen(m: EventMaterialRow) {
    if (!window.confirm(`"${m.name}" van de materiaallijst halen?`)) return;
    setFout(null);
    startTransition(async () => {
      const res = await deleteEventMaterial(m.id);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Verwijderen mislukt");
    });
  }

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[#1b4332]">Materiaal</h2>
        {totaal.totaal > 0 && (
          <span aria-label="Materiaalstand" className="text-xs text-gray-600">
            {totaal.teRegelen > 0 ? `${totaal.teRegelen} nog te regelen` : "alles geregeld"}
            {totaal.terugTeBrengen > 0 && ` · ${totaal.terugTeBrengen} moet nog terug`}
          </span>
        )}
      </div>

      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}

      {lijst.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">
          Nog geen materiaal op de lijst — tenten, frigo&apos;s, tafels, geleend materiaal.
        </p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th scope="col" className="py-1 font-medium">Wat</th>
              <th scope="col" className="py-1 font-medium">Waar vandaan</th>
              <th scope="col" className="py-1 text-center font-medium">Geregeld</th>
              <th scope="col" className="py-1 text-center font-medium">Terug</th>
              {canWrite && <th scope="col" className="py-1" />}
            </tr>
          </thead>
          <tbody>
            {lijst.map((m) =>
              bewerktId === m.id ? (
                <tr key={m.id}>
                  <td colSpan={canWrite ? 5 : 4} className="py-2">
                    <EventMaterialForm
                      eventId={eventId}
                      material={m}
                      onDone={() => setBewerktId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={m.id} className="border-b border-gray-100 align-top">
                  <td className="py-1.5 pr-2">
                    <span className="text-gray-900">
                      {m.quantity ? `${m.quantity} × ` : ""}
                      {m.name}
                    </span>
                    {m.notes && <span className="block text-xs text-gray-500">{m.notes}</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-gray-700">
                    {originLabel(m.origin)}
                    {m.supplier && <span className="block text-xs text-gray-500">{m.supplier}</span>}
                  </td>
                  <td className="py-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Geregeld: ${m.name}`}
                      checked={m.arranged}
                      disabled={!canWrite}
                      onChange={() => omzetten(m, "arranged", !m.arranged)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f] disabled:opacity-50"
                    />
                  </td>
                  <td className="py-1.5 text-center">
                    {needsReturn(m.origin) ? (
                      <input
                        type="checkbox"
                        aria-label={`Terugbezorgd: ${m.name}`}
                        checked={m.returned}
                        disabled={!canWrite}
                        onChange={() => omzetten(m, "returned", !m.returned)}
                        className="h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f] disabled:opacity-50"
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setNieuw(false);
                          setBewerktId(m.id);
                        }}
                        className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => verwijderen(m)}
                        className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        Verwijderen
                      </button>
                    </td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      {canWrite &&
        (nieuw ? (
          <div className="mt-3">
            <EventMaterialForm eventId={eventId} onDone={() => setNieuw(false)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setBewerktId(null);
              setNieuw(true);
            }}
            className="mt-3 text-sm font-medium text-[#2d6a4f] hover:underline"
          >
            + Materiaal toevoegen
          </button>
        ))}
    </section>
  );
}
