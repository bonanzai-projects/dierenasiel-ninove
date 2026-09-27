"use server";

import { db } from "@/lib/db";
import { eventTasks } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requireEventDraaiboekAccess } from "@/lib/events/event-access";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { eventTaskSchema } from "@/lib/validations/event-tasks";
import { reorderTask, type MoveDirection } from "@/lib/events/draaiboek";
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

function foutAntwoord(waarden: ReturnType<typeof readForm>, fieldErrors: Record<string, string[]>) {
  return {
    success: false as const,
    fieldErrors,
    values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
  };
}

export async function createEventTask(
  _prev: ActionResult<EventTaskRow> | null,
  formData: FormData,
): Promise<ActionResult<EventTaskRow>> {
  // Story 13.14 — de beheerder, of de trekker van het evenement waar de taak bij komt.
  const toegang = await requireEventDraaiboekAccess(Number(formData.get("eventId")));
  if (toegang) return toegang;

  const waarden = readForm(formData);
  const parsed = eventTaskSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed.error.flatten().fieldErrors);

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
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    // Het evenement van de bestaande taak telt, niet wat het formulier meestuurt.
    const toegang = await requireEventDraaiboekAccess(old.eventId);
    if (toegang) return toegang;

    const waarden = readForm(formData);
    const parsed = eventTaskSchema.safeParse(waarden);
    if (!parsed.success) return foutAntwoord(waarden, parsed.error.flatten().fieldErrors);

    const [record] = await db
      .update(eventTasks)
      // Een taak verhuist niet naar een ander evenement.
      .set({ ...toColumns(parsed.data), eventId: old.eventId, updatedAt: new Date() })
      .where(eq(eventTasks.id, id))
      .returning();

    await logAudit("update_event_task", "event_task", id, old, record);
    revalidatePath(fichePad(old.eventId));
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
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    const toegang = await requireEventDraaiboekAccess(old.eventId);
    if (toegang) return toegang;

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
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    const toegang = await requireEventDraaiboekAccess(old.eventId);
    if (toegang) return toegang;

    await db.delete(eventTasks).where(eq(eventTasks.id, id));
    await logAudit("delete_event_task", "event_task", id, old, null);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen van de taak." };
  }
}

/**
 * Story 13.19 — een taak één plaats omhoog of omlaag in haar fase. De datum gaat
 * voor: enkel naast een taak met hetzelfde moment (`reorderTask`). De fase wordt
 * opnieuw genummerd in één batch, zodat een halve volgorde niet kan blijven hangen.
 */
export async function moveEventTask(
  id: number,
  direction: MoveDirection,
): Promise<ActionResult<{ id: number }>> {
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige taak" };
  if (direction !== "up" && direction !== "down") return { success: false, error: "Ongeldige richting" };

  try {
    const [old] = await db.select().from(eventTasks).where(eq(eventTasks.id, id)).limit(1);
    if (!old) return { success: false, error: "Taak niet gevonden" };

    const toegang = await requireEventDraaiboekAccess(old.eventId);
    if (toegang) return toegang;

    const taken = await db.select().from(eventTasks).where(eq(eventTasks.eventId, old.eventId));
    const wijzigingen = reorderTask(taken, id, direction);
    if (!wijzigingen) {
      return { success: false, error: "Hier bepaalt de datum de volgorde; pas de datum aan om de taak te verplaatsen." };
    }

    if (wijzigingen.length > 0) {
      const [eerste, ...rest] = wijzigingen.map((w) =>
        db.update(eventTasks).set({ sortOrder: w.sortOrder }).where(eq(eventTasks.id, w.id)),
      );
      await db.batch([eerste, ...rest]);
    }

    await logAudit("move_event_task", "event_task", id, { sortOrder: old.sortOrder }, { direction });
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verplaatsen van de taak." };
  }
}
