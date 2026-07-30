import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

export const SNAPSHOT_VERSION = 1;

export type SnapshotRow = Record<string, unknown>;

export type Snapshot = {
  version: number;
  createdAt: string;
  tables: Record<string, SnapshotRow[]>;
};

export type ParseResult =
  | { ok: true; snapshot: Snapshot; onbekendeTabellen: string[] }
  | { ok: false; error: string };

export function buildSnapshot(
  createdAt: string,
  rowsByTable: Record<string, SnapshotRow[]>,
): Snapshot {
  return { version: SNAPSHOT_VERSION, createdAt, tables: rowsByTable };
}

export function totalRows(snapshot: Snapshot): number {
  return Object.values(snapshot.tables).reduce((som, rijen) => som + rijen.length, 0);
}

/** Aantal rijen per tabel; lege tabellen laten we weg om de lijst leesbaar te houden. */
export function tableCounts(snapshot: Snapshot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [naam, rijen] of Object.entries(snapshot.tables)) {
    if (rijen.length > 0) counts[naam] = rijen.length;
  }
  return counts;
}

/**
 * Leest een bewaarde momentopname en controleert of ze bruikbaar is.
 * Tabellen die het schema niet (meer) kent worden overgeslagen en gemeld,
 * zodat een oudere bewaring nog altijd teruggezet kan worden.
 */
export function parseSnapshot(json: string, bekendeTabellen: string[]): ParseResult {
  let ruw: unknown;
  try {
    ruw = JSON.parse(json);
  } catch {
    return { ok: false, error: "De bewaarde momentopname is onleesbaar." };
  }

  if (typeof ruw !== "object" || ruw === null) {
    return { ok: false, error: "De bewaarde momentopname is onleesbaar." };
  }

  const kandidaat = ruw as Partial<Snapshot>;

  if (typeof kandidaat.version !== "number" || kandidaat.version > SNAPSHOT_VERSION) {
    return {
      ok: false,
      error: `Deze momentopname is van een nieuwere versie (${kandidaat.version}) dan deze toepassing aankan.`,
    };
  }

  if (typeof kandidaat.tables !== "object" || kandidaat.tables === null) {
    return { ok: false, error: "De bewaarde momentopname bevat geen tabellen." };
  }

  const bekend = new Set(bekendeTabellen);
  const tables: Record<string, SnapshotRow[]> = {};
  const onbekendeTabellen: string[] = [];

  for (const [naam, rijen] of Object.entries(kandidaat.tables)) {
    if (!Array.isArray(rijen)) {
      return { ok: false, error: `De gegevens van tabel "${naam}" zijn beschadigd.` };
    }
    if (!bekend.has(naam)) {
      onbekendeTabellen.push(naam);
      continue;
    }
    tables[naam] = rijen as SnapshotRow[];
  }

  return {
    ok: true,
    snapshot: {
      version: kandidaat.version,
      createdAt: typeof kandidaat.createdAt === "string" ? kandidaat.createdAt : "",
      tables,
    },
    onbekendeTabellen,
  };
}

/** Veldnamen zoals ze in de bewaarde rijen staan (de sleutels, niet de SQL-kolomnamen). */
export function columnNamesOf(table: PgTable): string[] {
  return Object.keys(getTableColumns(table));
}

/**
 * De velden die een echt tijdstip bevatten. JSON kent geen datums, dus die
 * komen terug als tekst en moeten opnieuw een `Date` worden. Een `date`-kolom
 * (dag zonder uur) is in drizzle tekst en blijft dus met rust.
 */
export function dateColumnsOf(table: PgTable): string[] {
  const kolommen = getTableColumns(table) as Record<string, { dataType: string }>;
  return Object.entries(kolommen)
    .filter(([, kolom]) => kolom.dataType === "date")
    .map(([naam]) => naam);
}

/**
 * Maakt bewaarde rijen klaar om opnieuw ingevoegd te worden: onbekende velden
 * eruit (het schema kan intussen gewijzigd zijn) en tijdstippen terug naar `Date`.
 */
export function prepareRowsForInsert(
  table: PgTable,
  rows: SnapshotRow[],
): SnapshotRow[] {
  if (rows.length === 0) return [];

  const toegelaten = new Set(columnNamesOf(table));
  const tijdstippen = new Set(dateColumnsOf(table));

  return rows.map((rij) => {
    const nieuw: SnapshotRow = {};
    for (const [veld, waarde] of Object.entries(rij)) {
      if (!toegelaten.has(veld)) continue;
      nieuw[veld] =
        tijdstippen.has(veld) && typeof waarde === "string" ? new Date(waarde) : waarde;
    }
    return nieuw;
  });
}
