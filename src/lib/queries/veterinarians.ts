import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { veterinarians } from "@/lib/db/schema";
import type { VeterinarianRow } from "@/lib/actions/veterinarians";

/** Story 10.81 — de dierenartsenlijst, op naam. */
export async function getVeterinarians(): Promise<VeterinarianRow[]> {
  return db.select().from(veterinarians).orderBy(asc(veterinarians.name));
}

export async function getVeterinarianById(id: number): Promise<VeterinarianRow | null> {
  const [rij] = await db.select().from(veterinarians).where(eq(veterinarians.id, id)).limit(1);
  return rij ?? null;
}
