import { db } from "@/lib/db";
import { databaseBackups } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export type BackupListItem = {
  id: number;
  label: string;
  createdAt: Date;
  createdByName: string | null;
  isAutomatic: boolean;
  rowCount: number;
  sizeBytes: number;
};

/**
 * De bewaarde momenten, nieuwste eerst. `content` blijft er bewust buiten:
 * dat is de volledige momentopname en die hoort niet in een lijstweergave.
 */
export async function getBackups(limit = 50): Promise<BackupListItem[]> {
  return db
    .select({
      id: databaseBackups.id,
      label: databaseBackups.label,
      createdAt: databaseBackups.createdAt,
      createdByName: databaseBackups.createdByName,
      isAutomatic: databaseBackups.isAutomatic,
      rowCount: databaseBackups.rowCount,
      sizeBytes: databaseBackups.sizeBytes,
    })
    .from(databaseBackups)
    .orderBy(desc(databaseBackups.createdAt))
    .limit(limit);
}
