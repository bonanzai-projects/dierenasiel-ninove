import { describe, it, expect } from "vitest";
import { animalTraitsSchema } from "./animal-traits";

const valid = {
  animalId: 1,
  traits: { zindelijk: "ja", katten: "nee", tuin_nodig: "niet_gekend" },
};

describe("animalTraitsSchema", () => {
  it("accepteert een geldig dossier", () => {
    const result = animalTraitsSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepteert een lege traits-set (alles nog niet gekend)", () => {
    const result = animalTraitsSchema.safeParse({ animalId: 1, traits: {} });
    expect(result.success).toBe(true);
  });

  it("coerceert een animalId uit een formulier", () => {
    const result = animalTraitsSchema.safeParse({ ...valid, animalId: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.animalId).toBe(3);
  });

  it("weigert een ongeldig animalId", () => {
    const result = animalTraitsSchema.safeParse({ ...valid, animalId: 0 });
    expect(result.success).toBe(false);
  });

  it("weigert een onbekende waarde", () => {
    const result = animalTraitsSchema.safeParse({
      animalId: 1,
      traits: { zindelijk: "misschien" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.traits).toBeDefined();
    }
  });

  it("weigert een key die niet in ANIMAL_TRAITS staat", () => {
    const result = animalTraitsSchema.safeParse({
      animalId: 1,
      traits: { verzint_maar_wat: "ja" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.traits).toBeDefined();
    }
  });

  it("vult traits aan met een leeg object wanneer ze ontbreken", () => {
    const result = animalTraitsSchema.safeParse({ animalId: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.traits).toEqual({});
  });
});
