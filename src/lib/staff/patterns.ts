import { addDays } from "@/lib/calendar/events";
import {
  blocksOverlap,
  formatTimeRange,
  samePerson,
  type AttendanceEntry,
  type TimeBlock,
} from "./attendance";

/**
 * Epic 14, story 14.8 — het vaste weekrooster. Sven (2026-09-10): "ja dat herhaalt
 * zich maar soms ook niet (verlof)" en "ook willen zien wat voorbij is".
 *
 * Een vast moment geldt van `validFrom` tot en met `validUntil` (leeg = voor onbepaalde
 * tijd). De weken worden niet op voorhand gevuld: bij het lezen maakt
 * `patternEntriesBetween` er gewone aanwezigheden van. Stoppen sluit de periode af in
 * plaats van te wissen, zodat vorige weken blijven tonen wie er toen vast kwam.
 *
 * Pure logica, geen database.
 */

export interface StaffPattern extends TimeBlock {
  id: number;
  userId: number;
  /** Naam van dat account, opgehaald bij het uitlezen. */
  userName: string | null;
  userRole: string | null;
  /** 1 = maandag … 7 = zondag. */
  weekday: number;
  task: string | null;
  /** YYYY-MM-DD, de eerste dag waarop het vaste moment geldt. */
  validFrom: string;
  /** YYYY-MM-DD, de laatste dag (inclusief); leeg = geen einde. */
  validUntil: string | null;
}

export const WEEKDAYS = [
  { value: 1, label: "maandag" },
  { value: 2, label: "dinsdag" },
  { value: 3, label: "woensdag" },
  { value: 4, label: "donderdag" },
  { value: 5, label: "vrijdag" },
  { value: 6, label: "zaterdag" },
  { value: 7, label: "zondag" },
] as const;

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS.find((d) => d.value === weekday)?.label ?? "?";
}

/** 1 = maandag … 7 = zondag. Rekent op de kalenderdatum zelf, los van tijdzones. */
export function isoWeekday(date: string): number {
  const zondagIsNul = new Date(`${date}T12:00:00Z`).getUTCDay();
  return zondagIsNul === 0 ? 7 : zondagIsNul;
}

/** "01/09/2026" */
function kort(date: string): string {
  return date.split("-").reverse().join("/");
}

/** Gebruikt `validUntil` of, zonder einde, een datum ver in de toekomst. */
function einde(p: Pick<StaffPattern, "validUntil">): string {
  return p.validUntil ?? "9999-12-31";
}

/**
 * De vaste momenten als aanwezigheden, per dag tussen `start` en `end` (inclusief).
 * Een vast moment krijgt het negatieve id van het patroon: echte inschrijvingen hebben
 * een positief id, dus een dag kan ze nooit door elkaar halen.
 */
export function patternEntriesBetween(
  patterns: readonly StaffPattern[],
  start: string,
  end: string,
): AttendanceEntry[] {
  const rijen: AttendanceEntry[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const weekdag = isoWeekday(date);
    for (const p of patterns) {
      if (p.weekday !== weekdag || date < p.validFrom || date > einde(p)) continue;
      rijen.push({
        id: -p.id,
        date,
        userId: p.userId,
        guestName: null,
        userName: p.userName,
        userRole: p.userRole,
        startTime: p.startTime,
        endTime: p.endTime,
        task: p.task,
        slotId: null,
        note: null,
        patternId: p.id,
      });
    }
  }
  return rijen;
}

/**
 * Een gewone inschrijving van dezelfde persoon op die dag die overlapt met het vaste
 * moment, gaat voor: zo past iemand één dag aan ("vandaag 9–11") zonder het rooster te
 * wijzigen. Een plaatsje (14.3) vervangt niets — "hele dag" naast een plaatsje mocht al.
 */
export function mergePatternEntries(
  real: readonly AttendanceEntry[],
  virtual: readonly AttendanceEntry[],
): AttendanceEntry[] {
  const gewoon = real.filter((e) => e.slotId == null);
  const overblijvend = virtual.filter(
    (v) => !gewoon.some((e) => e.date === v.date && samePerson(e, v) && blocksOverlap(e, v)),
  );
  return [...real, ...overblijvend];
}

type PatroonSleutel = Pick<StaffPattern, "userId" | "weekday" | "startTime" | "endTime" | "validFrom" | "validUntil">;

/** Het eerste vaste moment van dezelfde persoon dat botst: zelfde weekdag, overlappende uren én periode. */
export function findPatternOverlap<T extends PatroonSleutel>(bestaande: readonly T[], nieuw: PatroonSleutel): T | null {
  return (
    bestaande.find(
      (p) =>
        p.userId === nieuw.userId &&
        p.weekday === nieuw.weekday &&
        p.validFrom <= einde(nieuw) &&
        nieuw.validFrom <= einde(p) &&
        blocksOverlap(p, nieuw),
    ) ?? null
  );
}

export type StopPlan = { kind: "end"; validUntil: string } | { kind: "delete" } | { kind: "already" };

/**
 * Stoppen = het vaste moment loopt tot en met vandaag; het verleden blijft staan. Wat nog
 * niet begonnen is, heeft geen verleden en mag dus gewoon weg.
 */
export function stopPlan(p: Pick<StaffPattern, "validFrom" | "validUntil">, today: string): StopPlan {
  if (p.validUntil !== null && p.validUntil < today) return { kind: "already" };
  if (p.validFrom > today) return { kind: "delete" };
  return { kind: "end", validUntil: today };
}

/** "elke maandag · 08:00–12:00 · Kuis honden" */
export function describePattern(p: Pick<StaffPattern, "weekday" | "startTime" | "endTime" | "task">): string {
  return [`elke ${weekdayLabel(p.weekday)}`, formatTimeRange(p), p.task].filter(Boolean).join(" · ");
}

/** "sinds 01/09/2026", "vanaf 05/10/2026" (nog niet begonnen), eventueel met "t/m …". */
export function patternPeriod(p: Pick<StaffPattern, "validFrom" | "validUntil">, today: string): string {
  const begin = p.validFrom > today ? `vanaf ${kort(p.validFrom)}` : `sinds ${kort(p.validFrom)}`;
  return p.validUntil ? `${begin} t/m ${kort(p.validUntil)}` : begin;
}

/** Op naam, dan weekdag, dan beginuur (hele dag eerst). */
export function sortPatterns<T extends StaffPattern>(patterns: readonly T[]): T[] {
  return [...patterns].sort(
    (a, b) =>
      (a.userName ?? "").localeCompare(b.userName ?? "", "nl", { sensitivity: "base" }) ||
      a.weekday - b.weekday ||
      (a.startTime ?? "").localeCompare(b.startTime ?? ""),
  );
}
