"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEventCost, type EventCostRow } from "@/lib/actions/event-costs";
import {
  categoryLabel,
  formatAmount,
  lineDelta,
  splitCostLines,
  summarizeCosts,
  type CostKind,
} from "@/lib/events/costs";
import EventCostForm from "./EventCostForm";

interface Props {
  eventId: number;
  lines: EventCostRow[];
  canWrite: boolean;
}

/** "+ € 160,00" of "− € 50,00". Groen wanneer het goed nieuws is. */
function Verschil({ line }: { line: EventCostRow }) {
  const { value, gunstig } = lineDelta(line as never);
  if (value === null) return <span className="text-gray-300">—</span>;
  if (value === 0) return <span className="text-gray-500">op de begroting</span>;

  const teken = value > 0 ? "+" : "−";
  return (
    <span className={gunstig ? "text-emerald-700" : "text-red-700"}>
      {teken} {formatAmount(Math.abs(value))}
    </span>
  );
}

export default function EventCostsPanel({ eventId, lines, canWrite }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [nieuweLijnKant, setNieuweLijnKant] = useState<CostKind | null>(null);
  const [bewerktId, setBewerktId] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const { kosten, opbrengsten } = splitCostLines(lines as never[]);
  const totalen = summarizeCosts(lines as never[]);

  function onDelete(line: EventCostRow) {
    if (!window.confirm(`Lijn "${line.description}" verwijderen?`)) return;
    setFout(null);
    startTransition(async () => {
      const res = await deleteEventCost(line.id);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Verwijderen mislukt");
    });
  }

  function Blok({
    kind,
    titel,
    lijnen,
    totaal,
    knop,
  }: {
    kind: CostKind;
    titel: string;
    lijnen: EventCostRow[];
    totaal: { begroot: number; werkelijk: number };
    knop: string;
  }) {
    return (
      <section aria-label={titel}>
        <h3 className="text-sm font-semibold text-gray-800">{titel}</h3>

        <table className="mt-1 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th scope="col" className="py-1 font-medium">Omschrijving</th>
              <th scope="col" className="py-1 text-right font-medium">Begroot</th>
              <th scope="col" className="py-1 text-right font-medium">Werkelijk</th>
              <th scope="col" className="py-1 text-right font-medium">Verschil</th>
              {canWrite && <th scope="col" className="py-1" />}
            </tr>
          </thead>
          <tbody>
            {lijnen.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 5 : 4} className="py-2 text-sm text-gray-400">
                  Nog geen {kind === "kost" ? "kosten" : "opbrengsten"} ingevuld.
                </td>
              </tr>
            )}

            {lijnen.map((line) =>
              bewerktId === line.id ? (
                <tr key={line.id}>
                  <td colSpan={canWrite ? 5 : 4} className="py-2">
                    <EventCostForm
                      eventId={eventId}
                      kind={line.kind as CostKind}
                      line={line}
                      onDone={() => setBewerktId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={line.id} className="border-b border-gray-100 align-top">
                  <td className="py-1.5 pr-2">
                    <span className="text-gray-900">{line.description}</span>
                    <span className="block text-xs text-gray-500">
                      {[
                        categoryLabel(line.kind as CostKind, line.category),
                        line.supplier,
                        line.paid ? (line.kind === "kost" ? "betaald" : "ontvangen") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-700">
                    {formatAmount(line.budgetAmount) || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-900">
                    {formatAmount(line.actualAmount) || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-1.5 text-right text-xs tabular-nums">
                    <Verschil line={line} />
                  </td>
                  {canWrite && (
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setNieuweLijnKant(null);
                          setBewerktId(line.id);
                        }}
                        className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(line)}
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

          {lijnen.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-300 font-medium">
                <td className="py-1.5">Totaal</td>
                <td className="py-1.5 text-right tabular-nums">{formatAmount(totaal.begroot)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatAmount(totaal.werkelijk)}</td>
                <td />
                {canWrite && <td />}
              </tr>
            </tfoot>
          )}
        </table>

        {canWrite &&
          (nieuweLijnKant === kind ? (
            <div className="mt-2">
              <EventCostForm
                eventId={eventId}
                kind={kind}
                onDone={() => setNieuweLijnKant(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBewerktId(null);
                setNieuweLijnKant(kind);
              }}
              className="mt-2 text-sm font-medium text-[#2d6a4f] hover:underline"
            >
              {knop}
            </button>
          ))}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[#1b4332]">
          Kosten &amp; opbrengsten
        </h2>

        {/* Het cijfer waar het om draait: wat hield het over? */}
        <div
          role="group"
          aria-label="Netto-resultaat"
          className="flex items-center gap-4 rounded-lg bg-gray-50 px-3 py-1.5"
        >
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-gray-500">
              Netto begroot
            </span>
            <span className="text-sm tabular-nums text-gray-700">
              {formatAmount(totalen.netto.begroot)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-gray-500">
              Netto werkelijk
            </span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                totalen.netto.werkelijk < 0 ? "text-red-700" : "text-[#1b4332]"
              }`}
            >
              {formatAmount(totalen.netto.werkelijk)}
            </span>
          </div>
        </div>
      </div>

      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}

      <div className="mt-3 space-y-5">
        <Blok
          kind="kost"
          titel="Kosten"
          lijnen={kosten as EventCostRow[]}
          totaal={totalen.kosten}
          knop="+ Kostenlijn toevoegen"
        />
        <Blok
          kind="opbrengst"
          titel="Opbrengsten"
          lijnen={opbrengsten as EventCostRow[]}
          totaal={totalen.opbrengsten}
          knop="+ Opbrengst toevoegen"
        />
      </div>
    </section>
  );
}
