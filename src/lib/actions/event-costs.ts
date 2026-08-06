"use server";

import { db } from "@/lib/db";
import { eventCosts } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { eventCostSchema } from "@/lib/validations/event-costs";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type EventCostRow = InferSelectModel<typeof eventCosts>;

const fichePad = (eventId: number) => `/beheerder/evenementen/${eventId}`;

/**
 * Twee entries met dezelfde naam (hidden "false" + checkbox "true"): `get` geeft
 * altijd de eerste terug, dus lezen gebeurt met `getAll`.
 */
function isChecked(formData: FormData, name: string): boolean {
  return formData.getAll(name).includes("true");
}

function readForm(formData: FormData) {
  return {
    eventId: (formData.get("eventId") as string) || "",
    kind: (formData.get("kind") as string) || "",
    category: (formData.get("category") as string) || "",
    description: (formData.get("description") as string) || "",
    budgetAmount: (formData.get("budgetAmount") as string) || "",
    actualAmount: (formData.get("actualAmount") as string) || "",
    supplier: (formData.get("supplier") as string)?.trim() || "",
    paid: isChecked(formData, "paid"),
    notes: (formData.get("notes") as string)?.trim() || "",
  };
}

/**
 * numeric-kolommen verwachten tekst. `String(400)` → "400" en `String(560.5)` →
 * "560.5"; PostgreSQL rondt zelf af op twee cijfers.
 */
function toColumns(d: ReturnType<typeof eventCostSchema.parse>) {
  return {
    eventId: d.eventId,
    kind: d.kind,
    category: d.category,
    description: d.description,
    budgetAmount: d.budgetAmount === null ? null : String(d.budgetAmount),
    actualAmount: d.actualAmount === null ? null : String(d.actualAmount),
    supplier: d.supplier || null,
    paid: d.paid,
    notes: d.notes || null,
  };
}

function foutAntwoord(
  waarden: ReturnType<typeof readForm>,
  parsed: ReturnType<typeof eventCostSchema.safeParse>,
): ActionResult<EventCostRow> {
  return {
    success: false,
    fieldErrors: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
  };
}

export async function createEventCost(
  _prev: ActionResult<EventCostRow> | null,
  formData: FormData,
): Promise<ActionResult<EventCostRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = eventCostSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed);

  try {
    const session = await getSession();
    // Nieuwe lijnen achteraan hun lijst.
    const sortOrder = Math.floor(Date.now() / 1000);
    const [record] = await db
      .insert(eventCosts)
      .values({ ...toColumns(parsed.data), sortOrder, createdByUserId: session?.userId ?? null })
      .returning();

    await logAudit("create_event_cost", "event_cost", record.id, null, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de lijn." };
  }
}

export async function updateEventCost(
  _prev: ActionResult<EventCostRow> | null,
  formData: FormData,
): Promise<ActionResult<EventCostRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige lijn" };

  const waarden = readForm(formData);
  const parsed = eventCostSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed);

  try {
    const [old] = await db.select().from(eventCosts).where(eq(eventCosts.id, id)).limit(1);
    if (!old) return { success: false, error: "Lijn niet gevonden" };

    const [record] = await db
      .update(eventCosts)
      .set({ ...toColumns(parsed.data), updatedAt: new Date() })
      .where(eq(eventCosts.id, id))
      .returning();

    await logAudit("update_event_cost", "event_cost", id, old, record);
    revalidatePath(fichePad(parsed.data.eventId));
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de lijn." };
  }
}

export async function deleteEventCost(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige lijn" };

  try {
    const [old] = await db.select().from(eventCosts).where(eq(eventCosts.id, id)).limit(1);
    if (!old) return { success: false, error: "Lijn niet gevonden" };

    await db.delete(eventCosts).where(eq(eventCosts.id, id));
    await logAudit("delete_event_cost", "event_cost", id, old, null);
    revalidatePath(fichePad(old.eventId));
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen van de lijn." };
  }
}
