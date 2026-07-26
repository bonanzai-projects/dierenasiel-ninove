import { describe, it, expect } from "vitest";
import { matchAnimals, normalizeChip, type LocalAnimalRef } from "./match";
import type { AnimalShelterAnimal } from "./types";

/**
 * Story 11.2 — koppelen van een extern dier aan onze fiche.
 * Uitgangspunt uit de meting van 2026-07-26: 53 extern, 23 lokaal, 7 matchen op chip.
 * "Bestaat enkel bij AnimalShelter" is dus de hoofdmoot, geen randgeval.
 */

function extern(over: Partial<AnimalShelterAnimal> & { id: number }): AnimalShelterAnimal {
  return {
    nummer: null, categorie: "dogs", identificatie: null, referentie: null, naam: "Naamloos",
    ras: null, geslacht: null, gecastreerd: null, geboortedatum: null, leeftijd: null,
    leeftijdscategorie: null, hoofdbeeld: null, extra_beelden: [], publish: null,
    publishonwebsite: null, adoptie: null, reserved: null, checkin_date: null,
    checkin_reason: null, checkout_reason: null, korte_beschrijving_nl: null,
    beschrijving_nl: null, properties: null,
    ...over,
  } as AnimalShelterAnimal;
}

function lokaal(over: Partial<LocalAnimalRef> & { id: number }): LocalAnimalRef {
  return { name: "Naamloos", identificationNr: null, dossierNr: null, species: "hond", ...over };
}

describe("normalizeChip", () => {
  it("houdt alleen de cijfers over", () => {
    expect(normalizeChip("967000010354571")).toBe("967000010354571");
    expect(normalizeChip("967 000 010 354 571")).toBe("967000010354571");
    expect(normalizeChip("967.000.010.354.571")).toBe("967000010354571");
  });

  it("verdraagt het tab-teken dat in onze eigen database staat", () => {
    // Shana heeft lokaal een tab vóór haar chipnummer (meting 2026-07-26).
    expect(normalizeChip("\t981100004506772")).toBe("981100004506772");
  });

  it("geeft een lege string voor niets bruikbaars", () => {
    expect(normalizeChip(null)).toBe("");
    expect(normalizeChip("")).toBe("");
    expect(normalizeChip("   ")).toBe("");
    expect(normalizeChip("-")).toBe("");
  });
});

describe("matchAnimals", () => {
  it("koppelt op chipnummer", () => {
    const result = matchAnimals(
      [extern({ id: 900, identificatie: "967000010599906", naam: "Gaston" })],
      [lokaal({ id: 309, name: "Gaston", identificationNr: "967000010599906" })],
    );

    expect(result.gekoppeld).toEqual([
      expect.objectContaining({ externalId: 900, animalId: 309, method: "chip" }),
    ]);
    expect(result.enkelExtern).toEqual([]);
    expect(result.enkelLokaal).toEqual([]);
  });

  it("koppelt ondanks opmaakverschillen in het chipnummer", () => {
    const result = matchAnimals(
      [extern({ id: 900, identificatie: "981100004506772" })],
      [lokaal({ id: 315, identificationNr: "\t981100004506772" })],
    );
    expect(result.gekoppeld[0]).toMatchObject({ animalId: 315, method: "chip" });
  });

  it("koppelt NOOIT twee dieren zonder chip aan elkaar", () => {
    const result = matchAnimals(
      [extern({ id: 901, naam: "Varken (vondeling)", identificatie: null })],
      [lokaal({ id: 307, name: "Joske", identificationNr: null })],
    );

    expect(result.gekoppeld).toEqual([]);
    expect(result.enkelExtern.map((a) => a.id)).toEqual([901]);
    expect(result.enkelLokaal.map((a) => a.id)).toEqual([307]);
  });

  it("koppelt niet op naam alleen — gelijke namen zeggen niets", () => {
    const result = matchAnimals(
      [extern({ id: 902, naam: "Rocky", identificatie: "111111111111111" })],
      [lokaal({ id: 294, name: "Rocky", identificationNr: null })],
    );
    expect(result.gekoppeld).toEqual([]);
  });

  it("valt terug op het dossiernummer wanneer er geen chip is", () => {
    const result = matchAnimals(
      [extern({ id: 903, nummer: 2602087, identificatie: null })],
      [lokaal({ id: 311, name: "Foxy", dossierNr: "2602087" })],
    );
    expect(result.gekoppeld[0]).toMatchObject({ animalId: 311, method: "nummer" });
  });

  it("geeft voorrang aan de chip boven het dossiernummer", () => {
    const result = matchAnimals(
      [extern({ id: 904, nummer: 2602087, identificatie: "999000000000001" })],
      [
        lokaal({ id: 1, dossierNr: "2602087" }),
        lokaal({ id: 2, identificationNr: "999000000000001" }),
      ],
    );
    expect(result.gekoppeld[0]).toMatchObject({ animalId: 2, method: "chip" });
  });

  it("koppelt niets automatisch bij een dubbel chipnummer, maar meldt het", () => {
    const result = matchAnimals(
      [extern({ id: 905, identificatie: "123456789012345" })],
      [
        lokaal({ id: 10, name: "Eerste", identificationNr: "123456789012345" }),
        lokaal({ id: 11, name: "Tweede", identificationNr: "123456789012345" }),
      ],
    );

    expect(result.gekoppeld).toEqual([]);
    expect(result.ambigu).toHaveLength(1);
    expect(result.ambigu[0].kandidaten.map((k) => k.id)).toEqual([10, 11]);
  });

  it("gebruikt hetzelfde lokale dier nooit twee keer", () => {
    const result = matchAnimals(
      [
        extern({ id: 906, identificatie: "555000000000001" }),
        extern({ id: 907, nummer: 4242, identificatie: null }),
      ],
      [lokaal({ id: 50, identificationNr: "555000000000001", dossierNr: "4242" })],
    );

    expect(result.gekoppeld).toHaveLength(1);
    expect(result.gekoppeld[0]).toMatchObject({ externalId: 906, animalId: 50 });
    expect(result.enkelExtern.map((a) => a.id)).toEqual([907]);
  });

  it("laat een bewaarde koppeling voorgaan op elke gok", () => {
    const result = matchAnimals(
      [extern({ id: 908, identificatie: "777000000000001" })],
      [
        lokaal({ id: 60, identificationNr: "777000000000001" }),
        lokaal({ id: 61, identificationNr: null }),
      ],
      [{ externalId: 908, animalId: 61, status: "gekoppeld" }],
    );

    expect(result.gekoppeld[0]).toMatchObject({ animalId: 61, method: "handmatig" });
    expect(result.enkelLokaal.map((a) => a.id)).toEqual([60]);
  });

  it("zet een bewust genegeerd extern dier apart", () => {
    const result = matchAnimals(
      [extern({ id: 909, identificatie: "888000000000001" })],
      [lokaal({ id: 70, identificationNr: "888000000000001" })],
      [{ externalId: 909, animalId: null, status: "genegeerd" }],
    );

    expect(result.genegeerd.map((a) => a.id)).toEqual([909]);
    expect(result.gekoppeld).toEqual([]);
    expect(result.enkelExtern).toEqual([]);
    expect(result.enkelLokaal.map((a) => a.id)).toEqual([70]);
  });

  it("negeert een bewaarde koppeling naar een dier dat niet meer bestaat", () => {
    const result = matchAnimals(
      [extern({ id: 910, identificatie: "999000000000009" })],
      [lokaal({ id: 80, identificationNr: "999000000000009" })],
      [{ externalId: 910, animalId: 999, status: "gekoppeld" }],
    );
    expect(result.gekoppeld[0]).toMatchObject({ animalId: 80, method: "chip" });
  });

  it("verwerkt de volledige situatie van 26/07: veel extern, weinig lokaal", () => {
    const result = matchAnimals(
      [
        extern({ id: 1, identificatie: "111111111111111" }),
        extern({ id: 2, identificatie: "222222222222222" }),
        extern({ id: 3, identificatie: null }),
      ],
      [
        lokaal({ id: 100, identificationNr: "111111111111111" }),
        lokaal({ id: 101, identificationNr: null, name: "Demo-dier" }),
      ],
    );

    expect(result.gekoppeld).toHaveLength(1);
    expect(result.enkelExtern.map((a) => a.id)).toEqual([2, 3]);
    expect(result.enkelLokaal.map((a) => a.id)).toEqual([101]);
    expect(result.samenvatting).toEqual({
      gekoppeld: 1, enkelExtern: 2, enkelLokaal: 1, ambigu: 0, genegeerd: 0,
    });
  });
});
