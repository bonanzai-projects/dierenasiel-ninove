import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";

/**
 * Tabellen die nooit mee bewaard of hersteld worden.
 *
 * - `audit_logs` is een logboek, geen toestand. Het terugdraaien ervan zou net
 *   het spoor wissen waarvoor het bestaat — en het is ook 85% van alle gegevens.
 * - `database_backups` bevat de bewaarde momenten zelf; die mogen niet verdwijnen
 *   wanneer je er eentje terugzet.
 */
export const EXCLUDED_TABLES = ["audit_logs", "database_backups"] as const;

export type BackupTable = { name: string; table: PgTable };

/** Alle tabellen uit het schema die in een momentopname horen, op naam gesorteerd. */
export function backupTables(): BackupTable[] {
  const uitgesloten = new Set<string>(EXCLUDED_TABLES);

  return (Object.values(schema) as unknown[])
    .filter((waarde): waarde is PgTable => waarde instanceof PgTable)
    .map((table) => ({ name: getTableConfig(table).name, table }))
    .filter(({ name }) => !uitgesloten.has(name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Zet de tabellen in een volgorde waarin ze ingevoegd kunnen worden: een tabel
 * komt pas nadat alles waarnaar ze verwijst er staat (topologische sortering).
 * Bij gelijke stand wint de alfabetische volgorde, zodat het resultaat vast ligt.
 */
export function orderedForInsert(tables: BackupTable[]): BackupTable[] {
  const aanwezig = new Set(tables.map((t) => t.name));

  const wachtOp = new Map<string, Set<string>>();
  for (const { name, table } of tables) {
    const doelen = getTableConfig(table)
      .foreignKeys.map((fk) => getTableConfig(fk.reference().foreignTable).name)
      // Verwijzingen naar zichzelf of naar een uitgesloten tabel leggen geen
      // volgorde op: die rijen komen in dezelfde invoegbeurt mee.
      .filter((doel) => doel !== name && aanwezig.has(doel));
    wachtOp.set(name, new Set(doelen));
  }

  const opNaam = new Map(tables.map((t) => [t.name, t]));
  const resultaat: BackupTable[] = [];
  const gedaan = new Set<string>();

  while (resultaat.length < tables.length) {
    const klaar = [...wachtOp.entries()]
      .filter(([name, doelen]) => !gedaan.has(name) && [...doelen].every((d) => gedaan.has(d)))
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b));

    if (klaar.length === 0) {
      // Kringverwijzing: geef de rest in alfabetische volgorde terug in plaats
      // van vast te lopen. Het schema heeft er vandaag geen.
      for (const { name } of tables) {
        if (!gedaan.has(name)) {
          gedaan.add(name);
          resultaat.push(opNaam.get(name)!);
        }
      }
      break;
    }

    for (const name of klaar) {
      gedaan.add(name);
      resultaat.push(opNaam.get(name)!);
    }
  }

  return resultaat;
}
