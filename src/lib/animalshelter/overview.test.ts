import { describe, it, expect } from "vitest";
import fixture from "./__fixtures__/animals.json";
import { animalShelterAnimalSchema } from "./types";
import { buildOverview, type LocalAnimalRecord } from "./overview";
import { hashFieldValue } from "./diff";

const [rocky, felix, varken] = fixture.map((a) => animalShelterAnimalSchema.parse(a));

function lokaal(over: Partial<LocalAnimalRecord> & { id: number }): LocalAnimalRecord {
  return { name: "Naamloos", identificationNr: null, dossierNr: null, species: null, ...over };
}

const rockyLokaal = lokaal({
  id: 1,
  name: "Rocky",
  identificationNr: "967000010354571",
  species: "hond",
  breed: "Canis Vulgaris",
  gender: "reu",
  dateOfBirth: "2020-12-01",
  intakeDate: "2025-08-04",
  intakeReason: "afstand",
  dossierNr: "2502157",
  websiteDescription: rocky.beschrijving_nl,
  imageUrl: rocky.hoofdbeeld,
  images: rocky.extra_beelden.map((b) => b.image),
  isAvailableForAdoption: true,
  isOnWebsite: true,
});

const zoek = (model: ReturnType<typeof buildOverview>, externalId: number) =>
  model.entries.find((e) => e.externalId === externalId)!;

/**
 * Story 11.4 — het overzichtsscherm. Alles wat de beheerder als eerste ziet,
 * wordt hier bepaald: welke emmer, hoeveel openstaande verschillen, welke naam.
 */

describe("buildOverview", () => {
  it("zet een gekoppeld dier zonder verschillen in de emmer 'gelijk'", () => {
    const model = buildOverview({ remote: [rocky], locals: [rockyLokaal], links: [], decisions: [] });

    expect(zoek(model, rocky.id)).toMatchObject({
      bucket: "gelijk",
      animalId: 1,
      localName: "Rocky",
      matchMethod: "chip",
      open: 0,
    });
  });

  it("zet een gekoppeld dier mét verschillen in de emmer 'verschillen', met telling", () => {
    const model = buildOverview({
      remote: [rocky],
      locals: [{ ...rockyLokaal, breed: "Husky", name: "Rocco" }],
      links: [],
      decisions: [],
    });

    expect(zoek(model, rocky.id)).toMatchObject({ bucket: "verschillen", open: 2 });
    expect(model.tellers.verschillen).toBe(1);
  });

  it("telt genegeerde verschillen apart en houdt ze uit 'open'", () => {
    const model = buildOverview({
      remote: [rocky],
      locals: [{ ...rockyLokaal, breed: "Husky" }],
      links: [],
      decisions: [
        {
          animalId: 1,
          fieldKey: "breed",
          decision: "negeer_waarde",
          remoteValueHash: hashFieldValue("Canis Vulgaris"),
        },
      ],
    });

    expect(zoek(model, rocky.id)).toMatchObject({ bucket: "gelijk", open: 0, genegeerd: 1 });
  });

  it("laat beslissingen van een ánder dier met rust", () => {
    const model = buildOverview({
      remote: [rocky],
      locals: [{ ...rockyLokaal, breed: "Husky" }],
      links: [],
      decisions: [
        { animalId: 999, fieldKey: "breed", decision: "negeer_altijd", remoteValueHash: null },
      ],
    });
    expect(zoek(model, rocky.id).open).toBe(1);
  });

  it("zet een dier dat lokaal niet bestaat in 'enkel extern'", () => {
    const model = buildOverview({ remote: [felix], locals: [], links: [], decisions: [] });

    expect(zoek(model, felix.id)).toMatchObject({
      bucket: "enkel_extern",
      animalId: null,
      localName: null,
      externalName: "Felix",
      open: 0,
    });
    expect(model.tellers.enkel_extern).toBe(1);
  });

  it("meldt onze eigen dieren die AnimalShelter niet kent", () => {
    const model = buildOverview({
      remote: [],
      locals: [lokaal({ id: 7, name: "Tim", species: "hond" })],
      links: [],
      decisions: [],
    });

    expect(model.enkelLokaal).toEqual([{ id: 7, name: "Tim", species: "hond" }]);
    expect(model.tellers.enkelLokaal).toBe(1);
  });

  it("legt een dubbele chip voor als keuze in plaats van een gok", () => {
    const model = buildOverview({
      remote: [rocky],
      locals: [
        lokaal({ id: 1, name: "Eerste", identificationNr: "967000010354571" }),
        lokaal({ id: 2, name: "Tweede", identificationNr: "967000010354571" }),
      ],
      links: [],
      decisions: [],
    });

    const entry = zoek(model, rocky.id);
    expect(entry.bucket).toBe("ambigu");
    expect(entry.kandidaten).toEqual([
      { id: 1, name: "Eerste" },
      { id: 2, name: "Tweede" },
    ]);
  });

  it("zet een bewust genegeerd extern dier in zijn eigen emmer", () => {
    const model = buildOverview({
      remote: [varken],
      locals: [],
      links: [{ externalId: varken.id, animalId: null, status: "genegeerd" }],
      decisions: [],
    });

    expect(zoek(model, varken.id).bucket).toBe("genegeerd");
    expect(model.tellers.genegeerd).toBe(1);
  });

  it("zet de dieren die aandacht vragen bovenaan", () => {
    const model = buildOverview({
      remote: [rocky, felix, varken],
      locals: [{ ...rockyLokaal, breed: "Husky" }],
      links: [],
      decisions: [],
    });

    expect(model.entries[0].externalId).toBe(rocky.id); // verschillen eerst
    expect(model.entries.map((e) => e.bucket)).toEqual([
      "verschillen",
      "enkel_extern",
      "enkel_extern",
    ]);
  });

  it("geeft alle emmers een teller, ook de lege", () => {
    const model = buildOverview({ remote: [], locals: [], links: [], decisions: [] });
    expect(model.tellers).toEqual({
      verschillen: 0,
      gelijk: 0,
      enkel_extern: 0,
      ambigu: 0,
      genegeerd: 0,
      enkelLokaal: 0,
    });
  });
});
