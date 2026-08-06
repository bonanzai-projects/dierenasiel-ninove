/**
 * Epic 13, story 13.12 — het jaaroverzicht.
 *
 * Sven organiseert er zo'n **veertien per jaar** (vraag 2, 2026-08-06): eetfestijn 1,
 * opendeurdag 1, kerstmarkt 3, jaarmarkt 3, wafel-/koekjesverkoop 1,
 * paaseierenverkoop 1, standje op markt of beurs 2, benefiet 2. Eén lange lijst zegt
 * dan niets meer; per jaar met het netto-resultaat ernaast wél.
 *
 * Pure logica, geen database.
 */
import { summarizeCosts, type CostAmounts } from "./costs";

export interface YearOverviewEvent {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string;
  endDate: string | null;
}

export interface YearOverviewInput {
  events: readonly YearOverviewEvent[];
  costs: readonly (CostAmounts & { eventId: number })[];
  evaluations: readonly { eventId: number; visitors: number | null; paidPlates: number | null }[];
}

export interface YearOverviewRow {
  id: number;
  naam: string;
  type: string;
  status: string;
  date: string;
  endDate: string | null;
  kosten: number;
  opbrengsten: number;
  netto: number;
  bezoekers: number | null;
  betalendeBorden: number | null;
}

export interface YearOverview {
  jaar: number;
  rijen: YearOverviewRow[];
  totalen: {
    kosten: number;
    opbrengsten: number;
    netto: number;
    bezoekers: number;
    aantal: number;
  };
}

export function eventYear(event: { date: string }): number {
  return Number(event.date.slice(0, 4));
}

/** De jaren waarin er iets georganiseerd werd, recentste eerst. */
export function availableYears(events: readonly { date: string }[]): number[] {
  return [...new Set(events.map(eventYear))].sort((a, b) => b - a);
}

/** Optellen in centen, net als in `summarizeCosts`. */
function som(getallen: number[]): number {
  return Math.round(getallen.reduce((t, g) => t + Math.round(g * 100), 0)) / 100;
}

/**
 * Een geannuleerd evenement blijft in de lijst staan — mét zijn kosten. Een afgelaste
 * benefiet waarvan het voorschot weg is, is nog altijd geld dat het jaar gekost heeft;
 * dat wegmoffelen zou het overzicht mooier maken dan het is.
 */
export function buildYearOverview(input: YearOverviewInput, jaar: number): YearOverview {
  const rijen: YearOverviewRow[] = input.events
    .filter((e) => eventYear(e) === jaar)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .map((e) => {
      const totalen = summarizeCosts(input.costs.filter((c) => c.eventId === e.id));
      const evaluatie = input.evaluations.find((ev) => ev.eventId === e.id);
      return {
        id: e.id,
        naam: e.name,
        type: e.type,
        status: e.status,
        date: e.date,
        endDate: e.endDate,
        kosten: totalen.kosten.werkelijk,
        opbrengsten: totalen.opbrengsten.werkelijk,
        netto: totalen.netto.werkelijk,
        bezoekers: evaluatie?.visitors ?? null,
        betalendeBorden: evaluatie?.paidPlates ?? null,
      };
    });

  return {
    jaar,
    rijen,
    totalen: {
      kosten: som(rijen.map((r) => r.kosten)),
      opbrengsten: som(rijen.map((r) => r.opbrengsten)),
      netto: som(rijen.map((r) => r.netto)),
      bezoekers: rijen.reduce((t, r) => t + (r.bezoekers ?? 0), 0),
      aantal: rijen.length,
    },
  };
}
