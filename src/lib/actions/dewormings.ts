"use server";

import { db } from "@/lib/db";
import { dewormings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { dewormingSchema } from "@/lib/validations/dewormings";
import { getAnimalById } from "@/lib/queries/animals";
import { revalidatePath } from "next/cache";
import type { ActionResult, Deworming } from "@/types";

export async function createDeworming(
  _prevState: ActionResult<Deworming> | null,
  formData: FormData,
): Promise<ActionResult<Deworming>> {
  const permCheck = await requirePermission("medical:first_check");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const raw = {
    animalId: formData.get("animalId"),
    // Story 10.31: ontbrekende categorie = ontworming (schema-default).
    category: (formData.get("category") as string) || undefined,
    type: (formData.get("type") as string) || "",
    date: (formData.get("date") as string) || "",
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = dewormingSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const animal = await getAnimalById(parsed.data.animalId);
  if (!animal) {
    return { success: false, error: "Dier niet gevonden" };
  }

  try {
    const [record] = await db
      .insert(dewormings)
      .values({
        animalId: parsed.data.animalId,
        category: parsed.data.category,
        type: parsed.data.type.trim(),
        date: parsed.data.date,
        notes: parsed.data.notes || null,
      })
      .returning();

    await logAudit("create_deworming", "deworming", record.id, null, record);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: record as Deworming };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}

export async function deleteDeworming(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const permCheck = await requirePermission("medical:first_check");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) {
    return { success: false, error: "Ongeldig ontworming-ID" };
  }

  try {
    const [existing] = await db
      .select()
      .from(dewormings)
      .where(eq(dewormings.id, id))
      .limit(1);
    if (!existing) return { success: false, error: "Ontworming niet gevonden" };

    await db.delete(dewormings).where(eq(dewormings.id, id));

    await logAudit("delete_deworming", "deworming", existing.id, existing, null);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het verwijderen. Probeer het later opnieuw.",
    };
  }
}
