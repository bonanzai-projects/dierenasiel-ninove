import { describe, it, expect } from "vitest";
import fixture from "./__fixtures__/animals.json";
import { animalShelterAnimalSchema, type AnimalShelterAnimal } from "./types";
import { buildAnimalInsert, buildImportPreview, buildUniqueSlug } from "./import";
import type { LocalAnimalRecord } from "./overview";

const [rocky, felix, varken] = fixture.map((a) => animalShelterAnimalSchema.parse(a));

function extern(over: Partial<AnimalShelterAnimal> & { id: number }): AnimalShelterAnimal {
  return { ...rocky, ...over } as AnimalShelterAnimal;
}

function lokaal(over: Partial<LocalAnimalRecord> & { id: number }): LocalAnimalRecord {
  return { name: "Naamloos", identificationNr: null, dossierNr: null, species: null, ...over };
}

const zoek = (lijst: ReturnType<typeof buildImportPreview>, id: number) =>
  lijst.find((k) => k.externalId === id)!;

/**
 * Story 11.8 — de 46 dieren die alleen bij AnimalShelter bestaan lokaal aanmaken.
 */

describe("buildUniqueSlug", () => {
  it("gebruikt de eenvoudige slug wanneer die vrij is", () => {
    expect(buildUniqueSlug("Rocky", new Set())).toBe("rocky");
  });

  it("telt door bij een botsing — vier katten heten 'Kitten'", () => {
    // `animals.slug` is uniek in het schema. Zonder dit crasht de import.
    const bezet = new Set<string>();
    const slugs = ["Kitten", "Kitten", "Kitten", "Kitten"].map((naam) => {
      const slug = buildUniqueSlug(naam, bezet);
      bezet.add(slug);
      return slug;
    });
    expect(slugs).toEqual(["kitten", "kitten-2", "kitten-3", "kitten-4"]);
  });

  it("houdt rekening met slugs die al in onze database staan", () => {
    expect(buildUniqueSlug("Rocky", new Set(["rocky", "rocky-2"]))).toBe("rocky-3");
  });

  it("valt terug op een bruikbare slug bij een naam zonder letters of cijfers", () => {
    expect(buildUniqueSlug("???", new Set())).toMatch(/^dier(-\d+)?$/);
  });
});

describe("buildImportPreview", () => {
  it("toont wat er zou aangemaakt worden", () => {
    const kandidaat = zoek(buildImportPreview([rocky], [], []), rocky.id);

    expect(kandidaat).toMatchObject({
      name: "Rocky",
      species: "hond",
      gender: "reu",
      chip: "967000010354571",
      intakeDate: "2025-08-04",
      slug: "rocky",
      blockers: [],
      vragen: [],
    });
  });

  it("vraagt de soort wanneer AnimalShelter alleen 'other' zegt", () => {
    const kandidaat = zoek(buildImportPreview([varken], [], []), varken.id);

    expect(kandidaat.species).toBeNull();
    expect(kandidaat.vragen).toContain("species");
  });

  it("vraagt het geslacht wanneer AnimalShelter 'O' doorgeeft", () => {
    const kandidaat = zoek(buildImportPreview([varken], [], []), varken.id);

    expect(kandidaat.gender).toBeNull();
    expect(kandidaat.vragen).toContain("gender");
  });

  it("blokkeert een dier waarvan het chipnummer al bij ons staat", () => {
    const kandidaat = zoek(
      buildImportPreview([rocky], [lokaal({ id: 5, identificationNr: "967000010354571" })], []),
      rocky.id,
    );

    expect(kandidaat.blockers[0]).toMatch(/chipnummer/i);
  });

  it("verdraagt opmaakverschillen in het chipnummer bij die controle", () => {
    const kandidaat = zoek(
      buildImportPreview([rocky], [lokaal({ id: 5, identificationNr: "\t967000010354571" })], []),
      rocky.id,
    );
    expect(kandidaat.blockers).toHaveLength(1);
  });

  it("blokkeert een dier dat al gekoppeld is", () => {
    const kandidaat = zoek(
      buildImportPreview([rocky], [], [{ externalId: rocky.id, animalId: 9, status: "gekoppeld" }]),
      rocky.id,
    );
    expect(kandidaat.blockers[0]).toMatch(/gekoppeld/i);
  });

  it("laat een bewust genegeerd dier weg uit de lijst", () => {
    const lijst = buildImportPreview(
      [rocky],
      [],
      [{ externalId: rocky.id, animalId: null, status: "genegeerd" }],
    );
    expect(lijst).toEqual([]);
  });

  it("geeft elk dier een eigen slug binnen dezelfde voorbeeldweergave", () => {
    const lijst = buildImportPreview(
      [extern({ id: 1, naam: "Kitten" }), extern({ id: 2, naam: "Kitten" })],
      [],
      [],
    );
    expect(lijst.map((k) => k.slug)).toEqual(["kitten", "kitten-2"]);
  });
});

describe("buildAnimalInsert", () => {
  it("vult de velden die we betrouwbaar kunnen mappen", () => {
    const waarden = buildAnimalInsert(rocky, {}, "rocky");

    expect(waarden).toMatchObject({
      name: "Rocky",
      slug: "rocky",
      species: "hond",
      gender: "reu",
      breed: "Canis Vulgaris",
      dateOfBirth: "2020-12-01",
      identificationNr: "967000010354571",
      intakeDate: "2025-08-04",
      intakeReason: "afstand",
      dossierNr: "2502157",
      isAvailableForAdoption: true,
      isOnWebsite: true,
    });
    expect(waarden.images).toHaveLength(2);
  });

  it("zet de beschrijving op een lege string, nooit op null", () => {
    // `animals.description` is NOT NULL — zie Story 10.39.
    expect(buildAnimalInsert(varken, { species: "hangbuikvarken", gender: "mannetje" }, "varken").description).toBe("");
  });

  it("zet de website-tekst in websiteDescription, niet in description", () => {
    const waarden = buildAnimalInsert(rocky, {}, "rocky");
    expect(waarden.websiteDescription).toContain("Rocky");
    expect(waarden.description).toBe("");
  });

  it("neemt de keuzes van de beheerder over voor soort en geslacht", () => {
    const waarden = buildAnimalInsert(varken, { species: "hangbuikvarken", gender: "mannetje" }, "varken");
    expect(waarden).toMatchObject({ species: "hangbuikvarken", gender: "mannetje" });
  });

  it("laat velden leeg die AnimalShelter niet betrouwbaar aanlevert", () => {
    const waarden = buildAnimalInsert(rocky, {}, "rocky");
    // `gecastreerd` 0/1/2 is nog niet bevestigd (koerswijziging §6.2.1).
    expect(waarden.isNeutered).toBeNull();
  });

  it("zet het dier aan het begin van ONZE workflow, niet die van hen", () => {
    const waarden = buildAnimalInsert(rocky, {}, "rocky");

    expect(waarden).toMatchObject({
      workflowPhase: "intake",
      status: "beschikbaar",
      isInShelter: true,
    });
    // Kennel en uitstroom blijven handwerk van het asiel.
    expect(waarden).not.toHaveProperty("kennelId");
    expect(waarden).not.toHaveProperty("outtakeDate");
  });

  it("neemt geen intakereden over die wij niet kennen", () => {
    const waarden = buildAnimalInsert({ ...felix, checkin_reason: "zwerfkat" }, {}, "felix");
    expect(waarden.intakeReason).toBeNull();
  });
});
