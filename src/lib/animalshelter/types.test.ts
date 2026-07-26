import { describe, it, expect } from "vitest";
import fixture from "./__fixtures__/animals.json";
import { animalShelterAnimalSchema, parseAnimalList } from "./types";

/**
 * Story 11.1 — de fixtures zijn echte responses van 2026-07-26 (ingekorte
 * beschrijvingen). Zie _bmad-output/implementation-artifacts/animalshelter-voorbeeldresponses/.
 */

const [rocky, felix, varken] = fixture;

describe("animalShelterAnimalSchema — op echte data", () => {
  it("aanvaardt een hond zoals AnimalShelter hem teruggeeft", () => {
    const parsed = animalShelterAnimalSchema.parse(rocky);
    expect(parsed.id).toBe(1880761);
    expect(parsed.nummer).toBe(2502157);
    expect(parsed.categorie).toBe("dogs");
    expect(parsed.identificatie).toBe("967000010354571");
    expect(parsed.geslacht).toBe("M");
    expect(parsed.checkin_date).toBe("04-08-2025");
  });

  it("aanvaardt een kat", () => {
    expect(animalShelterAnimalSchema.parse(felix).categorie).toBe("cats");
  });

  it("aanvaardt een dier zonder chip, zonder geboortedatum en zonder properties", () => {
    const parsed = animalShelterAnimalSchema.parse(varken);
    expect(parsed.identificatie).toBeNull();
    expect(parsed.geboortedatum).toBeNull();
    expect(parsed.properties).toBeNull();
    expect(parsed.geslacht).toBe("O");
  });

  it("houdt de extra beelden met hun volgorde bij", () => {
    const parsed = animalShelterAnimalSchema.parse(rocky);
    expect(parsed.extra_beelden[0].sortorder).toBe(0);
    expect(parsed.extra_beelden[0].image).toMatch(/^https:\/\//);
  });

  it("laat onbekende velden gewoon toe — hun API mag groeien zonder ons te breken", () => {
    expect(() =>
      animalShelterAnimalSchema.parse({ ...rocky, splinternieuw_veld: "iets" }),
    ).not.toThrow();
  });

  it("weigert een record zonder id of zonder categorie", () => {
    const { id: _id, ...zonderId } = rocky;
    expect(() => animalShelterAnimalSchema.parse(zonderId)).toThrow();
    expect(() => animalShelterAnimalSchema.parse({ ...rocky, categorie: "birds" })).toThrow();
  });
});

describe("parseAnimalList", () => {
  it("parseert de volledige lijst uit een categorie-oproep", () => {
    const dieren = parseAnimalList(fixture);
    expect(dieren).toHaveLength(3);
    expect(dieren.map((d) => d.naam)).toEqual(["Rocky", "Felix", "Varken (vondeling)"]);
  });

  it("geeft een lege lijst terug voor een lege categorie", () => {
    expect(parseAnimalList([])).toEqual([]);
  });

  it("gooit een duidelijke fout wanneer het antwoord geen lijst is", () => {
    expect(() => parseAnimalList({ data: [] })).toThrow(/lijst/i);
    expect(() => parseAnimalList(null)).toThrow(/lijst/i);
  });

  it("gooit wanneer één dier in de lijst niet klopt — liever niets dan half", () => {
    expect(() => parseAnimalList([rocky, { id: "geen getal" }])).toThrow();
  });
});
