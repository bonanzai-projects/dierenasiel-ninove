import { describe, it, expect } from "vitest";
import {
  WALK_REGULATIONS,
  WALK_REGULATIONS_VERSION,
  hasAcceptedCurrentRegulations,
  regulationsStatusLabel,
  walkRegulationsVersionLabel,
} from "./regulations";

// Story 10.77 — het wandelreglement van Sven (5 mei 2026), digitaal te aanvaarden.

describe("het reglement", () => {
  it("is de versie van 5 mei 2026, met Sven's nieuwe afspraken", () => {
    expect(WALK_REGULATIONS_VERSION).toBe("2026-05-05");
    expect(walkRegulationsVersionLabel()).toBe("5 mei 2026");
    const tekst = WALK_REGULATIONS.join("\n");
    expect(WALK_REGULATIONS).toHaveLength(18);
    expect(tekst).toContain("starten tussen 10 en 10u45");
    expect(tekst).toContain("boven de 24 graden");
    expect(tekst).toContain("minstens 1 wandelaar ons hesje te dragen");
    expect(tekst).toContain("NIET mogelijk om met verschillende honden samen te wandelen");
    expect(tekst).toContain("verkeersreglement");
    expect(tekst).toContain("wandelkaart onmiddellijk worden ingetrokken");
  });

  it("bevat de oude regels niet meer", () => {
    const tekst = WALK_REGULATIONS.join("\n");
    expect(tekst).not.toContain("11u30");
    expect(tekst).not.toContain("23 graden");
  });
});

describe("hasAcceptedCurrentRegulations", () => {
  it("is enkel waar voor de huidige versie", () => {
    expect(hasAcceptedCurrentRegulations({ regulationsVersion: "2026-05-05" })).toBe(true);
    expect(hasAcceptedCurrentRegulations({ regulationsVersion: "2025-01-01" })).toBe(false);
    expect(hasAcceptedCurrentRegulations({ regulationsVersion: null })).toBe(false);
  });
});

describe("regulationsStatusLabel", () => {
  it("toont datum en uur in Belgische tijd bij de huidige versie", () => {
    expect(
      regulationsStatusLabel({
        regulationsRead: true,
        regulationsVersion: "2026-05-05",
        regulationsAcceptedAt: new Date("2026-09-27T12:05:00Z"),
      }),
    ).toBe("Aanvaard op 27/09/2026 14:05 (versie van 5 mei 2026)");
  });

  it("zegt dat een oudere aanvaarding opnieuw gevraagd wordt", () => {
    expect(regulationsStatusLabel({ regulationsRead: true, regulationsVersion: null, regulationsAcceptedAt: null })).toBe(
      "Oudere versie aanvaard — wordt gevraagd bij de volgende aanmelding",
    );
  });

  it("zegt dat wie nooit aanvaardde, het bij de eerste aanmelding krijgt", () => {
    expect(regulationsStatusLabel({ regulationsRead: false, regulationsVersion: null, regulationsAcceptedAt: null })).toBe(
      "Nog niet aanvaard — wordt gevraagd bij de eerste aanmelding",
    );
  });
});
