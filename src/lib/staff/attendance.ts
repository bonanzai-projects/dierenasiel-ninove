import { addDays, startOfWeekMonday } from "@/lib/calendar/events";

/**
 * Wie komt welke dag (Epic 14, story 14.1) — en sinds story 14.7 ook van hoe laat
 * tot hoe laat. Sven, vraag 2: "uren zou het makkelijkste zijn om overzicht te bewaren".
 *
 * De datumrekenkunde komt uit `@/lib/calendar/events` — die is Brussel- en
 * zomertijdveilig en wordt al door de teamkalender gebruikt. Een tweede
 * implementatie zou vroeg of laat een dag verschillen met de kalender.
 */

export interface TimeBlock {
  /** "HH:MM". Leeg = de hele dag. */
  startTime: string | null;
  /** "HH:MM". Leeg = open einde (of de hele dag, als er ook geen begin is). */
  endTime: string | null;
}

export interface Person {
  /** Gevuld voor wie een account heeft. */
  userId: number | null;
  /** Naam van een vrijwilliger zonder login, ingeschreven door de leiding. */
  guestName: string | null;
}

export interface AttendanceEntry extends TimeBlock, Person {
  id: number;
  /** YYYY-MM-DD */
  date: string;
  /** Naam van dat account, opgehaald bij het uitlezen. */
  userName: string | null;
  /** Story 14.4 — rol van dat account; "wandelaar" voor een vrijwilliger met account. */
  userRole: string | null;
  /** Story 14.2 — wat die persoon komt doen. */
  task: string | null;
  /** Story 14.3 — het plaatsje dat deze inschrijving inneemt, of null voor een gewoon blok. */
  slotId: number | null;
  note: string | null;
  /**
   * Story 14.8 — gevuld als deze aanwezigheid uit het vaste weekrooster komt (dan is `id`
   * negatief en bestaat er geen rij in `staff_attendance`).
   */
  patternId?: number | null;
}

export interface TimeRangeIssue {
  path: "startTime" | "endTime";
  message: string;
}

/**
 * Story 14.7 — kloppen de uren? Een einduur zonder beginuur zegt niets, en een blok over
 * middernacht is in een asiel met dagwerking eerder een tikfout dan een shift. Gedeeld door
 * de acties voor inschrijvingen en plaatsjes (14.3).
 */
export function timeRangeIssues(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): TimeRangeIssue[] {
  const issues: TimeRangeIssue[] = [];
  if (endTime && !startTime) issues.push({ path: "startTime", message: "Vul eerst een beginuur in" });
  if (startTime && endTime && endTime <= startTime) {
    issues.push({ path: "endTime", message: "Einduur moet na het beginuur liggen" });
  }
  return issues;
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

/** "09:00–12:00", "vanaf 14:00" of "hele dag". */
export function formatTimeRange(block: TimeBlock): string {
  if (!block.startTime) return "hele dag";
  if (!block.endTime) return `vanaf ${block.startTime}`;
  return `${block.startTime}–${block.endTime}`;
}

/**
 * Een blok als halfopen interval [begin, einde). Een hele dag loopt van 00:00 tot
 * 24:00, een open einde tot 24:00. "HH:MM" met voorloopnul sorteert als tekst goed,
 * dus vergelijken kan zonder omrekenen.
 */
function interval(block: TimeBlock): [string, string] {
  if (!block.startTime) return ["00:00", "24:00"];
  return [block.startTime, block.endTime ?? "24:00"];
}

/** Aansluitende blokken (9–12 en 12–15) overlappen niet; een hele dag overlapt met alles. */
export function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  const [aVan, aTot] = interval(a);
  const [bVan, bTot] = interval(b);
  return aVan < bTot && bVan < aTot;
}

export function isSameBlock(a: TimeBlock, b: TimeBlock): boolean {
  return (a.startTime ?? null) === (b.startTime ?? null) && (a.endTime ?? null) === (b.endTime ?? null);
}

function normalizeName(name: string | null): string {
  return (name ?? "").trim().toLocaleLowerCase("nl");
}

/**
 * Dezelfde persoon: hetzelfde account, of — zonder account — dezelfde naam. Zo telt
 * "Tante Marie" en " tante marie" als één vrijwilliger.
 */
export function samePerson(a: Person, b: Person): boolean {
  if (a.userId !== null || b.userId !== null) return a.userId !== null && a.userId === b.userId;
  const naam = normalizeName(a.guestName);
  return naam !== "" && naam === normalizeName(b.guestName);
}

/** Het eerste bestaande blok van dezelfde persoon dat met het nieuwe botst, of null. */
export function findOverlap<T extends Person & TimeBlock>(
  bestaande: readonly T[],
  nieuw: Person & TimeBlock,
): T | null {
  return bestaande.find((e) => samePerson(e, nieuw) && blocksOverlap(e, nieuw)) ?? null;
}

/** Maandag van de week waarin deze datum valt. */
export function weekStartFor(dateStr: string): string {
  return startOfWeekMonday(dateStr);
}

/**
 * Volgorde van aankomst: hele dag eerst, dan op beginuur, dan op naam. Ook gebruikt door
 * de teamkalender (story 14.5) — één sortering, zodat beide schermen hetzelfde tonen.
 */
export function compareAttendance(a: AttendanceEntry, b: AttendanceEntry): number {
  const aStart = a.startTime ?? "";
  const bStart = b.startTime ?? "";
  if (aStart !== bStart) return aStart < bStart ? -1 : 1;
  return displayName(a).localeCompare(displayName(b), "nl", { sensitivity: "base" });
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
    const dayEntries = (perDay.get(date) ?? []).sort(compareAttendance);
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
 * van een vrijwilliger zonder login — enkel met schrijfrecht. Een vast moment uit het
 * weekrooster (story 14.8) is geen rij: dat stop je in het weekrooster zelf.
 */
export function canRemove(
  entry: AttendanceEntry,
  userId: number | null,
  mayManageOthers: boolean,
): boolean {
  if (entry.patternId != null) return false;
  if (mayManageOthers) return true;
  if (userId === null) return false;
  return entry.userId === userId;
}
