import { describe, it, expect } from "vitest";
import {
  sortBehaviorRecordsAsc,
  behaviorAnswer,
  buildBehaviorColumns,
  chunkBehaviorColumns,
  behaviorRecorder,
} from "./behavior-report-format";

describe("sortBehaviorRecordsAsc", () => {
  it("sorts records ascending by date (oldest first)", () => {
    const records = [
      { id: 3, date: "2026-03-01" },
      { id: 1, date: "2026-01-15" },
      { id: 2, date: "2026-02-10" },
    ];
    const sorted = sortBehaviorRecordsAsc(records);
    expect(sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const records = [
      { id: 2, date: "2026-02-10" },
      { id: 1, date: "2026-01-15" },
    ];
    const copy = [...records];
    sortBehaviorRecordsAsc(records);
    expect(records).toEqual(copy);
  });

  it("keeps original order for equal dates (stable)", () => {
    const records = [
      { id: 1, date: "2026-01-15" },
      { id: 2, date: "2026-01-15" },
      { id: 3, date: "2026-01-15" },
    ];
    const sorted = sortBehaviorRecordsAsc(records);
    expect(sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("returns empty array for empty input", () => {
    expect(sortBehaviorRecordsAsc([])).toEqual([]);
  });
});

describe("behaviorAnswer", () => {
  const checklist = {
    verzorgers_algemeenAgressief: true,
    verzorgers_speeltGraag: false,
    verzorgers_agressiefMand: null,
  };

  it("returns 'Ja' for true", () => {
    expect(behaviorAnswer(checklist, "verzorgers_algemeenAgressief")).toBe("Ja");
  });

  it("returns 'Nee' for false", () => {
    expect(behaviorAnswer(checklist, "verzorgers_speeltGraag")).toBe("Nee");
  });

  it("returns '' for null", () => {
    expect(behaviorAnswer(checklist, "verzorgers_agressiefMand")).toBe("");
  });

  it("returns '' for a missing key", () => {
    expect(behaviorAnswer(checklist, "honden_speeltGraag")).toBe("");
  });

  it("returns '' when checklist is null/undefined", () => {
    expect(behaviorAnswer(null, "verzorgers_algemeenAgressief")).toBe("");
    expect(behaviorAnswer(undefined, "verzorgers_algemeenAgressief")).toBe("");
  });
});

describe("buildBehaviorColumns", () => {
  it("sorts records ascending and pads to the minimum column count", () => {
    const records = [
      { id: 2, date: "2026-02-10" },
      { id: 1, date: "2026-01-15" },
    ];
    const columns = buildBehaviorColumns(records, 5);
    expect(columns).toHaveLength(5);
    expect(columns[0]?.id).toBe(1);
    expect(columns[1]?.id).toBe(2);
    expect(columns.slice(2)).toEqual([null, null, null]);
  });

  it("returns only null columns for an empty record list (blanco formulier)", () => {
    expect(buildBehaviorColumns([], 5)).toEqual([null, null, null, null, null]);
  });

  it("does not pad when there are more records than the minimum", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      date: `2026-01-0${i + 1}`,
    }));
    const columns = buildBehaviorColumns(records, 5);
    expect(columns).toHaveLength(7);
    expect(columns.every((c) => c !== null)).toBe(true);
  });

  it("does not mutate the input array", () => {
    const records = [
      { id: 2, date: "2026-02-10" },
      { id: 1, date: "2026-01-15" },
    ];
    const copy = [...records];
    buildBehaviorColumns(records, 5);
    expect(records).toEqual(copy);
  });
});

describe("chunkBehaviorColumns", () => {
  it("returns a single block when the columns fit", () => {
    const columns = buildBehaviorColumns([], 5);
    const blocks = chunkBehaviorColumns(columns, 10);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveLength(5);
  });

  it("splits into blocks of at most maxPerBlock columns", () => {
    const records = Array.from({ length: 23 }, (_, i) => ({
      id: i + 1,
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    }));
    const blocks = chunkBehaviorColumns(buildBehaviorColumns(records, 5), 10);
    expect(blocks.map((b) => b.length)).toEqual([10, 10, 3]);
    expect(blocks[0][0]?.id).toBe(1);
    expect(blocks[2][2]?.id).toBe(23);
  });

  it("always returns at least one block, even for no columns", () => {
    expect(chunkBehaviorColumns([], 10)).toEqual([[]]);
  });
});

// Story 10.54 (Sven): wie de fiche invulde hoort op het rapport.
describe("behaviorRecorder", () => {
  it("geeft de naam van wie de fiche invulde", () => {
    expect(behaviorRecorder({ recordedByName: "Sven" })).toBe("Sven");
  });

  it("geeft niets terug voor een lege kolom van het blanco formulier", () => {
    expect(behaviorRecorder(null)).toBe("");
    expect(behaviorRecorder(undefined)).toBe("");
  });

  it("geeft niets terug wanneer de invuller onbekend is", () => {
    expect(behaviorRecorder({ recordedByName: null })).toBe("");
    expect(behaviorRecorder({})).toBe("");
  });

  it("laat spaties rond de naam vallen", () => {
    expect(behaviorRecorder({ recordedByName: "  Katrien  " })).toBe("Katrien");
  });
});
