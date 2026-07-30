import { db } from "@/lib/db";
import { behaviorRecords, users } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

/**
 * Kolommen van de fiche plus de naam van wie ze invulde (Story 10.54).
 * Bewust uitgeschreven i.p.v. `select()`: de naam komt uit een tweede tabel.
 */
const ficheMetInvuller = {
  id: behaviorRecords.id,
  animalId: behaviorRecords.animalId,
  date: behaviorRecords.date,
  checklist: behaviorRecords.checklist,
  notes: behaviorRecords.notes,
  recordedBy: behaviorRecords.recordedBy,
  createdAt: behaviorRecords.createdAt,
  recordedByName: users.name,
};

export async function getBehaviorRecordsByAnimalId(animalId: number) {
  try {
    const results = await db
      .select(ficheMetInvuller)
      .from(behaviorRecords)
      .leftJoin(users, eq(behaviorRecords.recordedBy, users.id))
      .where(eq(behaviorRecords.animalId, animalId))
      .orderBy(desc(behaviorRecords.date));
    return results;
  } catch (err) {
    console.error("getBehaviorRecordsByAnimalId query failed:", err);
    return [];
  }
}

export async function countBehaviorRecords(animalId: number): Promise<number> {
  try {
    const results = await db
      .select({ count: count() })
      .from(behaviorRecords)
      .where(eq(behaviorRecords.animalId, animalId));
    return Number(results[0]?.count ?? 0);
  } catch (err) {
    console.error("countBehaviorRecords query failed:", err);
    return 0;
  }
}

export async function getLatestBehaviorRecord(animalId: number) {
  try {
    const results = await db
      .select()
      .from(behaviorRecords)
      .where(eq(behaviorRecords.animalId, animalId))
      .orderBy(desc(behaviorRecords.date))
      .limit(1);
    return results[0] ?? null;
  } catch (err) {
    console.error("getLatestBehaviorRecord query failed:", err);
    return null;
  }
}
