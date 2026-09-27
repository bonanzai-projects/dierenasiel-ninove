"use client";

import { useActionState, useState } from "react";
import {
  addCardDraw,
  createCardSeries,
  deleteCardDraw,
  deleteCardSeries,
  drawCardByApp,
  reopenCardSeries,
  settleCardSeries,
} from "@/lib/actions/event-cards";
import { formatAmount } from "@/lib/events/costs";
import {
  CARD_PRICE_DEFAULT,
  cardTotals,
  formatNumberList,
  seriesAmountCents,
  seriesSize,
  soldCount,
} from "@/lib/events/support-cards";
import type { ActionResult } from "@/types";

export interface CardSeriesRow {
  id: number;
  eventId: number;
  seller: string;
  numberFrom: number;
  numberTo: number;
  price: string;
  unsoldNumbers: number[];
  settledAt: Date | string | null;
}

export interface CardDrawRow {
  id: number;
  eventId: number;
  number: number;
  prize: string | null;
  drawnByApp: boolean;
}

interface Props {
  eventId: number;
  series: CardSeriesRow[];
  draws: CardDrawRow[];
  /** Aanpassen zoals de kosten (`event:write`). */
  canWrite: boolean;
}

const VELD_BASIS =
  "rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
const VELD = `mt-0.5 block w-full ${VELD_BASIS}`;
const LABEL = "block text-xs font-medium text-gray-600";
const KNOP_KLEIN = "rounded px-2 py-0.5 text-xs";
const KNOP =
  "whitespace-nowrap rounded-md bg-[#1b4332] px-3 py-1 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50";

/** Een veldfout gaat voor "Validatie mislukt". */
function melding(state: ActionResult | null): string | null {
  if (!state || state.success) return null;
  const veldfout = state.fieldErrors ? Object.values(state.fieldErrors).flat()[0] : undefined;
  return veldfout ?? state.error ?? null;
}

/**
 * Epic 13, story 13.15 — genummerde steunkaarten. Sven (12 sep 2026): nummers per verkoper,
 * "5 euro (normaal altijd zelfde prijs)", bij terugkomst "welke nummers er niet verkocht
 * zijn", en de app mag trekken "enkel uit nummers die verkocht werden".
 */
export default function EventCardsPanel({ eventId, series, draws, canWrite }: Props) {
  const [laatste, setLaatste] = useState<ActionResult | null>(null);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [afrekenenBij, setAfrekenenBij] = useState<number | null>(null);

  /** Elke actie zet haar resultaat als melding; geslaagd = het formulier gaat dicht. */
  function metMelding(
    actie: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>,
    sluit?: () => void,
  ) {
    return async (prev: ActionResult | null, formData: FormData) => {
      const res = await actie(prev, formData);
      setLaatste(res);
      if (res.success) sluit?.();
      return res;
    };
  }

  const [createState, createAction, createPending] = useActionState(
    metMelding(createCardSeries, () => setNieuwOpen(false)),
    null,
  );
  const [settleState, settleAction, settlePending] = useActionState(
    metMelding(settleCardSeries, () => setAfrekenenBij(null)),
    null,
  );
  const [, reopenAction] = useActionState(metMelding(reopenCardSeries), null);
  const [, deleteAction] = useActionState(metMelding(deleteCardSeries), null);
  const [addState, addAction, addPending] = useActionState(metMelding(addCardDraw), null);
  const [, drawAction, drawPending] = useActionState(metMelding(drawCardByApp), null);
  const [, deleteDrawAction] = useActionState(metMelding(deleteCardDraw), null);

  // React 19 zet formulieren na een Server Action terug op hun beginwaarden, ook bij een
  // fout. De acties sturen de ingevulde waarden terug; als beginwaarden landen ze opnieuw.
  const terugReeks = createState && !createState.success ? createState.values : undefined;
  const terugAfrekenen = settleState && !settleState.success ? settleState.values : undefined;
  const terugTrekking = addState && !addState.success ? addState.values : undefined;

  const totaal = cardTotals(series);
  const volgendNummer = series.reduce((max, s) => Math.max(max, s.numberTo), 0) + 1;
  const fout = melding(laatste);
  const gelukt = laatste?.success ? laatste.message : null;

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm" aria-labelledby="steunkaarten">
      <h2 id="steunkaarten" className="font-heading text-base font-semibold text-[#1b4332]">
        Steunkaarten
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Geef elke verkoper een reeks nummers mee. Komen de kaarten terug, vul dan de onverkochte nummers in: de app
        telt wat verkocht is, en de opbrengst komt vanzelf bij kosten &amp; opbrengsten.
      </p>

      {fout && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}
      {gelukt && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{gelukt}</p>}

      {series.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Nog geen steunkaarten voor dit evenement.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-gray-700">
            {`${totaal.cards} kaarten uitgedeeld · ${totaal.sold} verkocht · ${totaal.unsold} onverkocht terug · ${formatAmount(totaal.amountCents / 100)}`}
          </p>
          {totaal.openSeries > 0 && (
            <p className="text-xs text-amber-700">
              {`${totaal.openSeries} ${totaal.openSeries === 1 ? "reeks" : "reeksen"} nog open (${totaal.openCards} kaarten)`}
            </p>
          )}

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Steunkaarten per verkoper</caption>
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th scope="col" className="py-1 font-medium">Verkoper</th>
                  <th scope="col" className="py-1 font-medium">Nummers</th>
                  <th scope="col" className="py-1 text-right font-medium">Prijs</th>
                  <th scope="col" className="py-1 text-right font-medium">Verkocht</th>
                  <th scope="col" className="py-1 pl-3 font-medium">Onverkocht terug</th>
                  <th scope="col" className="py-1 text-right font-medium">Bedrag</th>
                  {canWrite && <th scope="col" className="py-1" />}
                </tr>
              </thead>
              <tbody>
                {series.map((s) => {
                  const afgerekend = s.settledAt !== null;
                  const verkocht = soldCount(s);
                  return [
                    <tr key={s.id} className="border-b border-gray-100 align-top">
                      <td className="py-1.5 pr-2 font-medium text-gray-900">{s.seller}</td>
                      <td className="py-1.5 pr-2 tabular-nums text-gray-700">
                        {s.numberFrom}–{s.numberTo}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-700">{formatAmount(s.price)}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-700">
                        {afgerekend ? `${verkocht} / ${seriesSize(s)}` : <span className="text-xs text-amber-700">uitgedeeld</span>}
                      </td>
                      <td className="py-1.5 pl-3 text-xs tabular-nums text-gray-600">
                        {afgerekend ? formatNumberList(s.unsoldNumbers) || "geen" : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-900">
                        {afgerekend ? formatAmount(seriesAmountCents(s) / 100) : "—"}
                      </td>
                      {canWrite && (
                        <td className="whitespace-nowrap py-1.5 pl-2 text-right">
                          <button
                            type="button"
                            aria-label={`${afgerekend ? "Aanpassen" : "Afrekenen"}: ${s.seller}`}
                            onClick={() => setAfrekenenBij(afrekenenBij === s.id ? null : s.id)}
                            className={`${KNOP_KLEIN} text-emerald-700 hover:bg-emerald-50`}
                          >
                            {afgerekend ? "Aanpassen" : "Afrekenen"}
                          </button>
                          {afgerekend ? (
                            <form action={reopenAction} className="inline">
                              <input type="hidden" name="id" value={s.id} />
                              <button
                                type="submit"
                                aria-label={`Heropenen: ${s.seller}`}
                                onClick={(e) => {
                                  if (!window.confirm(`De reeks van ${s.seller} terug op "uitgedeeld" zetten?`)) e.preventDefault();
                                }}
                                className={`${KNOP_KLEIN} text-gray-600 hover:bg-gray-100`}
                              >
                                Heropenen
                              </button>
                            </form>
                          ) : (
                            <form action={deleteAction} className="inline">
                              <input type="hidden" name="id" value={s.id} />
                              <button
                                type="submit"
                                aria-label={`Verwijderen: ${s.seller}`}
                                onClick={(e) => {
                                  if (!window.confirm(`De reeks van ${s.seller} (${s.numberFrom}–${s.numberTo}) weghalen?`)) e.preventDefault();
                                }}
                                className={`${KNOP_KLEIN} text-red-600 hover:bg-red-50`}
                              >
                                Verwijderen
                              </button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>,
                    canWrite && afrekenenBij === s.id && (
                      <tr key={`${s.id}-afrekenen`}>
                        <td colSpan={7} className="pb-2">
                          <form
                            key={JSON.stringify(terugAfrekenen ?? {})}
                            action={settleAction}
                            className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-2"
                          >
                            <input type="hidden" name="id" value={s.id} />
                            <input
                              name="unsold"
                              defaultValue={terugAfrekenen?.unsold ?? formatNumberList(s.unsoldNumbers)}
                              placeholder="bv. 12, 40-50 — leeg = alles verkocht"
                              aria-label={`Onverkochte nummers (${s.seller})`}
                              className={`${VELD_BASIS} w-full max-w-sm`}
                            />
                            <button type="submit" disabled={settlePending} className={KNOP}>
                              Afrekenen
                            </button>
                            <button
                              type="button"
                              onClick={() => setAfrekenenBij(null)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-white"
                            >
                              Annuleren
                            </button>
                          </form>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canWrite &&
        (nieuwOpen ? (
          <form
            key={JSON.stringify(terugReeks ?? {})}
            action={createAction}
            className="mt-3 grid gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 sm:grid-cols-7"
          >
            <input type="hidden" name="eventId" value={eventId} />
            <label className={`${LABEL} sm:col-span-2`}>
              Verkoper
              <input name="seller" defaultValue={terugReeks?.seller ?? ""} placeholder="bv. Martine" className={VELD} />
            </label>
            <label className={LABEL}>
              Van nummer
              <input
                type="number"
                name="numberFrom"
                min={1}
                defaultValue={terugReeks?.numberFrom ?? volgendNummer}
                className={VELD}
              />
            </label>
            <label className={LABEL}>
              Tot nummer
              <input type="number" name="numberTo" min={1} defaultValue={terugReeks?.numberTo ?? ""} className={VELD} />
            </label>
            <label className={LABEL}>
              Prijs per kaart
              <input
                name="price"
                inputMode="decimal"
                defaultValue={terugReeks?.price ?? String(CARD_PRICE_DEFAULT)}
                className={VELD}
              />
            </label>
            <div className="flex items-end gap-1.5 sm:col-span-2">
              <button type="submit" disabled={createPending} className={KNOP}>
                Reeks bewaren
              </button>
              <button
                type="button"
                onClick={() => setNieuwOpen(false)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-white"
              >
                Annuleren
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setLaatste(null);
              setNieuwOpen(true);
            }}
            className="mt-3 text-sm font-medium text-[#2d6a4f] hover:underline"
          >
            + Reeks meegeven
          </button>
        ))}

      {/* De trekking — Sven: zelf trekken, of de app laten kiezen uit de verkochte nummers. */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <h3 className="text-sm font-semibold text-gray-800">Trekking</h3>
        {draws.length === 0 ? (
          <p className="mt-1 text-sm text-gray-400">Nog geen winnende nummers.</p>
        ) : (
          <ul aria-label="Winnende nummers" className="mt-1 space-y-1">
            {draws.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-semibold tabular-nums text-gray-900">Nr {d.number}</span>
                  {d.prize && <span className="text-gray-700"> — {d.prize}</span>}
                  {d.drawnByApp && <span className="ml-1.5 text-xs text-gray-400">door de app getrokken</span>}
                </span>
                {canWrite && (
                  <form action={deleteDrawAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      aria-label={`Winnend nummer ${d.number} weghalen`}
                      onClick={(e) => {
                        if (!window.confirm(`Nummer ${d.number} weghalen bij de winnaars?`)) e.preventDefault();
                      }}
                      className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {canWrite && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <form
              key={JSON.stringify(terugTrekking ?? {})}
              action={addAction}
              className="flex flex-wrap items-center gap-1.5"
            >
              <input type="hidden" name="eventId" value={eventId} />
              <input
                name="number"
                inputMode="numeric"
                defaultValue={terugTrekking?.number ?? ""}
                placeholder="Nummer"
                aria-label="Winnend nummer"
                className={`${VELD_BASIS} w-24`}
              />
              <input
                name="prize"
                defaultValue={terugTrekking?.prize ?? ""}
                placeholder="Prijs (optioneel)"
                aria-label="Prijs bij het winnende nummer"
                className={`${VELD_BASIS} min-w-0 flex-1`}
              />
              <button type="submit" disabled={addPending} className={KNOP}>
                Invullen
              </button>
            </form>
            <form action={drawAction} className="flex flex-wrap items-center gap-1.5">
              <input type="hidden" name="eventId" value={eventId} />
              <input
                name="prize"
                placeholder="Prijs (optioneel)"
                aria-label="Prijs voor de trekking door de app"
                className={`${VELD_BASIS} min-w-0 flex-1`}
              />
              <button type="submit" disabled={drawPending} className={KNOP}>
                Laat de app trekken
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
