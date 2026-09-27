/**
 * Epic 13, story 13.15 — genummerde steunkaarten.
 *
 * Sven (12 sep 2026): elke verkoper krijgt een reeks nummers; een kaart kost "5 euro
 * (normaal altijd zelfde prijs)"; bij terugkomst telt "welke nummers er niet verkocht
 * zijn"; en de app mag trekken, "enkel uit nummers die verkocht werden".
 *
 * Verkocht weten we pas na het afrekenen: vóór die tijd is een uitgedeelde kaart gewoon
 * uitgedeeld. Pure logica, geen database.
 */

export const CARD_PRICE_DEFAULT = 5;
/** Een boekje telt er doorgaans 25 of 50; meer dan 1000 in één reeks is een tikfout. */
export const MAX_SERIES_SIZE = 1000;
export const MAX_CARD_NUMBER = 99_999;

export interface CardSeries {
  id: number;
  seller: string;
  numberFrom: number;
  numberTo: number;
  /** numeric uit de databank, als tekst ("5.00"). */
  price: string;
  /** De nummers die onverkocht terugkwamen; leeg zolang de reeks niet afgerekend is. */
  unsoldNumbers: number[];
  settledAt: Date | string | null;
}

export interface CardDraw {
  id: number;
  number: number;
  prize: string | null;
  drawnByApp: boolean;
}

export type ParsedNumbers = { ok: true; numbers: number[] } | { ok: false; error: string };

/** "12, 40-50" of "12 40–50; 7" → [7, 12, 40, …, 50]. Leeg mag: niets kwam terug. */
export function parseNumberList(input: string): ParsedNumbers {
  const nummers = new Set<number>();
  const stukken = (input ?? "").split(/[\s,;]+/).filter(Boolean);
  for (const stuk of stukken) {
    const reeks = stuk.match(/^(\d{1,6})[-–](\d{1,6})$/);
    if (reeks) {
      const [van, tot] = [Number(reeks[1]), Number(reeks[2])];
      if (tot < van) return { ok: false, error: `Reeks ${stuk} loopt achteruit` };
      if (tot - van + 1 > MAX_SERIES_SIZE) return { ok: false, error: `Reeks ${stuk} is te groot` };
      for (let n = van; n <= tot; n++) nummers.add(n);
      continue;
    }
    if (!/^\d{1,6}$/.test(stuk)) return { ok: false, error: `Geen nummer: "${stuk}"` };
    nummers.add(Number(stuk));
  }
  return { ok: true, numbers: [...nummers].sort((a, b) => a - b) };
}

/** [7, 12, 40, 41, 42] → "7, 12, 40–42". */
export function formatNumberList(numbers: readonly number[]): string {
  const gesorteerd = [...new Set(numbers)].sort((a, b) => a - b);
  const delen: string[] = [];
  for (let i = 0; i < gesorteerd.length; i++) {
    const begin = gesorteerd[i];
    while (i + 1 < gesorteerd.length && gesorteerd[i + 1] === gesorteerd[i] + 1) i++;
    delen.push(begin === gesorteerd[i] ? String(begin) : `${begin}–${gesorteerd[i]}`);
  }
  return delen.join(", ");
}

/** Klopt een nieuwe reeks van–tot? Null = in orde. */
export function seriesRangeIssue(from: number, to: number): string | null {
  if (from < 1) return "Nummers beginnen vanaf 1";
  if (to < from) return "Het tot-nummer moet groter zijn dan (of gelijk aan) het van-nummer";
  if (to > MAX_CARD_NUMBER) return `Nummers gaan tot ${MAX_CARD_NUMBER}`;
  if (to - from + 1 > MAX_SERIES_SIZE) return `Een reeks telt hooguit ${MAX_SERIES_SIZE} kaarten`;
  return null;
}

export function seriesSize(s: Pick<CardSeries, "numberFrom" | "numberTo">): number {
  return s.numberTo - s.numberFrom + 1;
}

function isSettled(s: Pick<CardSeries, "settledAt">): boolean {
  return s.settledAt !== null;
}

/** Aantal verkochte kaarten, of null zolang de reeks niet afgerekend is. */
export function soldCount(s: CardSeries): number | null {
  return isSettled(s) ? seriesSize(s) - s.unsoldNumbers.length : null;
}

function prijsInCenten(price: string): number {
  const getal = Number(price);
  return Number.isFinite(getal) ? Math.round(getal * 100) : 0;
}

/** Verkocht × prijs, in centen. Een open reeks brengt (nog) niets op. */
export function seriesAmountCents(s: CardSeries): number {
  return (soldCount(s) ?? 0) * prijsInCenten(s.price);
}

/** De eerste bestaande reeks die met nummers van–tot botst. */
export function findSeriesOverlap<T extends Pick<CardSeries, "numberFrom" | "numberTo">>(
  bestaande: readonly T[],
  from: number,
  to: number,
): T | null {
  return bestaande.find((s) => s.numberFrom <= to && from <= s.numberTo) ?? null;
}

/** Kloppen de onverkochte nummers? Enkel uit de reeks, en geen nummer dat al getrokken werd. */
export function unsoldIssues(s: CardSeries, unsold: readonly number[], draws: readonly CardDraw[]): string[] {
  const issues: string[] = [];
  const erbuiten = unsold.filter((n) => n < s.numberFrom || n > s.numberTo);
  if (erbuiten.length > 0) {
    issues.push(`${formatNumberList(erbuiten)} hoort niet bij deze reeks (${s.numberFrom}–${s.numberTo})`);
  }
  const getrokken = unsold.filter((n) => draws.some((d) => d.number === n));
  if (getrokken.length === 1) {
    issues.push(`Nummer ${getrokken[0]} werd al getrokken en kan dus niet onverkocht terugkomen`);
  } else if (getrokken.length > 1) {
    issues.push(`Nummers ${formatNumberList(getrokken)} werden al getrokken en kunnen dus niet onverkocht terugkomen`);
  }
  return issues;
}

export interface CardTotals {
  series: number;
  cards: number;
  settledSeries: number;
  sold: number;
  unsold: number;
  openSeries: number;
  openCards: number;
  amountCents: number;
}

export function cardTotals(series: readonly CardSeries[]): CardTotals {
  const totaal: CardTotals = {
    series: series.length,
    cards: 0,
    settledSeries: 0,
    sold: 0,
    unsold: 0,
    openSeries: 0,
    openCards: 0,
    amountCents: 0,
  };
  for (const s of series) {
    totaal.cards += seriesSize(s);
    if (isSettled(s)) {
      totaal.settledSeries++;
      totaal.sold += soldCount(s) ?? 0;
      totaal.unsold += s.unsoldNumbers.length;
      totaal.amountCents += seriesAmountCents(s);
    } else {
      totaal.openSeries++;
      totaal.openCards += seriesSize(s);
    }
  }
  return totaal;
}

/** Waaruit de app mag trekken: verkochte nummers van afgerekende reeksen, nog niet getrokken. */
export function drawableNumbers(series: readonly CardSeries[], draws: readonly CardDraw[]): number[] {
  const getrokken = new Set(draws.map((d) => d.number));
  const nummers: number[] = [];
  for (const s of series) {
    if (!isSettled(s)) continue;
    const onverkocht = new Set(s.unsoldNumbers);
    for (let n = s.numberFrom; n <= s.numberTo; n++) {
      if (!onverkocht.has(n) && !getrokken.has(n)) nummers.push(n);
    }
  }
  return nummers.sort((a, b) => a - b);
}

/** Eén nummer uit de lijst; `randomInt(max)` geeft 0 … max−1 (op de server: `crypto.randomInt`). */
export function pickNumber(numbers: readonly number[], randomInt: (max: number) => number): number | null {
  if (numbers.length === 0) return null;
  return numbers[randomInt(numbers.length)];
}

/**
 * Kan dit nummer winnen? Het moet in een reeks liggen, mag niet onverkocht teruggekomen
 * zijn en niet al getrokken. Bij een reeks die nog niet afgerekend is, weten we niet of
 * het verkocht werd — dan geven we het voordeel van de twijfel: het strookje lag in de trommel.
 */
export function drawIssue(series: readonly CardSeries[], draws: readonly CardDraw[], number: number): string | null {
  const reeks = series.find((s) => number >= s.numberFrom && number <= s.numberTo);
  if (!reeks) return `Nummer ${number} hoort bij geen enkele reeks`;
  if (reeks.unsoldNumbers.includes(number)) return `Nummer ${number} kwam onverkocht terug`;
  if (draws.some((d) => d.number === number)) return `Nummer ${number} werd al getrokken`;
  return null;
}
