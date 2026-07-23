"use server";

import { db } from "@/lib/db";
import { animalTraits } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { animalTraitsSchema } from "@/lib/validations/animal-traits";
import { ANIMAL_TRAITS } from "@/lib/animals/animal-traits";
import { getAnimalById } from "@/lib/queries/animals";
import { getAnimalTraits } from "@/lib/queries/animal-traits";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * Story 10.32: bewaart de omgangseigenschappen van een dier. Upsert op `animalId`
 * zodat de beheerder de sectie gewoon opnieuw kan opslaan. Waarden die op
 * "niet gekend" staan worden niet bewaard — een ontbrekende key betekent hetzelfde
 * en houdt de jsonb-kolom klein.
 */
export async function saveAnimalTraits(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const traits: Record<string, string> = {};
  for (const trait of ANIMAL_TRAITS) {
    const value = formData.get(`trait_${trait.key}`);
    if (typeof value === "string" && value !== "" && value !== "niet_gekend") {
      traits[trait.key] = value;
    }
  }

  const parsed = animalTraitsSchema.safeParse({
    animalId: formData.get("animalId"),
    traits,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const animal = await getAnimalById(parsed.data.animalId);
  if (!animal) {
    return { success: false, error: "Dier niet gevonden" };
  }

  const session = await getSession();

  // `partialRecord` levert optionele waarden op; de jsonb-kolom wil een gewone
  // Record<string, string>. Ontbrekende waarden bestaan hier niet (we bouwen de
  // map zelf), maar we filteren ze expliciet weg i.p.v. te casten.
  const traitsToSave: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data.traits)) {
    if (typeof value === "string") traitsToSave[key] = value;
  }

  try {
    const oldTraits = await getAnimalTraits(parsed.data.animalId);

    await db
      .insert(animalTraits)
      .values({
        animalId: parsed.data.animalId,
        traits: traitsToSave,
        updatedBy: session?.userId ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: animalTraits.animalId,
        set: {
          traits: traitsToSave,
          updatedBy: session?.userId ?? null,
          updatedAt: new Date(),
        },
      });

    await logAudit(
      "update_animal_traits",
      "animal",
      parsed.data.animalId,
      { traits: oldTraits },
      { traits: traitsToSave },
    );
    revalidatePath(`/beheerder/dieren/${parsed.data.animalId}`);

    return { success: true, data: undefined, message: "Eigenschappen opgeslagen." };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}
