"use server";

import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { calendarEventSchema } from "@/lib/validations/calendar-events";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type CalendarEventRow = InferSelectModel<typeof calendarEvents>;

/** Leest de velden van het kalender-formulier uit de FormData. */
function readForm(formData: FormData) {
  return {
    title: (formData.get("title") as string) || "",
    category: (formData.get("category") as string) || "",
    description: (formData.get("description") as string)?.trim() || undefined,
    date: (formData.get("date") as string) || "",
    endDate: (formData.get("endDate") as string) || "",
    startTime: (formData.get("startTime") as string) || "",
    endTime: (formData.get("endTime") as string) || "",
    location: (formData.get("location") as string)?.trim() || undefined,
    animalId: (formData.get("animalId") as string) || undefined,
  };
}

export async function createCalendarEvent(
  _prev: ActionResult<CalendarEventRow> | null,
  formData: FormData,
): Promise<ActionResult<CalendarEventRow>> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };

  const parsed = calendarEventSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  try {
    const [record] = await db
      .insert(calendarEvents)
      .values({
        title: d.title,
        category: d.category,
        description: d.description || null,
        date: d.date,
        endDate: d.endDate || null,
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        location: d.location || null,
        animalId: d.animalId ?? null,
        createdByUserId: session.userId ?? null,
      })
      .returning();

    await logAudit("create_calendar_event", "calendar_event", record.id, null, record);
    revalidatePath("/beheerder/kalender");
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw." };
  }
}

export async function updateCalendarEvent(
  _prev: ActionResult<CalendarEventRow> | null,
  formData: FormData,
): Promise<ActionResult<CalendarEventRow>> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldig item" };

  const parsed = calendarEventSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  try {
    const [old] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
    if (!old) return { success: false, error: "Item niet gevonden" };

    const [record] = await db
      .update(calendarEvents)
      .set({
        title: d.title,
        category: d.category,
        description: d.description || null,
        date: d.date,
        endDate: d.endDate || null,
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        location: d.location || null,
        animalId: d.animalId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, id))
      .returning();

    await logAudit("update_calendar_event", "calendar_event", id, old, record);
    revalidatePath("/beheerder/kalender");
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw." };
  }
}

export async function deleteCalendarEvent(id: number): Promise<ActionResult<{ id: number }>> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldig item" };

  try {
    const [old] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
    if (!old) return { success: false, error: "Item niet gevonden" };

    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    await logAudit("delete_calendar_event", "calendar_event", id, old, null);
    revalidatePath("/beheerder/kalender");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen." };
  }
}
