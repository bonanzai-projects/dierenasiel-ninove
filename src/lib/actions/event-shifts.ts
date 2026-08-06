"use server";

import { db } from "@/lib/db";
import { eventShifts } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { eventShiftSchema } from "@/lib/validations/event-shifts";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type EventShiftRow = InferSelectModel<typeof eventShifts>;

const fichePad = (eventId: number) => `/beheerder/evenementen/${eventId}`;

function readForm(formData: FormData) {
  return {
    eventId: (formData.get("eventId") as string) || "",
    date: (formData.get("date") as string) || "",
    startTime: (formData.get("startTime") as string) || "",
    endTime: (formData.get("endTime") as string) || "",
    post: (formData.get("post") as string)?.trim() || "",
    personName: (formData.get("personName") as string)?.trim() || "",
    notes: (formData.get("notes") as string)?.trim() || "",
  };
}

function toColumns(d: ReturnType<typeof eventShiftSchema.parse>) {
  return {
    eventId: d.eventId,
    date: d.date,
    startTime: d.startTime || null,
    endTime: d.endTime || null,
    post: d.post,
    personName: d.personName,
    notes: d.notes || null,
  };
}

function foutAntwoord(
  waarden: ReturnType<typeof readForm>,
  parsed: ReturnType<typeof eventShiftSchema.safeParse>,
): ActionResult<EventShiftRow> {
  return {
    success: false,
    fieldErrors: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
  };
}

export async function createEventShift(
  _prev: ActionResult<EventShiftRow> | null,
  formData: FormData,
): Promise<ActionResult<EventShiftRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = eventShiftSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed);

  try {
    const session = await getSession();
    const sortOrder = Math.floor(Date.now() / 1000);
    const [record] = await db
      .insert(eventShifts)
      .values({ ...toColumns(parsed.data), sortOrder, createdByUserId: session?.userId ?? null })
      .returning();

    await logAudit("create_event_shift", "event_shift", record.id, null, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de shift." };
  }
}

export async function updateEventShift(
  _prev: ActionResult<EventShiftRow> | null,
  formData: FormData,
): Promise<ActionResult<EventShiftRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige shift" };

  const waarden = readForm(formData);
  const parsed = eventShiftSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed);

  try {
    const [old] = await db.select().from(eventShifts).where(eq(eventShifts.id, id)).limit(1);
    if (!old) return { success: false, error: "Shift niet gevonden" };

    const [record] = await db
      .update(eventShifts)
      .set({ ...toColumns(parsed.data), updatedAt: new Date() })
      .where(eq(eventShifts.id, id))
      .returning();

    await logAudit("update_event_shift", "event_shift", id, old, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de shift." };
  }
}

export async function deleteEventShift(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige shift" };

  try {
    const [old] = await db.select().from(eventShifts).where(eq(eventShifts.id, id)).limit(1);
    if (!old) return { success: false, error: "Shift niet gevonden" };

    await db.delete(eventShifts).where(eq(eventShifts.id, id));
    await logAudit("delete_event_shift", "event_shift", id, old, null);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen van de shift." };
  }
}
