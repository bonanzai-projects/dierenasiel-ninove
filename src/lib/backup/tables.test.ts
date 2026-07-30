import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { backupTables, orderedForInsert, EXCLUDED_TABLES } from "./tables";

describe("backupTables", () => {
  it("neemt de tabellen van het schema mee", () => {
    const namen = backupTables().map((t) => t.name);
    expect(namen).toContain("animals");
    expect(namen).toContain("kennels");
    expect(namen).toContain("events");
    expect(namen.length).toBeGreaterThan(30);
  });

  it("laat het logboek en de bewaarde momenten zelf buiten beschouwing", () => {
    const namen = backupTables().map((t) => t.name);
    for (const uitgesloten of EXCLUDED_TABLES) {
      expect(namen).not.toContain(uitgesloten);
    }
  });

  it("bevat elke tabel exact één keer", () => {
    const namen = backupTables().map((t) => t.name);
    expect(new Set(namen).size).toBe(namen.length);
  });
});

describe("orderedForInsert", () => {
  const geordend = orderedForInsert(backupTables());
  const positie = new Map(geordend.map((t, i) => [t.name, i]));

  it("houdt alle tabellen over", () => {
    expect(geordend.length).toBe(backupTables().length);
  });

  it("zet elke tabel ná de tabellen waarnaar ze verwijst", () => {
    for (const { name, table } of geordend) {
      const doelen = getTableConfig(table).foreignKeys.map(
        (fk) => getTableConfig(fk.reference().foreignTable).name,
      );
      for (const doel of doelen) {
        if (doel === name || !positie.has(doel)) continue;
        expect(
          positie.get(doel)!,
          `${doel} moet vóór ${name} staan`,
        ).toBeLessThan(positie.get(name)!);
      }
    }
  });

  it("geeft dezelfde volgorde bij elke oproep", () => {
    const opnieuw = orderedForInsert(backupTables()).map((t) => t.name);
    expect(opnieuw).toEqual(geordend.map((t) => t.name));
  });

  it("kennels komt vóór animals, animals vóór vaccinations", () => {
    expect(positie.get("kennels")!).toBeLessThan(positie.get("animals")!);
    expect(positie.get("animals")!).toBeLessThan(positie.get("vaccinations")!);
  });
});
