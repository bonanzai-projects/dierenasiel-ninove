"use server";

import { db } from "@/lib/db";
import { eventMaterials } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { eventMaterialSchema } from "@/lib/validations/event-materials";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type EventMaterialRow = InferSelectModel<typeof eventMaterials>;

const fichePad = (eventId: number) => `/beheerder/evenementen/${eventId}`;

function isChecked(formData: FormData, name: string): boolean {
  return formData.getAll(name).includes("true");
}

function readForm(formData: FormData) {
  return {
    eventId: (formData.get("eventId") as string) || "",
    name: (formData.get("name") as string) || "",
    quantity: (formData.get("quantity") as string) || "",
    origin: (formData.get("origin") as string) || "",
    supplier: (formData.get("supplier") as string)?.trim() || "",
    arranged: isChecked(formData, "arranged"),
    returned: isChecked(formData, "returned"),
    notes: (formData.get("notes") as string)?.trim() || "",
  };
}

function toColumns(d: ReturnType<typeof eventMaterialSchema.parse>) {
  return {
    eventId: d.eventId,
    name: d.name,
    quantity: d.quantity,
    origin: d.origin,
    supplier: d.supplier || null,
    arranged: d.arranged,
    returned: d.returned,
    notes: d.notes || null,
  };
}

function foutAntwoord(
  waarden: ReturnType<typeof readForm>,
  parsed: ReturnType<typeof eventMaterialSchema.safeParse>,
): ActionResult<EventMaterialRow> {
  return {
    success: false,
    fieldErrors: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
  };
}

export async function createEventMaterial(
  _prev: ActionResult<EventMaterialRow> | null,
  formData: FormData,
): Promise<ActionResult<EventMaterialRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = eventMaterialSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed);

  try {
    const sortOrder = Math.floor(Date.now() / 1000);
    const [record] = await db
      .insert(eventMaterials)
      .values({ ...toColumns(parsed.data), sortOrder })
      .returning();

    await logAudit("create_event_material", "event_material", record.id, null, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van het materiaal." };
  }
}

export async function updateEventMaterial(
  _prev: ActionResult<EventMaterialRow> | null,
  formData: FormData,
): Promise<ActionResult<EventMaterialRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige regel" };

  const waarden = readForm(formData);
  const parsed = eventMaterialSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed);

  try {
    const [old] = await db.select().from(eventMaterials).where(eq(eventMaterials.id, id)).limit(1);
    if (!old) return { success: false, error: "Regel niet gevonden" };

    const [record] = await db
      .update(eventMaterials)
      .set({ ...toColumns(parsed.data), updatedAt: new Date() })
      .where(eq(eventMaterials.id, id))
      .returning();

    await logAudit("update_event_material", "event_material", id, old, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van het materiaal." };
  }
}

/**
 * Eén vinkje omzetten zonder het hele formulier te openen: "geregeld" vooraf,
 * "terug" na afloop. Dat zijn de twee handelingen die je het vaakst doet.
 */
export async function toggleEventMaterial(
  id: number,
  veld: "arranged" | "returned",
  waarde: boolean,
): Promise<ActionResult<EventMaterialRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige regel" };
  if (veld !== "arranged" && veld !== "returned") {
    return { success: false, error: "Onbekend veld" };
  }

  try {
    const [old] = await db.select().from(eventMaterials).where(eq(eventMaterials.id, id)).limit(1);
    if (!old) return { success: false, error: "Regel niet gevonden" };

    const [record] = await db
      .update(eventMaterials)
      .set({ [veld]: waarde, updatedAt: new Date() })
      .where(eq(eventMaterials.id, id))
      .returning();

    await logAudit("toggle_event_material", "event_material", id, old, record);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het bijwerken." };
  }
}

export async function deleteEventMaterial(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige regel" };

  try {
    const [old] = await db.select().from(eventMaterials).where(eq(eventMaterials.id, id)).limit(1);
    if (!old) return { success: false, error: "Regel niet gevonden" };

    await db.delete(eventMaterials).where(eq(eventMaterials.id, id));
    await logAudit("delete_event_material", "event_material", id, old, null);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen." };
  }
}
