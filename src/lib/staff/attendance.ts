import { addDays, startOfWeekMonday } from "@/lib/calendar/events";

/**
 * Wie komt welke dag (Epic 14, story 14.1).
 *
 * De datumrekenkunde komt uit `@/lib/calendar/events` — die is Brussel- en
 * zomertijdveilig en wordt al door de teamkalender gebruikt. Een tweede
 * implementatie zou vroeg of laat een dag verschillen met de kalender.
 */

export interface AttendanceEntry {
  id: number;
  /** YYYY-MM-DD */
  date: string;
  /** Gevuld voor wie een account heeft. */
  userId: number | null;
  /** Naam van dat account, opgehaald bij het uitlezen. */
  userName: string | null;
  /** Naam van een vrijwilliger zonder login, ingeschreven door de leiding. */
  guestName: string | null;
  note: string | null;
}

export interface AttendanceDay {
  /** YYYY-MM-DD */
  date: string;
  /** "maandag" … "zondag" */
  label: string;
  entries: AttendanceEntry[];
}

const WEEKDAY_LABELS = [
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
  "zondag",
];

export function displayName(entry: AttendanceEntry): string {
  return entry.userName ?? entry.guestName ?? "—";
}

/** Maandag van de week waarin deze datum valt. */
export function weekStartFor(dateStr: string): string {
  return startOfWeekMonday(dateStr);
}

export function buildAttendanceWeek(
  weekStart: string,
  entries: AttendanceEntry[],
): AttendanceDay[] {
  const perDay = new Map<string, AttendanceEntry[]>();
  for (const entry of entries) {
    const list = perDay.get(entry.date) ?? [];
    list.push(entry);
    perDay.set(entry.date, list);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dayEntries = (perDay.get(date) ?? []).sort((a, b) =>
      displayName(a).localeCompare(displayName(b), "nl", { sensitivity: "base" }),
    );
    return { date, label: WEEKDAY_LABELS[i], entries: dayEntries };
  });
}

/** Staat deze gebruiker al ingeschreven op die dag? */
export function isSignedUp(day: AttendanceDay, userId: number | null): boolean {
  if (userId === null) return false;
  return day.entries.some((entry) => entry.userId === userId);
}

/**
 * Je eigen inschrijving mag je altijd weghalen; die van iemand anders — en die
 * van een vrijwilliger zonder login — enkel met schrijfrecht.
 */
export function canRemove(
  entry: AttendanceEntry,
  userId: number | null,
  mayManageOthers: boolean,
): boolean {
  if (mayManageOthers) return true;
  if (userId === null) return false;
  return entry.userId === userId;
}
