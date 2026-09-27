"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adoptionUpdateFiles, adoptionUpdates } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { getAnimalById } from "@/lib/queries/animals";
import {
  getAdoptionUpdateFile,
  getAdoptionUpdateWithFiles,
  getLatestContractIdForAnimal,
} from "@/lib/queries/adoption-updates";
import { deletePrivateFiles } from "@/lib/adoption-updates/storage";
import { adoptionUpdateSchema, type AdoptionUpdateInput } from "@/lib/validations/adoption-updates";
import type { ActionResult } from "@/types";

/**
 * Story 10.74 (Sven) — berichten en foto's na adoptie. Bewaren en verwijderen
 * vraagt `adoption:write`; de bestanden zelf komen apart binnen via
 * `/api/adoptie/berichten/upload` (een Server Action aanvaardt maar 1 MB).
 */

function ververs(animalId: number, contractId: number | null) {
  revalidatePath(`/beheerder/dieren/${animalId}`);
  if (contractId) revalidatePath(`/beheerder/adoptie/contracten/${contractId}`);
}

export async function createAdoptionUpdate(input: AdoptionUpdateInput): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("adoption:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const parsed = adoptionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  }
  const d = parsed.data;

  const animal = await getAnimalById(d.animalId);
  if (!animal) return { success: false, error: "Dier niet gevonden." };

  try {
    const contractId = await getLatestContractIdForAnimal(d.animalId);
    const session = await getSession();
    const [rij] = await db
      .insert(adoptionUpdates)
      .values({
        animalId: d.animalId,
        contractId,
        receivedOn: d.receivedOn,
        channel: d.channel,
        sender: d.sender,
        message: d.message,
        createdBy: session?.userId ?? null,
      })
      .returning();

    await logAudit("adoption_update.create", "animal", d.animalId, null, {
      updateId: rij.id,
      channel: d.channel,
      receivedOn: d.receivedOn,
      fileCount: d.fileCount,
    });
    ververs(d.animalId, contractId);
    return { success: true, data: { id: rij.id } };
  } catch (err) {
    console.error("createAdoptionUpdate failed:", err);
    return { success: false, error: "Het bericht kon niet bewaard worden. Probeer opnieuw." };
  }
}

/**
 * Een bestand dat niet uit de opslag weg kan, houdt het verwijderen niet tegen:
 * het is privé (niet te openen zonder sleutel) en de fout staat in het serverlog.
 */
async function verwijderUitOpslag(pathnames: string[]) {
  try {
    await deletePrivateFiles(pathnames);
  } catch (err) {
    console.error("adoption-updates: verwijderen uit de private opslag mislukt:", pathnames, err);
  }
}

export async function deleteAdoptionUpdate(updateId: number): Promise<ActionResult> {
  const permCheck = await requirePermission("adoption:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const bericht = await getAdoptionUpdateWithFiles(updateId);
  if (!bericht) return { success: false, error: "Bericht niet gevonden." };

  await verwijderUitOpslag(bericht.pathnames);
  // De bestandsregels verdwijnen mee (ON DELETE CASCADE).
  await db.delete(adoptionUpdates).where(eq(adoptionUpdates.id, updateId));

  await logAudit("adoption_update.delete", "animal", bericht.animalId, { updateId, files: bericht.pathnames.length }, null);
  ververs(bericht.animalId, bericht.contractId);
  return { success: true, data: undefined };
}

export async function deleteAdoptionUpdateFile(fileId: number): Promise<ActionResult> {
  const permCheck = await requirePermission("adoption:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const bestand = await getAdoptionUpdateFile(fileId);
  if (!bestand) return { success: false, error: "Bestand niet gevonden." };

  await verwijderUitOpslag([bestand.pathname]);
  await db.delete(adoptionUpdateFiles).where(eq(adoptionUpdateFiles.id, fileId));

  await logAudit(
    "adoption_update.file_delete",
    "animal",
    bestand.animalId,
    { updateId: bestand.updateId, fileId, fileName: bestand.fileName },
    null,
  );
  ververs(bestand.animalId, bestand.contractId);
  return { success: true, data: undefined };
}
