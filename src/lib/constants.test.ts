import { describe, expect, it } from "vitest";
import { INTAKE_REASONS, getIntakeReasonLabel } from "./constants";

describe("INTAKE_REASONS", () => {
  // Story 10.30: "Tijdelijke opvang" toegevoegd — komt overeen met "tijd opv"
  // in Sven's as-is asielrapport.
  it("bevat exact 4 opties in de juiste volgorde", () => {
    expect(INTAKE_REASONS).toHaveLength(4);
    expect(INTAKE_REASONS.map((r) => r.value)).toEqual([
      "afstand",
      "ibn",
      "zwerfhond",
      "tijdelijke_opvang",
    ]);
  });

  it("heeft de juiste Nederlandse labels", () => {
    const byValue = Object.fromEntries(
      INTAKE_REASONS.map((r) => [r.value, r.label]),
    );
    expect(byValue.afstand).toBe("Afstand door eigenaar");
    expect(byValue.ibn).toBe("Inbeslagname (IBN)");
    expect(byValue.zwerfhond).toBe("Vondeling");
    expect(byValue.tijdelijke_opvang).toBe("Tijdelijke opvang");
  });
});

describe("getIntakeReasonLabel", () => {
  it("retourneert het label voor alle hoofdwaarden", () => {
    expect(getIntakeReasonLabel("afstand")).toBe("Afstand door eigenaar");
    expect(getIntakeReasonLabel("ibn")).toBe("Inbeslagname (IBN)");
    expect(getIntakeReasonLabel("zwerfhond")).toBe("Vondeling");
    expect(getIntakeReasonLabel("tijdelijke_opvang")).toBe("Tijdelijke opvang");
  });

  it("retourneert '—' voor null, undefined en lege string", () => {
    expect(getIntakeReasonLabel(null)).toBe("—");
    expect(getIntakeReasonLabel(undefined)).toBe("—");
    expect(getIntakeReasonLabel("")).toBe("—");
  });

  it("retourneert '—' voor een onbekende waarde", () => {
    expect(getIntakeReasonLabel("onbekend")).toBe("—");
  });
});
