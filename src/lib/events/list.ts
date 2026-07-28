/**
 * Pure hulpfuncties voor het evenementenoverzicht (Epic 13). Geen database,
 * geen React — zodat de sortering en de datumweergave los te testen zijn.
 */
import { isPastEvent } from "./types";

interface Periode {
  date: string;
  endDate?: string | null;
}

/**
 * Splitst de evenementen in komend en afgelopen ten opzichte van `vandaag`
 * (YYYY-MM-DD). Komend loopt chronologisch (de eerstvolgende bovenaan),
 * afgelopen omgekeerd (de recentste bovenaan) — in beide gevallen staat
 * bovenaan wat het dichtst bij vandaag ligt.
 */
export function splitEvents<T extends Periode>(
  events: readonly T[],
  vandaag: string,
): { komend: T[]; afgelopen: T[] } {
  const komend: T[] = [];
  const afgelopen: T[] = [];

  for (const event of events) {
    (isPastEvent(event, vandaag) ? afgelopen : komend).push(event);
  }

  komend.sort((a, b) => a.date.localeCompare(b.date));
  afgelopen.sort((a, b) => b.date.localeCompare(a.date));

  return { komend, afgelopen };
}

/** YYYY-MM-DD → DD/MM/JJJJ. */
function dagWeergave(iso: string): string {
  const [jaar, maand, dag] = iso.split("-");
  return `${dag}/${maand}/${jaar}`;
}

/**
 * Leest de periode van een evenement als één zin: "12/09/2026 van 18:00 tot
 * 23:30" of "12/09/2026 t.e.m. 14/09/2026". Uren worden bij een meerdaagse
 * periode weggelaten — "van 18:00 tot 02:00" over drie dagen leest verkeerd.
 */
export function formatEventPeriod(event: {
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): string {
  const start = dagWeergave(event.date);

  if (event.endDate && event.endDate !== event.date) {
    return `${start} t.e.m. ${dagWeergave(event.endDate)}`;
  }
  if (event.startTime && event.endTime) {
    return `${start} van ${event.startTime} tot ${event.endTime}`;
  }
  if (event.startTime) {
    return `${start} om ${event.startTime}`;
  }
  return start;
}
