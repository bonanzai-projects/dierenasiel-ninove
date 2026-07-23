import { describe, it, expect } from "vitest";
import { derivePhaseForAnimal, type PhaseSourceAnimal } from "./backfill-workflow-phase";

function animal(overrides: Partial<PhaseSourceAnimal> = {}): PhaseSourceAnimal {
  return {
    isInShelter: true,
    isAvailableForAdoption: false,
    adoptedDate: null,
    outtakeDate: null,
    ...overrides,
  };
}

describe("derivePhaseForAnimal", () => {
  it("zet een geadopteerd dier op 'afgerond'", () => {
    expect(
      derivePhaseForAnimal(animal({ adoptedDate: "2026-05-12", outtakeDate: "2026-05-12", isInShelter: false })),
    ).toBe("afgerond");
  });

  it("zet een uitgestroomd dier (bv. euthanasie) op 'afgerond'", () => {
    expect(
      derivePhaseForAnimal(animal({ outtakeDate: "2026-05-21", isInShelter: false })),
    ).toBe("afgerond");
  });

  it("zet een dier dat het asiel verlaten heeft op 'afgerond', ook zonder datums", () => {
    expect(derivePhaseForAnimal(animal({ isInShelter: false }))).toBe("afgerond");
  });

  it("zet een dier dat ter adoptie staat op 'adoptie'", () => {
    expect(
      derivePhaseForAnimal(animal({ isAvailableForAdoption: true })),
    ).toBe("adoptie");
  });

  it("zet een dier in het asiel dat nog niet ter adoptie staat op 'verblijf'", () => {
    expect(derivePhaseForAnimal(animal())).toBe("verblijf");
  });

  it("laat uitstroom voorgaan op 'ter adoptie'", () => {
    // Een geadopteerd dier kan nog op 'ter adoptie' blijven staan in de data;
    // het dossier is dan wél afgerond.
    expect(
      derivePhaseForAnimal(animal({ isAvailableForAdoption: true, isInShelter: false, adoptedDate: "2026-05-04" })),
    ).toBe("afgerond");
  });

  it("gaat om met ontbrekende booleans (null uit de database)", () => {
    expect(
      derivePhaseForAnimal({
        isInShelter: null,
        isAvailableForAdoption: null,
        adoptedDate: null,
        outtakeDate: null,
      }),
    ).toBe("verblijf");
  });

  it("geeft altijd een geldige workflow-fase terug", () => {
    const geldig = ["intake", "registratie", "medisch", "verblijf", "adoptie", "afgerond"];
    const gevallen: PhaseSourceAnimal[] = [
      animal(),
      animal({ isAvailableForAdoption: true }),
      animal({ isInShelter: false }),
      animal({ adoptedDate: "2026-01-01" }),
    ];
    for (const a of gevallen) {
      expect(geldig).toContain(derivePhaseForAnimal(a));
    }
  });
});
