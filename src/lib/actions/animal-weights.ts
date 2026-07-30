"use server";

import { db } from "@/lib/db";
import { animalWeights } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { animalWeightSchema } from "@/lib/validations/animal-weights";
import { getAnimalById } from "@/lib/queries/animals";
import { revalidatePath } from "next/cache";
import type { ActionResult, AnimalWeight } from "@/types";

/**
 * Registreer een weging. Bewust `animal:write` en niet een medisch recht:
 * een dier op de weegschaal zetten is verzorgingswerk, geen medische handeling.
 */
export async function createAnimalWeight(
  _prevState: ActionResult<AnimalWeight> | null,
  formData: FormData,
): Promise<ActionResult<AnimalWeight>> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const parsed = animalWeightSchema.safeParse({
    animalId: formData.get("animalId"),
    date: (formData.get("date") as string) || "",
    weightKg: (formData.get("weightKg") as string) || "",
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const animal = await getAnimalById(parsed.data.animalId);
  if (!animal) {
    return { success: false, error: "Dier niet gevonden" };
  }

  const session = await getSession();

  try {
    const [record] = await db
      .insert(animalWeights)
      .values({
        animalId: parsed.data.animalId,
        date: parsed.data.date,
        // numeric() verwacht tekst; het punt is het decimaalteken van de databank.
        weightKg: String(parsed.data.weightKg),
        notes: parsed.data.notes ?? null,
        recordedBy: session?.userId ?? null,
      })
      .returning();

    await logAudit("create_animal_weight", "animal_weight", record.id, null, record);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: record as AnimalWeight };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}

export async function deleteAnimalWeight(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) {
    return { success: false, error: "Ongeldige weging" };
  }

  try {
    const [existing] = await db
      .select()
      .from(animalWeights)
      .where(eq(animalWeights.id, id))
      .limit(1);
    if (!existing) return { success: false, error: "Weging niet gevonden" };

    await db.delete(animalWeights).where(eq(animalWeights.id, id));

    await logAudit("delete_animal_weight", "animal_weight", existing.id, existing, null);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het verwijderen. Probeer het later opnieuw.",
    };
  }
}
