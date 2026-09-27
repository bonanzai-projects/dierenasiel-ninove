import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { staffPatterns, users } from "@/lib/db/schema";
import { BACKOFFICE_ROLES } from "@/lib/constants";
import type { AttendanceEntry } from "@/lib/staff/attendance";
import { mergePatternEntries, patternEntriesBetween, sortPatterns, type StaffPattern } from "@/lib/staff/patterns";
import { findApprovedWalker, getAttendanceBetween, getVolunteerOptions } from "@/lib/queries/staff-attendance";

/**
 * Epic 14, story 14.8 — het vaste weekrooster. De naam van het account wordt bij het
 * lezen opgehaald, zoals bij de inschrijvingen: dan klopt hij na een naamswijziging en
 * na het anonimiseren van een wandelaar.
 */
function selecteer() {
  return db
    .select({
      id: staffPatterns.id,
      userId: staffPatterns.userId,
      userName: users.name,
      userRole: users.role,
      weekday: staffPatterns.weekday,
      startTime: staffPatterns.startTime,
      endTime: staffPatterns.endTime,
      task: staffPatterns.task,
      validFrom: staffPatterns.validFrom,
      validUntil: staffPatterns.validUntil,
    })
    .from(staffPatterns)
    .leftJoin(users, eq(staffPatterns.userId, users.id));
}

/** De vaste momenten die ergens tussen `start` en `end` (inclusief) gelden. */
export async function getPatternsBetween(start: string, end: string): Promise<StaffPattern[]> {
  try {
    return await selecteer().where(
      and(
        lte(staffPatterns.validFrom, end),
        or(isNull(staffPatterns.validUntil), gte(staffPatterns.validUntil, start)),
      ),
    );
  } catch (err) {
    console.error("getPatternsBetween query failed:", err);
    return [];
  }
}

/** Het weekrooster zoals het vandaag geldt of nog komt — voor het blok "Vast weekrooster". */
export async function getCurrentPatterns(today: string): Promise<StaffPattern[]> {
  try {
    const rijen = await selecteer().where(
      or(isNull(staffPatterns.validUntil), gte(staffPatterns.validUntil, today)),
    );
    return sortPatterns(rijen);
  } catch (err) {
    console.error("getCurrentPatterns query failed:", err);
    return [];
  }
}

/**
 * Wie er tussen twee datums komt: de inschrijvingen plus het vaste weekrooster, met
 * voorrang voor een inschrijving die op die dag overlapt (`mergePatternEntries`).
 * Gebruikt door het personeelsscherm en de teamkalender (story 14.5).
 */
export async function getPlannedAttendanceBetween(start: string, end: string): Promise<AttendanceEntry[]> {
  const [echt, patronen] = await Promise.all([getAttendanceBetween(start, end), getPatternsBetween(start, end)]);
  return mergePatternEntries(echt, patternEntriesBetween(patronen, start, end));
}

export interface PatternPersonOption {
  userId: number;
  name: string;
  /** "team" voor een backoffice-account, "wandelaar" voor een vrijwilliger met account. */
  group: "team" | "wandelaar";
}

/**
 * Voor wie de leiding een vast moment kan instellen: de actieve backoffice-accounts en de
 * kiesbare wandelaars (story 14.4). Iemand zonder account krijgt geen vast moment.
 */
export async function getPatternPeopleOptions(): Promise<PatternPersonOption[]> {
  try {
    const [team, wandelaars] = await Promise.all([
      db
        .select({ userId: users.id, name: users.name })
        .from(users)
        .where(and(inArray(users.role, [...BACKOFFICE_ROLES]), eq(users.isActive, true)))
        .orderBy(asc(users.name)),
      getVolunteerOptions(),
    ]);
    return [
      ...team.map((t) => ({ ...t, group: "team" as const })),
      ...wandelaars.map((w) => ({ ...w, group: "wandelaar" as const })),
    ];
  } catch (err) {
    console.error("getPatternPeopleOptions query failed:", err);
    return [];
  }
}

/**
 * Het account achter een vast moment: actief, en een backoffice-rol of een kiesbare
 * wandelaar. Vangt geen fouten op — de actie moet een databankfout niet lezen als
 * "die persoon bestaat niet".
 */
export async function findPatternPerson(userId: number): Promise<PatternPersonOption | null> {
  const [lid] = await db
    .select({ userId: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, userId), inArray(users.role, [...BACKOFFICE_ROLES]), eq(users.isActive, true)))
    .limit(1);
  if (lid) return { ...lid, group: "team" };
  const wandelaar = await findApprovedWalker(userId);
  return wandelaar ? { ...wandelaar, group: "wandelaar" } : null;
}
