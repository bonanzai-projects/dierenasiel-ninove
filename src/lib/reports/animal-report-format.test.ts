import { describe, it, expect } from "vitest";
import {
  formatDateBE,
  sterielLabel,
  vaccinDisplay,
  redenOpvangDisplay,
  jaNee,
  okBlank,
  latestByAnimalId,
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
  it("'Nee' when not neutered (incl. null/unknown — gap: geen '??')", () => {
    expect(sterielLabel(false, null)).toBe("Nee");
    expect(sterielLabel(null, null)).toBe("Nee");
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
