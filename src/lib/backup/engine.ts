import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { backupTables, orderedForInsert } from "./tables";
import { prepareRowsForInsert, type Snapshot, type SnapshotRow } from "./snapshot";

/** Aantal rijen per invoegbeurt. Klein genoeg voor de Neon-verbinding. */
const BATCH = 100;

/** Leest elke tabel uit die in een momentopname hoort. */
export async function exportAllTables(): Promise<Record<string, SnapshotRow[]>> {
  const rijenPerTabel: Record<string, SnapshotRow[]> = {};
  for (const { name, table } of backupTables()) {
    rijenPerTabel[name] = (await db.select().from(table)) as SnapshotRow[];
  }
  return rijenPerTabel;
}

/**
 * Maakt alle tabellen van de momentopname leeg in één opdracht. CASCADE lost de
 * onderlinge verwijzingen op, ongeacht de volgorde. `database_backups` en
 * `audit_logs` zitten er niet bij en hebben geen verwijzingen, dus die blijven.
 */
export async function truncateAllTables(): Promise<void> {
  const namen = backupTables()
    .map((t) => `"${t.name}"`)
    .join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${namen} RESTART IDENTITY CASCADE`));
}

/**
 * Vult de tabellen opnieuw, in een volgorde waarin elke verwijzing al bestaat.
 * Geeft het aantal teruggezette rijen terug.
 */
export async function insertSnapshot(snapshot: Snapshot): Promise<number> {
  let hersteld = 0;

  for (const { name, table } of orderedForInsert(backupTables())) {
    const rijen = prepareRowsForInsert(table, snapshot.tables[name] ?? []);
    for (let i = 0; i < rijen.length; i += BATCH) {
      await db.insert(table).values(rijen.slice(i, i + BATCH));
    }
    hersteld += rijen.length;
    await resetSequences(table);
  }

  return hersteld;
}

/**
 * Zet de nummerteller van een tabel terug op het hoogste id. De rijen komen met
 * hun oorspronkelijke id terug, dus zonder dit zou de volgende toevoeging op een
 * bestaand nummer botsen.
 */
export async function resetSequences(table: PgTable): Promise<void> {
  const cfg = getTableConfig(table);
  const tellers = cfg.columns.filter((kolom) => kolom.getSQLType() === "serial");

  for (const kolom of tellers) {
    await db.execute(
      sql.raw(
        `SELECT setval(pg_get_serial_sequence('"${cfg.name}"', '${kolom.name}'), ` +
          `COALESCE((SELECT MAX("${kolom.name}") FROM "${cfg.name}"), 0) + 1, false)`,
      ),
    );
  }
}
