import { db } from "@/lib/db";
import { animalTraits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AnimalTraits } from "@/lib/animals/animal-traits";

/**
 * Story 10.32: de opgeslagen eigenschappen van één dier. Geen rij = nog niets
 * ingevuld → leeg object, zodat de aanroepers geen null hoeven af te handelen.
 */
export async function getAnimalTraits(animalId: number): Promise<AnimalTraits> {
  try {
    const rows = await db
      .select({ traits: animalTraits.traits })
      .from(animalTraits)
      .where(eq(animalTraits.animalId, animalId))
      .limit(1);
    return rows[0]?.traits ?? {};
  } catch (err) {
    console.error("getAnimalTraits query failed:", err);
    return {};
  }
}
