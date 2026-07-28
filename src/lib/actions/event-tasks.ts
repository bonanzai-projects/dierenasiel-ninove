"use server";

import { db } from "@/lib/db";
import { eventTasks } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { eventTaskSchema } from "@/lib/validations/event-tasks";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type EventTaskRow = InferSelectModel<typeof eventTasks>;

const fichePad = (eventId: number) => `/beheerder/evenementen/${eventId}`;

function readForm(formData: FormData) {
  return {
    eventId: (formData.get("eventId") as string) || "",
    phase: (formData.get("phase") as string) || "",
    title: (formData.get("title") as string) || "",
    date: (formData.get("date") as string) || "",
    time: (formData.get("time") as string) || "",
    responsible: (formData.get("responsible") as string)?.trim() || "",
    notes: (formData.get("notes") as string)?.trim() || "",
  };
}

function toColumns(d: ReturnType<typeof eventTaskSchema.parse>) {
  return {
    eventId: d.eventId,
    phase: d.phase,
    title: d.title,
    date: d.date || null,
    time: d.time || null,
    responsible: d.responsible || null,
    notes: d.notes || null,
  };
}

export async function createEventTask(
  _prev: ActionResult<EventTaskRow> | null,
  formData: FormData,
): Promise<ActionResult<EventTaskRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = eventTaskSchema.safeParse(waarden);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
    };
  }

  try {
    // Nieuwe taken achteraan hun fase; de sortering doet de rest.
    const sortOrder = Math.floor(Date.now() / 1000);
    const [record] = await db
      .insert(eventTasks)
      .values({ ...toColumns(parsed.data), sortOrder })
      .returning();

    await logAudit("create_event_task", "event_task", record.id, null, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de taak." };
  }
}

export async function updateEventTask(
  _prev: ActionResult<EventTaskRow> | null,
  formData: FormData,
): Promise<ActionResult<EventTaskRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };

  const waarden = readForm(formData);
  const parsed = eventTaskSchema.safeParse(waarden);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
    };
  }

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    const [record] = await db
      .update(eventTasks)
      .set({ ...toColumns(parsed.data), updatedAt: new Date() })
      .where(eq(eventTasks.id, id))
      .returning();

    await logAudit("update_event_task", "event_task", id, old, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de taak." };
  }
}

/** Afvinken bewaart wie en wanneer; uitvinken wist dat weer. */
export async function toggleEventTask(
  id: number,
  done: boolean,
): Promise<ActionResult<EventTaskRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    const session = await getSession();
    const [record] = await db
      .update(eventTasks)
      .set({
        done,
        doneAt: done ? new Date() : null,
        doneByUserId: done ? session?.userId ?? null : null,
        updatedAt: new Date(),
      })
      .where(eq(eventTasks.id, id))
      .returning();

    await logAudit("toggle_event_task", "event_task", id, old, record);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het afvinken." };
  }
}

export async function deleteEventTask(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    await db.delete(eventTasks).where(eq(eventTasks.id, id));
    await logAudit("delete_event_task", "event_task", id, old, null);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen van de taak." };
  }
}
