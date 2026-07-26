import { describe, it, expect } from "vitest";
import fixture from "./__fixtures__/animals.json";
import {
  FIELD_DEFINITIONS,
  fieldDefinition,
  mapGender,
  mapIntakeReason,
  mapNeutered,
  mapSpecies,
  parseBelgianDate,
  parseIsoDate,
  toBoolean,
  normalizeText,
} from "./mapping";
import { animalShelterAnimalSchema } from "./types";

const [rocky, felix, varken] = fixture.map((a) => animalShelterAnimalSchema.parse(a));

/**
 * Story 11.3 — normalisatie tussen twee systemen die het niet eens zijn over
 * datumformaten, geslachten en soorten. Zie koerswijziging §6.
 */

describe("datums — twee formaten in één response", () => {
  it("leest een geboortedatum met tijd erachter", () => {
    expect(parseIsoDate("2020-12-01 00:00:00")).toBe("2020-12-01");
    expect(parseIsoDate("2017-06-26T00:00:00Z")).toBe("2017-06-26");
  });

  it("leest een intakedatum in dd-mm-jjjj — niet als maand-dag", () => {
    // 04-08-2025 is 4 augustus, niet 8 april. Hier gaat het gegarandeerd mis
    // als je beide datumvelden door dezelfde parser haalt.
    expect(parseBelgianDate("04-08-2025")).toBe("2025-08-04");
    expect(parseBelgianDate("14-06-2026")).toBe("2026-06-14");
  });

  it("geeft null bij een onbruikbare datum in plaats van een gok", () => {
    for (const bad of [null, "", "geen datum", "32-01-2026", "01-13-2026", "0000-00-00"]) {
      expect(parseBelgianDate(bad)).toBeNull();
    }
    for (const bad of [null, "", "geen datum", "2026-13-01"]) {
      expect(parseIsoDate(bad)).toBeNull();
    }
  });
});

describe("soort", () => {
  it("mapt honden en katten", () => {
    expect(mapSpecies("dogs")).toBe("hond");
    expect(mapSpecies("cats")).toBe("kat");
  });

  it("mapt 'other' niet — onze soorten zijn concreet, die van hen niet", () => {
    // Het enige exemplaar heet "Varken (vondeling)"; raden zou fout zijn.
    expect(mapSpecies("other")).toBeNull();
  });
});

describe("geslacht", () => {
  it("mapt M en F naar onze soortafhankelijke waarden", () => {
    expect(mapGender("M", "dogs")).toBe("reu");
    expect(mapGender("F", "dogs")).toBe("teef");
    expect(mapGender("M", "cats")).toBe("kater");
    expect(mapGender("F", "cats")).toBe("poes");
    expect(mapGender("M", "other")).toBe("mannetje");
    expect(mapGender("F", "other")).toBe("vrouwtje");
  });

  it("mapt O niet — wij kennen geen 'onbekend' geslacht", () => {
    expect(mapGender("O", "other")).toBeNull();
    expect(mapGender(null, "dogs")).toBeNull();
  });

  it("verdraagt kleine letters", () => {
    expect(mapGender("m", "dogs")).toBe("reu");
  });
});

describe("intakereden", () => {
  it("mapt de drie redenen die wij ook kennen", () => {
    expect(mapIntakeReason("afgestaan")).toBe("afstand");
    expect(mapIntakeReason("inbeslagname")).toBe("ibn");
    expect(mapIntakeReason("gevondendier")).toBe("zwerfhond");
  });

  it("mapt 'zwerfkat' niet — die reden bestaat bij ons niet", () => {
    expect(mapIntakeReason("zwerfkat")).toBeNull();
    expect(mapIntakeReason("iets nieuws")).toBeNull();
  });
});

describe("gesteriliseerd/gecastreerd", () => {
  // Betekenis bevestigd door Sven op 2026-07-26: 0 = nee, 1 = ja, 2 = niet van toepassing.
  it("mapt nee en ja", () => {
    expect(mapNeutered(0)).toBe(false);
    expect(mapNeutered(1)).toBe(true);
  });

  it("mapt 'niet van toepassing' naar leeg — wij kennen die waarde niet", () => {
    expect(mapNeutered(2)).toBeNull();
    expect(mapNeutered(null)).toBeNull();
    expect(mapNeutered(7)).toBeNull();
  });

  it("is nu overneembaar bij een duidelijke code", () => {
    // Felix heeft code 1.
    expect(fieldDefinition("isNeutered").remote(felix)).toBe(true);
    expect(fieldDefinition("isNeutered").notTakeable(felix)).toBeNull();
  });

  it("blijft niet-overneembaar bij 'niet van toepassing'", () => {
    // Rocky heeft code 2. "Niet van toepassing" is iets anders dan "onbekend",
    // en wij hebben er geen veldwaarde voor — dus geen knop, wel uitleg.
    expect(fieldDefinition("isNeutered").remote(rocky)).toBeNull();
    expect(fieldDefinition("isNeutered").notTakeable(rocky)).toMatch(/niet van toepassing/i);
  });

  it("toont de waarde leesbaar", () => {
    const veld = fieldDefinition("isNeutered");
    expect(veld.format(true)).toBe("Ja");
    expect(veld.format(false)).toBe("Nee");
    expect(veld.format(null)).toBe("—");
  });
});

describe("hulpjes", () => {
  it("zet 1/0 om naar een boolean en laat null met rust", () => {
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean(0)).toBe(false);
    expect(toBoolean(null)).toBeNull();
  });

  it("maakt tekst vergelijkbaar zonder de inhoud te veranderen", () => {
    expect(normalizeText("regel\r\nregel2  ")).toBe("regel\nregel2");
    expect(normalizeText("  ")).toBeNull();
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText("-")).toBeNull();
  });
});

describe("FIELD_DEFINITIONS — de gedeelde velden (klasse B)", () => {
  it("dekt de velden uit de koerswijziging §6.1", () => {
    expect(FIELD_DEFINITIONS.map((f) => f.key)).toEqual([
      "name",
      "species",
      "breed",
      "gender",
      "dateOfBirth",
      "identificationNr",
      "isNeutered",
      "intakeDate",
      "intakeReason",
      "dossierNr",
      "websiteDescription",
      "shortDescription",
      "imageUrl",
      "images",
      "isAvailableForAdoption",
      "isOnWebsite",
    ]);
  });

  it("leest de externe waarden van Rocky correct uit", () => {
    const lees = (key: string) => fieldDefinition(key).remote(rocky);
    expect(lees("name")).toBe("Rocky");
    expect(lees("species")).toBe("hond");
    expect(lees("breed")).toBe("Canis Vulgaris");
    expect(lees("gender")).toBe("reu");
    expect(lees("dateOfBirth")).toBe("2020-12-01");
    expect(lees("identificationNr")).toBe("967000010354571");
    expect(lees("intakeDate")).toBe("2025-08-04");
    expect(lees("intakeReason")).toBe("afstand");
    expect(lees("dossierNr")).toBe("2502157");
    expect(lees("isAvailableForAdoption")).toBe(true);
    expect(lees("isOnWebsite")).toBe(true);
    expect(lees("images")).toHaveLength(2);
  });

  it("stuurt de website-tekst naar websiteDescription, niet naar description", () => {
    // `description` is sinds Story 10.32 onze interne werktekst. Die overschrijven
    // met publicitaire copy zou de notities van het asiel wissen.
    expect(FIELD_DEFINITIONS.map((f) => f.key)).not.toContain("description");
    expect(fieldDefinition("websiteDescription").remote(rocky)).toContain("Rocky");
  });

  it("markeert de resterende onbesliste mappings als niet-overneembaar, met reden", () => {
    // geslacht O bij het varken.
    expect(fieldDefinition("gender").notTakeable(varken)).toMatch(/onbekend|geslacht/i);
    // soort "other".
    expect(fieldDefinition("species").notTakeable(varken)).toMatch(/soort/i);
    // zwerfkat als intakereden.
    const zwerfkat = { ...felix, checkin_reason: "zwerfkat" };
    expect(fieldDefinition("intakeReason").notTakeable(zwerfkat)).toMatch(/zwerfkat/i);
  });

  it("laat een geslacht dat wél mapt gewoon overneembaar", () => {
    expect(fieldDefinition("gender").notTakeable(rocky)).toBeNull();
    expect(fieldDefinition("species").notTakeable(felix)).toBeNull();
    expect(fieldDefinition("intakeReason").notTakeable(rocky)).toBeNull();
  });

  it("toont elke waarde leesbaar voor het scherm", () => {
    expect(fieldDefinition("isOnWebsite").format(true)).toBe("Ja");
    expect(fieldDefinition("isOnWebsite").format(false)).toBe("Nee");
    expect(fieldDefinition("name").format(null)).toBe("—");
    expect(fieldDefinition("images").format(["a", "b"])).toBe("2 foto's");
    expect(fieldDefinition("dateOfBirth").format("2020-12-01")).toBe("01/12/2020");
  });

  it("toont de website-tekst leesbaar, zonder HTML-tags", () => {
    // AnimalShelter levert HTML aan en zo hoort het ook bewaard te worden;
    // maar een <p>-tag in een vergelijkingstabel leest niet.
    const veld = fieldDefinition("websiteDescription");
    const html = ["<p>Ras: Husky</p>", "<p>Leeftijd: 4</p>"].join("\r\n");
    expect(veld.format(html)).toBe(["Ras: Husky", "", "Leeftijd: 4"].join("\n"));
    expect(veld.format("Regel<br/>twee")).toBe(["Regel", "twee"].join("\n"));
    expect(veld.format("Kat &amp; hond&nbsp;samen")).toBe("Kat & hond samen");
    expect(veld.format(null)).toBe("—");
  });

  it("laat de op te slaan waarde ongemoeid — alleen de weergave wordt opgeschoond", () => {
    const veld = fieldDefinition("websiteDescription");
    expect(veld.remote(rocky)).toContain("<p>");
  });
});
