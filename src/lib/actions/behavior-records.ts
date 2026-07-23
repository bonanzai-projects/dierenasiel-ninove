"use server";

import { db } from "@/lib/db";
import { behaviorRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { behaviorRecordSchema } from "@/lib/validations/behavior-records";
import { getAnimalById } from "@/lib/queries/animals";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { ActionResult, BehaviorRecord } from "@/types";

export async function createBehaviorRecord(
  _prevState: ActionResult<BehaviorRecord> | null,
  formData: FormData,
): Promise<ActionResult<BehaviorRecord>> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const checklistRaw = formData.get("checklist") as string | null;
  let checklist: unknown;
  if (checklistRaw) {
    try {
      checklist = JSON.parse(checklistRaw);
    } catch {
      return { success: false, error: "Ongeldige checklist data" };
    }
  }

  const raw = {
    animalId: formData.get("animalId"),
    date: (formData.get("date") as string) || "",
    checklist,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = behaviorRecordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const animal = await getAnimalById(parsed.data.animalId);
  if (!animal) {
    return { success: false, error: "Dier niet gevonden" };
  }

  // Story 10.28: bewust géén maximum aantal fiches. Bijlage VIII B (KB 27/04/2007)
  // gaat uit van minstens één evaluatie per week gedurende de eerste drie weken,
  // dus meer dan 3 fiches is de regel, niet de uitzondering.

  const session = await getSession();

  try {
    const [record] = await db
      .insert(behaviorRecords)
      .values({
        animalId: parsed.data.animalId,
        date: parsed.data.date,
        checklist: parsed.data.checklist,
        notes: parsed.data.notes || null,
        recordedBy: session?.userId ?? null,
      })
      .returning();

    await logAudit("create_behavior_record", "behavior_record", record.id, null, record);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: record as BehaviorRecord };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}

export async function updateBehaviorRecord(
  _prevState: ActionResult<BehaviorRecord> | null,
  formData: FormData,
): Promise<ActionResult<BehaviorRecord>> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) {
    return { success: false, error: "Ongeldig fiche-ID" };
  }

  const checklistRaw = formData.get("checklist") as string | null;
  let checklist: unknown;
  if (checklistRaw) {
    try {
      checklist = JSON.parse(checklistRaw);
    } catch {
      return { success: false, error: "Ongeldige checklist data" };
    }
  }

  const raw = {
    animalId: formData.get("animalId"),
    date: (formData.get("date") as string) || "",
    checklist,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = behaviorRecordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const [oldRecord] = await db
      .select()
      .from(behaviorRecords)
      .where(eq(behaviorRecords.id, id))
      .limit(1);
    if (!oldRecord) return { success: false, error: "Gedragsfiche niet gevonden" };

    const [updated] = await db
      .update(behaviorRecords)
      .set({
        date: parsed.data.date,
        checklist: parsed.data.checklist,
        notes: parsed.data.notes || null,
      })
      .where(eq(behaviorRecords.id, id))
      .returning();

    await logAudit("update_behavior_record", "behavior_record", updated.id, oldRecord, updated);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: updated as BehaviorRecord };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}

export async function deleteBehaviorRecord(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) {
    return { success: false, error: "Ongeldig fiche-ID" };
  }

  try {
    const [existing] = await db
      .select()
      .from(behaviorRecords)
      .where(eq(behaviorRecords.id, id))
      .limit(1);
    if (!existing) return { success: false, error: "Gedragsfiche niet gevonden" };

    await db
      .delete(behaviorRecords)
      .where(eq(behaviorRecords.id, id));

    await logAudit("delete_behavior_record", "behavior_record", existing.id, existing, null);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het verwijderen. Probeer het later opnieuw.",
    };
  }
}
