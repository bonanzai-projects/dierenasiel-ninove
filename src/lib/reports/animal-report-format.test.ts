import { describe, it, expect } from "vitest";
import {
  formatDateBE,
  sterielLabel,
  parseNeuteredValue,
  vaccinDisplay,
  redenOpvangDisplay,
  jaNee,
  okBlank,
  latestByAnimalId,
  latestByAnimalIdForCategory,
} from "./animal-report-format";

describe("formatDateBE", () => {
  it("formats an ISO date to DD-MM-YYYY", () => {
    expect(formatDateBE("2026-01-09")).toBe("09-01-2026");
  });
  it("returns empty string for null/empty", () => {
    expect(formatDateBE(null)).toBe("");
    expect(formatDateBE("")).toBe("");
    expect(formatDateBE(undefined)).toBe("");
  });
  it("returns the raw value if it is not an ISO date", () => {
    expect(formatDateBE("onbekend")).toBe("onbekend");
  });
});

describe("sterielLabel", () => {
  it("'Ja (asiel)' when neutered by the shelter", () => {
    expect(sterielLabel(true, true)).toBe("Ja (asiel)");
  });
  it("'Ja' when neutered but not by the shelter", () => {
    expect(sterielLabel(true, false)).toBe("Ja");
    expect(sterielLabel(true, null)).toBe("Ja");
  });
  it("'Nee' when explicitly not neutered", () => {
    expect(sterielLabel(false, null)).toBe("Nee");
    expect(sterielLabel(false, true)).toBe("Nee");
  });
  // Story 10.29: derde toestand — onbekend, zoals "??" in Sven's as-is rapport.
  it("'??' when unknown (null/undefined)", () => {
    expect(sterielLabel(null, null)).toBe("??");
    expect(sterielLabel(undefined, undefined)).toBe("??");
  });
});

describe("parseNeuteredValue", () => {
  it("parses the three radio values", () => {
    expect(parseNeuteredValue("true")).toBe(true);
    expect(parseNeuteredValue("false")).toBe(false);
    expect(parseNeuteredValue("onbekend")).toBe(null);
  });
  it("treats missing/empty/unknown input as unknown", () => {
    expect(parseNeuteredValue(null)).toBe(null);
    expect(parseNeuteredValue(undefined)).toBe(null);
    expect(parseNeuteredValue("")).toBe(null);
    expect(parseNeuteredValue("ja")).toBe(null);
  });
});

describe("vaccinDisplay", () => {
  it("appends '*' when given by the shelter", () => {
    expect(vaccinDisplay("2026-01-09", true)).toBe("09-01-2026 *");
  });
  it("no '*' when not given by the shelter", () => {
    expect(vaccinDisplay("2026-01-09", false)).toBe("09-01-2026");
  });
  it("empty when no vaccination date", () => {
    expect(vaccinDisplay(null, true)).toBe("");
    expect(vaccinDisplay(null, false)).toBe("");
  });
});

describe("redenOpvangDisplay", () => {
  it("combines reason label with formatted date", () => {
    expect(redenOpvangDisplay("afstand", "2025-08-04")).toBe("Afstand door eigenaar — 04-08-2025");
  });
  it("uses Vondeling label for zwerfhond value", () => {
    expect(redenOpvangDisplay("zwerfhond", "2026-01-20")).toBe("Vondeling — 20-01-2026");
  });
  it("reason only when no date", () => {
    expect(redenOpvangDisplay("ibn", null)).toBe("Inbeslagname (IBN)");
  });
  it("em-dash when neither reason nor date", () => {
    expect(redenOpvangDisplay(null, null)).toBe("—");
  });
  it("date only when reason missing", () => {
    expect(redenOpvangDisplay(null, "2025-08-04")).toBe("04-08-2025");
  });
});

describe("jaNee", () => {
  it("maps booleans to Ja/Nee", () => {
    expect(jaNee(true)).toBe("Ja");
    expect(jaNee(false)).toBe("Nee");
    expect(jaNee(null)).toBe("Nee");
  });
});

describe("okBlank", () => {
  it("'OK' when true, empty when false/null", () => {
    expect(okBlank(true)).toBe("OK");
    expect(okBlank(false)).toBe("");
    expect(okBlank(null)).toBe("");
  });
});

describe("latestByAnimalId", () => {
  it("picks the most recent row per animal regardless of input order", () => {
    const rows = [
      { animalId: 1, date: "2026-01-01", flag: "old" },
      { animalId: 1, date: "2026-03-01", flag: "new" },
      { animalId: 2, date: "2025-12-31", flag: "two" },
    ];
    const map = latestByAnimalId(rows);
    expect(map.get(1)?.flag).toBe("new");
    expect(map.get(2)?.flag).toBe("two");
    expect(map.size).toBe(2);
  });
  it("returns an empty map for no rows", () => {
    expect(latestByAnimalId([]).size).toBe(0);
  });
  it("keeps the first seen when dates are equal", () => {
    const rows = [
      { animalId: 5, date: "2026-01-01", flag: "first" },
      { animalId: 5, date: "2026-01-01", flag: "second" },
    ];
    expect(latestByAnimalId(rows).get(5)?.flag).toBe("first");
  });
});

// Story 10.31: ontworming en vlooienbehandeling delen één tabel, onderscheiden
// door `category`. De ontworming-kolom mag géén vlooien-datums oppikken.
describe("latestByAnimalIdForCategory", () => {
  const rows = [
    { animalId: 1, date: "2026-01-05", category: "ontworming" },
    { animalId: 1, date: "2026-03-20", category: "vlooien" },
    { animalId: 2, date: "2026-02-02", category: "vlooien" },
  ];

  it("only considers rows of the requested category", () => {
    const ontworming = latestByAnimalIdForCategory(rows, "ontworming");
    expect(ontworming.get(1)?.date).toBe("2026-01-05");
    expect(ontworming.has(2)).toBe(false);
  });

  it("picks the most recent row within the category", () => {
    const vlooien = latestByAnimalIdForCategory(
      [...rows, { animalId: 1, date: "2026-04-01", category: "vlooien" }],
      "vlooien",
    );
    expect(vlooien.get(1)?.date).toBe("2026-04-01");
    expect(vlooien.get(2)?.date).toBe("2026-02-02");
  });

  it("returns an empty map when nothing matches", () => {
    expect(latestByAnimalIdForCategory(rows, "onbestaand").size).toBe(0);
    expect(latestByAnimalIdForCategory([], "ontworming").size).toBe(0);
  });
});
