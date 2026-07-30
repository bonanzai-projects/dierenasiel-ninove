"use server";

import { db } from "@/lib/db";
import { databaseBackups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { backupTables } from "@/lib/backup/tables";
import {
  exportAllTables,
  truncateAllTables,
  insertSnapshot,
} from "@/lib/backup/engine";
import {
  buildSnapshot,
  parseSnapshot,
  tableCounts,
  totalRows,
} from "@/lib/backup/snapshot";
import { defaultBackupLabel, formatBytes } from "@/lib/backup/format";
import type { ActionResult } from "@/types";

/**
 * Leest alle tabellen uit en bewaart ze als één momentopname.
 * Wordt zowel door de knop als door het automatische veiligheidsnet gebruikt.
 */
async function maakMomentopname(
  label: string,
  automatisch: boolean,
): Promise<{ id: number; label: string; rowCount: number; sizeBytes: number }> {
  const session = await getSession();
  const nu = new Date();

  const snapshot = buildSnapshot(nu.toISOString(), await exportAllTables());
  const content = JSON.stringify(snapshot);
  const naam = defaultBackupLabel(label, nu);

  const [rij] = await db
    .insert(databaseBackups)
    .values({
      label: naam,
      createdAt: nu,
      createdByUserId: session?.userId ?? null,
      createdByName: session?.name ?? null,
      isAutomatic: automatisch,
      rowCount: totalRows(snapshot),
      sizeBytes: content.length,
      tableCounts: tableCounts(snapshot),
      content,
    })
    .returning({ id: databaseBackups.id });

  return {
    id: rij.id,
    label: naam,
    rowCount: totalRows(snapshot),
    sizeBytes: content.length,
  };
}

/** Bewaar de huidige toestand van de databank. */
export async function createBackup(label: string): Promise<ActionResult> {
  const permCheck = await requirePermission("settings:write");
  if (permCheck) return permCheck;

  try {
    const bewaard = await maakMomentopname(label, false);

    await logAudit("create_backup", "database_backup", bewaard.id, null, {
      label: bewaard.label,
      rowCount: bewaard.rowCount,
    });
    revalidatePath("/beheerder/instellingen");

    return {
      success: true,
      data: undefined,
      message: `Bewaard: ${bewaard.rowCount} rijen (${formatBytes(bewaard.sizeBytes)}).`,
    };
  } catch (err) {
    console.error("createBackup failed:", err);
    return { success: false, error: "Er ging iets mis bij het bewaren van de databank." };
  }
}

/**
 * Zet een bewaarde momentopname terug.
 *
 * Volgorde: eerst controleren of de momentopname leesbaar is, dan een
 * veiligheidskopie van de huidige toestand, en pas daarna wissen en vullen.
 * Zo blijft er altijd een weg terug, ook wanneer het terugzetten strandt.
 */
export async function restoreBackup(id: number): Promise<ActionResult> {
  const permCheck = await requirePermission("settings:write");
  if (permCheck) return permCheck;

  try {
    const [bewaring] = await db
      .select({
        id: databaseBackups.id,
        label: databaseBackups.label,
        content: databaseBackups.content,
        createdAt: databaseBackups.createdAt,
      })
      .from(databaseBackups)
      .where(eq(databaseBackups.id, id))
      .limit(1);

    if (!bewaring) {
      return { success: false, error: "Die bewaring bestaat niet (meer)." };
    }

    const tabellen = backupTables();
    const gelezen = parseSnapshot(
      bewaring.content,
      tabellen.map((t) => t.name),
    );
    if (!gelezen.ok) {
      return { success: false, error: gelezen.error };
    }

    // Veiligheidsnet: de huidige toestand blijft bewaard onder een eigen naam.
    await maakMomentopname(
      `Automatisch vóór het terugzetten van "${bewaring.label}"`,
      true,
    );

    await truncateAllTables();
    const hersteld = await insertSnapshot(gelezen.snapshot);

    await logAudit("restore_backup", "database_backup", bewaring.id, null, {
      label: bewaring.label,
      rowCount: hersteld,
    });
    revalidatePath("/");

    const overgeslagen = gelezen.onbekendeTabellen.length
      ? ` ${gelezen.onbekendeTabellen.length} tabel(len) uit de bewaring bestaan niet meer en zijn overgeslagen.`
      : "";

    return {
      success: true,
      data: undefined,
      message: `Teruggezet: ${hersteld} rijen uit "${bewaring.label}".${overgeslagen}`,
    };
  } catch (err) {
    console.error("restoreBackup failed:", err);
    return {
      success: false,
      error:
        "Het terugzetten is misgelopen. De toestand van vlak vóór het terugzetten " +
        "staat als automatische bewaring in de lijst.",
    };
  }
}

/** Verwijder een bewaarde momentopname. */
export async function deleteBackup(id: number): Promise<ActionResult> {
  const permCheck = await requirePermission("settings:write");
  if (permCheck) return permCheck;

  try {
    const [bewaring] = await db
      .select({ id: databaseBackups.id, label: databaseBackups.label })
      .from(databaseBackups)
      .where(eq(databaseBackups.id, id))
      .limit(1);

    if (!bewaring) {
      return { success: false, error: "Die bewaring bestaat niet (meer)." };
    }

    await db.delete(databaseBackups).where(eq(databaseBackups.id, id));

    await logAudit(
      "delete_backup",
      "database_backup",
      bewaring.id,
      { label: bewaring.label },
      null,
    );
    revalidatePath("/beheerder/instellingen");

    return { success: true, data: undefined, message: "De bewaring is verwijderd." };
  } catch (err) {
    console.error("deleteBackup failed:", err);
    return { success: false, error: "Er ging iets mis bij het verwijderen." };
  }
}
