import { describe, it, expect } from "vitest";
import { kennelAnimalName } from "./animal-name";

describe("kennelAnimalName (Story 10.67)", () => {
  it("zet de echte naam vóór de schuilnaam — Sven: 'Felize/Marie'", () => {
    expect(kennelAnimalName({ name: "Marie", aliasName: "Feliz" })).toBe("Feliz/Marie");
  });

  it("toont enkel de schuilnaam wanneer er geen echte naam is", () => {
    expect(kennelAnimalName({ name: "Fons", aliasName: null })).toBe("Fons");
    expect(kennelAnimalName({ name: "Fons" })).toBe("Fons");
    expect(kennelAnimalName({ name: "Fons", aliasName: "" })).toBe("Fons");
    expect(kennelAnimalName({ name: "Fons", aliasName: "   " })).toBe("Fons");
  });

  it("laat spaties rond de namen weg", () => {
    expect(kennelAnimalName({ name: " Marie ", aliasName: " Feliz " })).toBe("Feliz/Marie");
  });

  it("toont een naam maar één keer wanneer beide gelijk zijn", () => {
    expect(kennelAnimalName({ name: "Marie", aliasName: "marie" })).toBe("Marie");
  });

  it("volgt de regel ook bij een voorlopige IBN-naam", () => {
    expect(kennelAnimalName({ name: "IBN Airedale Terriër", aliasName: "Pablo" })).toBe(
      "Pablo/IBN Airedale Terriër",
    );
  });
});
