import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { adoptionContracts, adoptionUpdateFiles, adoptionUpdates, users } from "@/lib/db/schema";
import { fileKindFromMime, type AdoptionFileKind } from "@/lib/adoption-updates/rules";

/**
 * Story 10.74 — berichten en foto's na adoptie. Wat naar het scherm gaat, bevat
 * nooit de plaats in de private opslag (`pathname`): bestanden openen enkel via
 * `/api/adoptie/berichten/bestand/[id]`.
 */

export interface AdoptionUpdateFileView {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  kind: AdoptionFileKind;
}

export interface AdoptionUpdateView {
  id: number;
  receivedOn: string;
  channel: string;
  sender: string | null;
  message: string | null;
  createdByName: string | null;
  /** ISO-tijdstip. */
  createdAt: string;
  files: AdoptionUpdateFileView[];
}

interface BerichtRegel {
  id: number;
  receivedOn: string;
  channel: string;
  sender: string | null;
  message: string | null;
  createdByName: string | null;
  createdAt: Date;
}

interface BestandRegel {
  id: number;
  updateId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pathname?: string;
}

export function groupAdoptionUpdates(berichten: BerichtRegel[], bestanden: BestandRegel[]): AdoptionUpdateView[] {
  return berichten.map((b) => ({
    id: b.id,
    receivedOn: b.receivedOn,
    channel: b.channel,
    sender: b.sender,
    message: b.message,
    createdByName: b.createdByName,
    createdAt: b.createdAt.toISOString(),
    files: bestanden
      .filter((f) => f.updateId === b.id)
      .map((f) => ({
        id: f.id,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        kind: fileKindFromMime(f.mimeType),
      })),
  }));
}

/** Nieuwste eerst: op datum van het bericht, bij gelijke datum het laatst bewaarde bovenaan. */
export async function getAdoptionUpdatesByAnimalId(animalId: number): Promise<AdoptionUpdateView[]> {
  try {
    const berichten = await db
      .select({
        id: adoptionUpdates.id,
        receivedOn: adoptionUpdates.receivedOn,
        channel: adoptionUpdates.channel,
        sender: adoptionUpdates.sender,
        message: adoptionUpdates.message,
        createdByName: users.name,
        createdAt: adoptionUpdates.createdAt,
      })
      .from(adoptionUpdates)
      .leftJoin(users, eq(adoptionUpdates.createdBy, users.id))
      .where(eq(adoptionUpdates.animalId, animalId))
      .orderBy(desc(adoptionUpdates.receivedOn), desc(adoptionUpdates.createdAt));

    if (berichten.length === 0) return [];

    const bestanden = await db
      .select({
        id: adoptionUpdateFiles.id,
        updateId: adoptionUpdateFiles.updateId,
        fileName: adoptionUpdateFiles.fileName,
        mimeType: adoptionUpdateFiles.mimeType,
        fileSize: adoptionUpdateFiles.fileSize,
      })
      .from(adoptionUpdateFiles)
      .where(inArray(adoptionUpdateFiles.updateId, berichten.map((b) => b.id)))
      .orderBy(asc(adoptionUpdateFiles.id));

    return groupAdoptionUpdates(berichten, bestanden);
  } catch (err) {
    console.error("getAdoptionUpdatesByAnimalId query failed:", err);
    return [];
  }
}

/** Het meest recente contract van het dier dat niet geannuleerd is — of null. */
export async function getLatestContractIdForAnimal(animalId: number): Promise<number | null> {
  const rows = await db
    .select({ id: adoptionContracts.id })
    .from(adoptionContracts)
    .where(and(eq(adoptionContracts.animalId, animalId), ne(adoptionContracts.status, "geannuleerd")))
    .orderBy(desc(adoptionContracts.contractDate), desc(adoptionContracts.id))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Een bericht met de plaats van zijn bestanden in de opslag (om ze mee te verwijderen). */
export async function getAdoptionUpdateWithFiles(
  updateId: number,
): Promise<{ id: number; animalId: number; contractId: number | null; pathnames: string[] } | null> {
  const rows = await db
    .select({ id: adoptionUpdates.id, animalId: adoptionUpdates.animalId, contractId: adoptionUpdates.contractId })
    .from(adoptionUpdates)
    .where(eq(adoptionUpdates.id, updateId))
    .limit(1);
  const bericht = rows[0];
  if (!bericht) return null;

  const bestanden = await db
    .select({ pathname: adoptionUpdateFiles.pathname })
    .from(adoptionUpdateFiles)
    .where(eq(adoptionUpdateFiles.updateId, updateId));
  return { ...bericht, pathnames: bestanden.map((b) => b.pathname) };
}

/** Eén bestand, met het dier en contract van zijn bericht (voor rechten en verversen). */
export async function getAdoptionUpdateFile(fileId: number): Promise<{
  id: number;
  updateId: number;
  animalId: number;
  contractId: number | null;
  pathname: string;
  fileName: string;
  mimeType: string;
} | null> {
  const rows = await db
    .select({
      id: adoptionUpdateFiles.id,
      updateId: adoptionUpdateFiles.updateId,
      animalId: adoptionUpdates.animalId,
      contractId: adoptionUpdates.contractId,
      pathname: adoptionUpdateFiles.pathname,
      fileName: adoptionUpdateFiles.fileName,
      mimeType: adoptionUpdateFiles.mimeType,
    })
    .from(adoptionUpdateFiles)
    .innerJoin(adoptionUpdates, eq(adoptionUpdateFiles.updateId, adoptionUpdates.id))
    .where(eq(adoptionUpdateFiles.id, fileId))
    .limit(1);
  return rows[0] ?? null;
}
