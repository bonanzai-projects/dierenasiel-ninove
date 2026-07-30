import { describe, it, expect } from "vitest";
import { animals, kennels } from "@/lib/db/schema";
import {
  SNAPSHOT_VERSION,
  buildSnapshot,
  parseSnapshot,
  dateColumnsOf,
  columnNamesOf,
  prepareRowsForInsert,
  totalRows,
  tableCounts,
} from "./snapshot";

describe("buildSnapshot", () => {
  it("bundelt de rijen per tabel met een versie en een tijdstip", () => {
    const snapshot = buildSnapshot("2026-07-30T19:00:00.000Z", {
      kennels: [{ id: 1, code: "H1" }],
      animals: [],
    });

    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
    expect(snapshot.createdAt).toBe("2026-07-30T19:00:00.000Z");
    expect(snapshot.tables.kennels).toHaveLength(1);
    expect(snapshot.tables.animals).toEqual([]);
  });
});

describe("totalRows / tableCounts", () => {
  const snapshot = buildSnapshot("2026-07-30T19:00:00.000Z", {
    kennels: [{ id: 1 }, { id: 2 }],
    animals: [{ id: 1 }],
    walks: [],
  });

  it("telt alle rijen samen", () => {
    expect(totalRows(snapshot)).toBe(3);
  });

  it("geeft het aantal per tabel, zonder de lege tabellen", () => {
    expect(tableCounts(snapshot)).toEqual({ kennels: 2, animals: 1 });
  });
});

describe("parseSnapshot", () => {
  const geldig = JSON.stringify(
    buildSnapshot("2026-07-30T19:00:00.000Z", { kennels: [{ id: 1 }] }),
  );

  it("aanvaardt een geldige momentopname", () => {
    const result = parseSnapshot(geldig, ["kennels", "animals"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.tables.kennels).toHaveLength(1);
    expect(result.onbekendeTabellen).toEqual([]);
  });

  it("weigert onleesbare JSON", () => {
    const result = parseSnapshot("{niet json", ["kennels"]);
    expect(result.ok).toBe(false);
  });

  it("weigert een momentopname van een latere versie", () => {
    const toekomst = JSON.stringify({ version: 99, createdAt: "", tables: {} });
    const result = parseSnapshot(toekomst, ["kennels"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/versie/i);
  });

  it("weigert een momentopname zonder tabellen", () => {
    expect(parseSnapshot(JSON.stringify({ version: 1 }), ["kennels"]).ok).toBe(false);
  });

  it("weigert een tabel die geen lijst met rijen is", () => {
    const stuk = JSON.stringify({ version: 1, createdAt: "", tables: { kennels: 42 } });
    expect(parseSnapshot(stuk, ["kennels"]).ok).toBe(false);
  });

  it("slaat tabellen over die het schema niet meer kent, maar meldt ze", () => {
    const oud = JSON.stringify({
      version: 1,
      createdAt: "",
      tables: { kennels: [{ id: 1 }], oude_tabel: [{ id: 9 }] },
    });
    const result = parseSnapshot(oud, ["kennels"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.onbekendeTabellen).toEqual(["oude_tabel"]);
    expect(result.snapshot.tables.oude_tabel).toBeUndefined();
  });
});

describe("dateColumnsOf", () => {
  it("vindt de tijdstipkolommen van een tabel", () => {
    expect(dateColumnsOf(animals)).toContain("createdAt");
  });

  it("beschouwt een datumkolom (zonder uur) niet als tijdstip — die blijft tekst", () => {
    expect(dateColumnsOf(animals)).not.toContain("dateOfBirth");
  });
});

describe("columnNamesOf", () => {
  it("geeft de veldnamen zoals ze in de rijen staan", () => {
    const namen = columnNamesOf(kennels);
    expect(namen).toContain("id");
    expect(namen).toContain("code");
  });
});

describe("prepareRowsForInsert", () => {
  it("zet ISO-tijdstippen terug om naar echte datums", () => {
    const [rij] = prepareRowsForInsert(animals, [
      { id: 1, name: "Foxy", createdAt: "2026-07-30T19:00:00.000Z" },
    ]);
    expect(rij.createdAt).toBeInstanceOf(Date);
    expect((rij.createdAt as Date).toISOString()).toBe("2026-07-30T19:00:00.000Z");
  });

  it("laat null met rust", () => {
    const [rij] = prepareRowsForInsert(animals, [{ id: 1, createdAt: null }]);
    expect(rij.createdAt).toBeNull();
  });

  it("laat een datum zonder uur als tekst staan", () => {
    const [rij] = prepareRowsForInsert(animals, [{ id: 1, dateOfBirth: "2020-05-01" }]);
    expect(rij.dateOfBirth).toBe("2020-05-01");
  });

  it("laat kolommen vallen die het schema niet meer kent", () => {
    const [rij] = prepareRowsForInsert(animals, [
      { id: 1, name: "Foxy", verdwenen_kolom: "iets" },
    ]);
    expect(rij).not.toHaveProperty("verdwenen_kolom");
    expect(rij.name).toBe("Foxy");
  });

  it("verandert niets aan een lege lijst", () => {
    expect(prepareRowsForInsert(animals, [])).toEqual([]);
  });
});
