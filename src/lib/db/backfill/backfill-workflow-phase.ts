import { db } from "@/lib/db";
import { animals } from "@/lib/db/schema";
import { isNull, eq } from "drizzle-orm";
import type { WorkflowPhase } from "@/lib/workflow/phases";

/**
 * Backfill: dieren die niet via het intakeformulier zijn aangemaakt hebben
 * `workflowPhase = NULL`. De stappenbalk wordt enkel getoond wanneer een dier
 * een fase heeft, dus voor die dieren is de workflow onzichtbaar én niet te
 * starten.
 *
 * We zetten ze niet allemaal op "intake": een geadopteerd dier zou dan aan het
 * begin van zijn traject verschijnen en de beheerder moet er vier keer op
 * "volgende fase" klikken om de werkelijkheid weer te geven. In de plaats
 * leiden we de fase af uit de toestand die al in de data zit.
 *
 * Idempotent: enkel rijen met `workflowPhase IS NULL` worden aangeraakt.
 * Er wordt bewust géén historiek geschreven — deze overgangen zijn niet door
 * een medewerker gezet.
 *
 * Uitvoeren via: `npm run db:backfill-workflow-phase`
 */

export interface PhaseSourceAnimal {
  isInShelter: boolean | null;
  isAvailableForAdoption: boolean | null;
  adoptedDate: string | null;
  outtakeDate: string | null;
}

/** Leidt de best passende fase af uit de huidige toestand van het dier. */
export function derivePhaseForAnimal(animal: PhaseSourceAnimal): WorkflowPhase {
  // Het dier is weg (geadopteerd, overleden, teruggegeven): dossier afgerond.
  if (animal.outtakeDate || animal.adoptedDate || animal.isInShelter === false) {
    return "afgerond";
  }
  // Staat te wachten op een adoptant.
  if (animal.isAvailableForAdoption) return "adoptie";
  // In het asiel, nog niet vrijgegeven voor adoptie.
  return "verblijf";
}

export async function backfillWorkflowPhase(): Promise<{
  scanned: number;
  updated: Record<string, number>;
}> {
  const rows = await db
    .select({
      id: animals.id,
      isInShelter: animals.isInShelter,
      isAvailableForAdoption: animals.isAvailableForAdoption,
      adoptedDate: animals.adoptedDate,
      outtakeDate: animals.outtakeDate,
    })
    .from(animals)
    .where(isNull(animals.workflowPhase));

  const updated: Record<string, number> = {};

  for (const row of rows) {
    const phase = derivePhaseForAnimal(row);
    await db.update(animals).set({ workflowPhase: phase }).where(eq(animals.id, row.id));
    updated[phase] = (updated[phase] ?? 0) + 1;
  }

  return { scanned: rows.length, updated };
}
