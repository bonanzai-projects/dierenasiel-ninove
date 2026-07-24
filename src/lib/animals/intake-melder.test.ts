import { describe, it, expect } from "vitest";
import { shouldCollectMelderDetails } from "./intake-melder";

describe("shouldCollectMelderDetails", () => {
  it("toont de melder-velden bij een inbeslagname (IBN)", () => {
    expect(
      shouldCollectMelderDetails({ intakeReason: "ibn", isPickedUpByShelter: false }),
    ).toBe(true);
  });

  it("toont de melder-velden bij een vondeling, ook zonder ophaling door het asiel", () => {
    // Sven-feedback 2026-07-24: ook als iemand het dier zelf komt brengen.
    expect(
      shouldCollectMelderDetails({ intakeReason: "zwerfhond", isPickedUpByShelter: false }),
    ).toBe(true);
  });

  it("toont de melder-velden zodra het asiel het dier is gaan ophalen", () => {
    expect(
      shouldCollectMelderDetails({ intakeReason: "afstand", isPickedUpByShelter: true }),
    ).toBe(true);
  });

  it("verbergt de melder-velden bij een afstand zonder ophaling", () => {
    expect(
      shouldCollectMelderDetails({ intakeReason: "afstand", isPickedUpByShelter: false }),
    ).toBe(false);
  });

  it("verbergt de melder-velden bij een tijdelijke opvang zonder ophaling", () => {
    expect(
      shouldCollectMelderDetails({ intakeReason: "tijdelijke_opvang", isPickedUpByShelter: false }),
    ).toBe(false);
  });

  it("gaat om met een ontbrekende reden", () => {
    expect(
      shouldCollectMelderDetails({ intakeReason: undefined, isPickedUpByShelter: false }),
    ).toBe(false);
    expect(
      shouldCollectMelderDetails({ intakeReason: null, isPickedUpByShelter: true }),
    ).toBe(true);
  });
});
