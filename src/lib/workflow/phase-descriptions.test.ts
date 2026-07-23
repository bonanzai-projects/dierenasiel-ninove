import { describe, it, expect } from "vitest";
import { PHASE_DESCRIPTIONS, getPhaseDescription } from "./phase-descriptions";
import { WORKFLOW_PHASES } from "./phases";

describe("PHASE_DESCRIPTIONS", () => {
  // Vangnet: komt er ooit een fase bij, dan moet de uitleg mee — anders staat er
  // in de tooltip van die nieuwe fase niets.
  it("heeft voor elke workflow-fase een omschrijving", () => {
    for (const phase of WORKFLOW_PHASES) {
      expect(PHASE_DESCRIPTIONS[phase], `omschrijving ontbreekt voor "${phase}"`).toBeTruthy();
    }
  });

  it("bevat geen omschrijvingen voor onbestaande fases", () => {
    for (const key of Object.keys(PHASE_DESCRIPTIONS)) {
      expect(WORKFLOW_PHASES).toContain(key);
    }
  });

  it("houdt het bij één korte zin per fase", () => {
    for (const phase of WORKFLOW_PHASES) {
      expect(PHASE_DESCRIPTIONS[phase].length).toBeLessThanOrEqual(140);
    }
  });
});

describe("getPhaseDescription", () => {
  it("geeft de omschrijving van een gekende fase", () => {
    expect(getPhaseDescription("medisch")).toBe(PHASE_DESCRIPTIONS.medisch);
  });

  it("geeft een lege string voor een onbekende fase", () => {
    expect(getPhaseDescription("verzonnen")).toBe("");
  });
});
