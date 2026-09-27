import { describe, it, expect } from "vitest";
import { R6_COLUMNS, r6Row } from "./adoptable-report";

// Story 10.73 (Sven): "reden van intake achter intake datum. beschrijf hoeft niet in overzicht".

const dier = {
  name: "Bo",
  species: "hond",
  breed: "Chow Chow",
  gender: "teef",
  status: "beschikbaar",
  identificationNr: "981000012345678",
  intakeDate: "2026-05-26",
  intakeReason: "ibn",
};

describe("R6_COLUMNS", () => {
  it("zet 'Reden intake' meteen na 'Intake datum' en toont geen beschrijving meer", () => {
    const koppen = R6_COLUMNS.map((k) => k.label);
    expect(koppen).toEqual(["Naam", "Soort", "Ras", "Geslacht", "Status", "Chipnr", "Intake datum", "Reden intake"]);
    expect(koppen).not.toContain("Beschrijving");
  });
});

describe("r6Row", () => {
  it("geeft leesbare waarden voor elke kolom", () => {
    expect(r6Row(dier)).toEqual({
      name: "Bo",
      species: "Hond",
      breed: "Chow Chow",
      gender: "Teef",
      status: "Beschikbaar",
      chip: "981000012345678",
      intakeDate: "2026-05-26",
      intakeReason: "Inbeslagname (IBN)",
    });
  });

  it("vertaalt elke intakereden naar haar label", () => {
    expect(r6Row({ ...dier, intakeReason: "afstand" }).intakeReason).toBe("Afstand door eigenaar");
    expect(r6Row({ ...dier, intakeReason: "zwerfhond" }).intakeReason).toBe("Vondeling");
    expect(r6Row({ ...dier, intakeReason: "tijdelijke_opvang" }).intakeReason).toBe("Tijdelijke opvang");
  });

  it("toont een streepje als iets niet ingevuld is, en een onbekende reden zoals ze is", () => {
    const leeg = r6Row({ ...dier, breed: null, identificationNr: null, intakeDate: null, intakeReason: null });
    expect(leeg.breed).toBe("-");
    expect(leeg.chip).toBe("-");
    expect(leeg.intakeDate).toBe("-");
    expect(leeg.intakeReason).toBe("-");
    expect(r6Row({ ...dier, intakeReason: "geboren" }).intakeReason).toBe("geboren");
  });
});
