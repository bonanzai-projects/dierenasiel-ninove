import { describe, it, expect } from "vitest";
import { getEntryCriteria, ENTRY_CRITERIA_LABELS } from "./entry-criteria";
import { WORKFLOW_PHASES } from "./phases";

describe("getEntryCriteria", () => {
  it("geeft geen voorwaarden voor de eerste fase", () => {
    expect(getEntryCriteria("intake", "hond")).toEqual([]);
  });

  it("geeft geen voorwaarden voor fases zonder controles", () => {
    expect(getEntryCriteria("registratie", "hond")).toEqual([]);
    expect(getEntryCriteria("medisch", "hond")).toEqual([]);
  });

  it("vraagt een chip vóór 'Verblijf'", () => {
    expect(getEntryCriteria("verblijf", "hond")).toEqual([
      "Chip-/identificatienummer is geregistreerd",
    ]);
  });

  it("vraagt voor katten chip, vaccinatie én sterilisatie vóór 'Adoptie'", () => {
    expect(getEntryCriteria("adoptie", "kat")).toEqual([
      "Chip-/identificatienummer is geregistreerd",
      "Vaccinatie is toegediend",
      "Sterilisatie/castratie is uitgevoerd",
    ]);
  });

  it("legt die kattenvoorwaarden niet op aan honden", () => {
    expect(getEntryCriteria("adoptie", "hond")).toEqual([]);
  });

  it("vraagt een adoptiecontract vóór 'Afgerond'", () => {
    expect(getEntryCriteria("afgerond", "hond")).toEqual([
      "Adoptiecontract is opgemaakt",
    ]);
  });

  // Vangnet: komt er een guard bij zonder leesbare omschrijving, dan valt dat
  // hier door de mand i.p.v. in een tooltip met technische taal te belanden.
  it("heeft voor elke gevonden voorwaarde een leesbare omschrijving", () => {
    for (const phase of WORKFLOW_PHASES) {
      for (const species of ["hond", "kat", "ander"]) {
        for (const criterium of getEntryCriteria(phase, species)) {
          expect(Object.values(ENTRY_CRITERIA_LABELS)).toContain(criterium);
        }
      }
    }
  });

  it("werkt zonder opgegeven soort (toont dan de soort-onafhankelijke controles)", () => {
    expect(getEntryCriteria("verblijf")).toEqual([
      "Chip-/identificatienummer is geregistreerd",
    ]);
    expect(getEntryCriteria("adoptie")).toEqual([]);
  });
});
