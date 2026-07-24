import type { CalendarCategoryKey } from "./categories";

/** Eén genormaliseerd kalender-event, ongeacht de bron. */
export interface CalendarEvent {
  /** Uniek over alle bronnen, bv. "kennismaking-12" of "ibn-animal-5". */
  id: string;
  category: CalendarCategoryKey;
  /** Datum in YYYY-MM-DD (lokale asieldatum). */
  date: string;
  /** Optioneel tijdstip HH:MM. */
  time?: string | null;
  title: string;
  /** Link naar de bron (dier/afspraak). */
  href?: string;
  /** Optionele status van de bron (bv. "scheduled", "gepland"). */
  status?: string | null;
}

/** Eén cel in het maandrooster. */
export interface CalendarDayCell {
  /** YYYY-MM-DD. */
  date: string;
  /** Dag van de maand (1-31). */
  day: number;
  /** Hoort de dag bij de getoonde maand (of is het een uitloper). */
  inCurrentMonth: boolean;
  isToday: boolean;
}

export const WEEKDAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

/** Bouwt een datumstring YYYY-MM-DD (month is 1-12). */
export function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAY_MS = 86_400_000;

/**
 * Bouwt een maandrooster van 6 weken (42 cellen), maandag als eerste dag.
 * Rekent volledig in UTC (geen DST-valkuilen); enkel jaar/maand/dag worden
 * geëxtraheerd, dus de cellen zijn kalenderdagen, geen tijdstippen.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  todayStr?: string,
): CalendarDayCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const weekdayMon0 = (first.getUTCDay() + 6) % 7; // ma=0 … zo=6
  const startMs = first.getTime() - weekdayMon0 * DAY_MS;

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startMs + i * DAY_MS);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const dateStr = ymd(y, m, day);
    cells.push({
      date: dateStr,
      day,
      inCurrentMonth: y === year && m === month,
      isToday: !!todayStr && dateStr === todayStr,
    });
  }
  return cells;
}

/** Verschuift {year, month} met `delta` maanden (delta mag negatief zijn). */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  const y = Math.floor(total / 12);
  return { year: y, month: total - y * 12 + 1 };
}

/** Nederlandse maandtitel met hoofdletter, bv. "Juli 2026". */
export function monthTitle(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  const s = new Intl.DateTimeFormat("nl-BE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Groepeert events per datum (YYYY-MM-DD). */
export function groupEventsByDate(
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    (map[ev.date] ??= []).push(ev);
  }
  return map;
}

/** Sorteert de events van één dag op tijdstip (zonder tijd = achteraan), dan titel. */
export function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const ta = a.time || "99:99";
    const tb = b.time || "99:99";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.title.localeCompare(b.title, "nl");
  });
}

/** Behoudt enkel events waarvan de categorie actief is. */
export function filterEventsByCategories(
  events: CalendarEvent[],
  activeKeys: Iterable<CalendarCategoryKey>,
): CalendarEvent[] {
  const active = new Set(activeKeys);
  return events.filter((e) => active.has(e.category));
}

/**
 * Chronologische lijst van events vanaf `fromStr` (inclusief), gesorteerd op
 * datum + tijd, beperkt tot `limit`.
 */
export function upcomingEvents(
  events: CalendarEvent[],
  fromStr: string,
  limit: number,
): CalendarEvent[] {
  return events
    .filter((e) => e.date >= fromStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ta = a.time || "99:99";
      const tb = b.time || "99:99";
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.title.localeCompare(b.title, "nl");
    })
    .slice(0, limit);
}
