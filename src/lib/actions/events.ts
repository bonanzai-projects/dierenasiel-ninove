"use server";

import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { eventSchema } from "@/lib/validations/events";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type EventRow = InferSelectModel<typeof events>;

const OVERZICHT = "/beheerder/evenementen";

/** Leest de velden van het evenement-formulier uit de FormData. */
function readForm(formData: FormData) {
  return {
    name: (formData.get("name") as string) || "",
    type: (formData.get("type") as string) || "",
    status: (formData.get("status") as string) || "",
    date: (formData.get("date") as string) || "",
    endDate: (formData.get("endDate") as string) || "",
    startTime: (formData.get("startTime") as string) || "",
    endTime: (formData.get("endTime") as string) || "",
    location: (formData.get("location") as string)?.trim() || "",
    responsible: (formData.get("responsible") as string)?.trim() || "",
    expectedVisitors: (formData.get("expectedVisitors") as string) || "",
    description: (formData.get("description") as string)?.trim() || "",
  };
}

/**
 * React 19 leegt ongecontroleerde formuliervelden ná een Server Action, ook bij
 * een fout. Daarom geven we de ingevulde waarden terug zodat het formulier ze
 * kan herstellen.
 */
function terugTeGeven(waarden: ReturnType<typeof readForm>): Record<string, string> {
  return Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v ?? "")]));
}

/** Zet de gevalideerde invoer om naar kolommen; leeg wordt null, niet "". */
function toColumns(d: ReturnType<typeof eventSchema.parse>) {
  return {
    name: d.name,
    type: d.type,
    status: d.status,
    date: d.date,
    endDate: d.endDate || null,
    startTime: d.startTime || null,
    endTime: d.endTime || null,
    location: d.location || null,
    responsible: d.responsible || null,
    expectedVisitors: d.expectedVisitors ?? null,
    description: d.description || null,
  };
}

export async function createEvent(
  _prev: ActionResult<EventRow> | null,
  formData: FormData,
): Promise<ActionResult<EventRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = eventSchema.safeParse(waarden);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: terugTeGeven(waarden),
    };
  }

  try {
    const session = await getSession();
    const [record] = await db
      .insert(events)
      .values({ ...toColumns(parsed.data), createdByUserId: session?.userId ?? null })
      .returning();

    await logAudit("create_event", "event", record.id, null, record);
    revalidatePath(OVERZICHT);
    return { success: true, data: record };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
      values: terugTeGeven(waarden),
    };
  }
}

export async function updateEvent(
  _prev: ActionResult<EventRow> | null,
  formData: FormData,
): Promise<ActionResult<EventRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldig evenement" };

  const waarden = readForm(formData);
  const parsed = eventSchema.safeParse(waarden);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: terugTeGeven(waarden),
    };
  }

  try {
    const [old] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!old) return { success: false, error: "Evenement niet gevonden" };

    const [record] = await db
      .update(events)
      .set({ ...toColumns(parsed.data), updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();

    await logAudit("update_event", "event", id, old, record);
    revalidatePath(OVERZICHT);
    revalidatePath(`${OVERZICHT}/${id}`);
    return { success: true, data: record };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
      values: terugTeGeven(waarden),
    };
  }
}

export async function deleteEvent(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldig evenement" };

  try {
    const [old] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!old) return { success: false, error: "Evenement niet gevonden" };

    await db.delete(events).where(eq(events.id, id));
    await logAudit("delete_event", "event", id, old, null);
    revalidatePath(OVERZICHT);
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen." };
  }
}
