import { and, asc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { staffAttendance, users, walkers } from "@/lib/db/schema";
import type { AttendanceEntry } from "@/lib/staff/attendance";
import { sortVolunteers, type VolunteerOption } from "@/lib/staff/volunteers";

/**
 * Alle inschrijvingen tussen twee datums (inclusief) — voor het personeelsscherm en, sinds
 * story 14.5, de teamkalender. De naam van een account wordt hier opgehaald in plaats van
 * in de rij bewaard, zodat hij klopt na een naamswijziging — en na het anonimiseren van
 * een wandelaar (story 14.4).
 */
export async function getAttendanceBetween(start: string, end: string): Promise<AttendanceEntry[]> {
  try {
    const rows = await db
      .select({
        id: staffAttendance.id,
        date: staffAttendance.date,
        userId: staffAttendance.userId,
        userName: users.name,
        userRole: users.role,
        guestName: staffAttendance.guestName,
        startTime: staffAttendance.startTime,
        endTime: staffAttendance.endTime,
        task: staffAttendance.task,
        slotId: staffAttendance.slotId,
        note: staffAttendance.note,
      })
      .from(staffAttendance)
      .leftJoin(users, eq(staffAttendance.userId, users.id))
      .where(and(gte(staffAttendance.date, start), lte(staffAttendance.date, end)))
      .orderBy(asc(staffAttendance.date), asc(staffAttendance.id));

    return rows.map((row) => ({
      ...row,
      userName: row.userName ?? null,
      userRole: row.userRole ?? null,
    }));
  } catch (err) {
    console.error("getAttendanceBetween query failed:", err);
    return [];
  }
}

/**
 * Story 14.2 — de taken die sinds `sinds` al ingevuld werden. Ze komen mee in de
 * voorstellen (`taskSuggestions`); het ontdubbelen gebeurt daar, niet hier.
 */
export async function getRecentAttendanceTasks(sinds: string): Promise<string[]> {
  try {
    const rows = await db
      .selectDistinct({ task: staffAttendance.task })
      .from(staffAttendance)
      .where(and(isNotNull(staffAttendance.task), gte(staffAttendance.date, sinds)))
      .limit(100);
    return rows.map((row) => row.task).filter((task): task is string => Boolean(task));
  } catch (err) {
    console.error("getRecentAttendanceTasks query failed:", err);
    return [];
  }
}

/**
 * Story 14.4 — wie als vrijwilliger gekozen kan worden: een goedgekeurde wandelaar,
 * niet geanonimiseerd, met een actief wandelaarsaccount. Eén voorwaarde voor de lijst
 * én voor de controle in de actie, zodat die twee niet uit elkaar kunnen lopen.
 */
function isKiesbareWandelaar() {
  return [
    eq(walkers.status, "approved"),
    isNull(walkers.anonymisedAt),
    eq(users.role, "wandelaar"),
    eq(users.isActive, true),
  ];
}

export async function getVolunteerOptions(): Promise<VolunteerOption[]> {
  try {
    const rows = await db
      .select({ userId: users.id, name: users.name })
      .from(walkers)
      .innerJoin(users, eq(walkers.userId, users.id))
      .where(and(...isKiesbareWandelaar()))
      .limit(500);
    return sortVolunteers(rows);
  } catch (err) {
    console.error("getVolunteerOptions query failed:", err);
    return [];
  }
}

/** De wandelaar achter dit account, of null als die niet (meer) gekozen kan worden. */
export async function findApprovedWalker(userId: number): Promise<VolunteerOption | null> {
  const [row] = await db
    .select({ userId: users.id, name: users.name })
    .from(walkers)
    .innerJoin(users, eq(walkers.userId, users.id))
    .where(and(eq(users.id, userId), ...isKiesbareWandelaar()))
    .limit(1);
  return row ?? null;
}
