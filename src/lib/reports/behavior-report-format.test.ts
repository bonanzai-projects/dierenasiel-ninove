import { describe, it, expect } from "vitest";
import { sortBehaviorRecordsAsc, behaviorAnswer } from "./behavior-report-format";

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
