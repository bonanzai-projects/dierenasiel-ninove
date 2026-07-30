import { db } from "@/lib/db";
import { animalWeights, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export type WeighingWithRecorder = {
  id: number;
  animalId: number;
  date: string;
  weightKg: string;
  notes: string | null;
  recordedBy: number | null;
  recordedByName: string | null;
};

/** Wegingen van één dier, recentste eerst, met de naam van wie woog. */
export async function getWeightsByAnimalId(animalId: number): Promise<WeighingWithRecorder[]> {
  try {
    return await db
      .select({
        id: animalWeights.id,
        animalId: animalWeights.animalId,
        date: animalWeights.date,
        weightKg: animalWeights.weightKg,
        notes: animalWeights.notes,
        recordedBy: animalWeights.recordedBy,
        recordedByName: users.name,
      })
      .from(animalWeights)
      .leftJoin(users, eq(animalWeights.recordedBy, users.id))
      .where(eq(animalWeights.animalId, animalId))
      .orderBy(desc(animalWeights.date), desc(animalWeights.id));
  } catch (err) {
    console.error("getWeightsByAnimalId query failed:", err);
    return [];
  }
}

/** Het laatst gewogen gewicht, of null. Gebruikt op de kennelkaart. */
export async function getLatestWeight(animalId: number): Promise<WeighingWithRecorder | null> {
  const wegingen = await getWeightsByAnimalId(animalId);
  return wegingen[0] ?? null;
}
