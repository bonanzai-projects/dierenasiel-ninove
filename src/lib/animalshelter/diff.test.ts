import { describe, it, expect } from "vitest";
import fixture from "./__fixtures__/animals.json";
import { animalShelterAnimalSchema } from "./types";
import { diffAnimal, hashFieldValue, type StoredDecision } from "./diff";
import type { LocalAnimalSnapshot } from "./mapping";

const [rocky, , varken] = fixture.map((a) => animalShelterAnimalSchema.parse(a));

/** Een lokale fiche die op alle vergelijkbare velden gelijkloopt met Rocky. */
const rockyLokaal: LocalAnimalSnapshot = {
  name: "Rocky",
  species: "hond",
  breed: "Canis Vulgaris",
  gender: "reu",
  dateOfBirth: "2020-12-01",
  identificationNr: "967000010354571",
  intakeDate: "2025-08-04",
  intakeReason: "afstand",
  dossierNr: "2502157",
  websiteDescription: rocky.beschrijving_nl,
  shortDescription: null,
  imageUrl: rocky.hoofdbeeld,
  images: rocky.extra_beelden.map((b) => b.image),
  isAvailableForAdoption: true,
  isOnWebsite: true,
  isNeutered: null,
};

const rij = (diff: ReturnType<typeof diffAnimal>, key: string) =>
  diff.rows.find((r) => r.key === key)!;

/**
 * Story 11.3 + §4 van de koerswijziging — het beslissingsmodel per (dier, veld).
 */

describe("diffAnimal — de vergelijking", () => {
  it("noemt alles gelijk wanneer beide fiches overeenkomen", () => {
    const diff = diffAnimal(rocky, rockyLokaal);
    const anders = diff.rows.filter((r) => r.state !== "gelijk");

    // Alleen 'gecastreerd' blijft over: dat veld is nog niet beslecht (§6.2.1).
    expect(anders.map((r) => r.key)).toEqual(["isNeutered"]);
    expect(diff.open).toBe(0);
  });

  it("meldt een verschil en biedt het aan om over te nemen", () => {
    const diff = diffAnimal(rocky, { ...rockyLokaal, breed: "Husky" });
    const ras = rij(diff, "breed");

    expect(ras.state).toBe("verschil");
    expect(ras.takeable).toBe(true);
    expect(ras.localText).toBe("Husky");
    expect(ras.remoteText).toBe("Canis Vulgaris");
    expect(diff.open).toBe(1);
  });

  it("biedt een leeg lokaal veld aan om in te vullen — dat is de winst van de koppeling", () => {
    const diff = diffAnimal(rocky, { ...rockyLokaal, websiteDescription: null });
    expect(rij(diff, "websiteDescription")).toMatchObject({ state: "verschil", takeable: true });
  });

  it("biedt NOOIT aan om onze data te overschrijven met een leeg extern veld", () => {
    // AnimalShelter weet iets níet — dat is geen reden om onze fiche leeg te maken.
    const diff = diffAnimal({ ...rocky, ras: null }, rockyLokaal);
    const ras = rij(diff, "breed");

    expect(ras.state).toBe("extern_leeg");
    expect(ras.takeable).toBe(false);
    expect(diff.open).toBe(0);
  });

  it("beschouwt twee lege velden als gelijk", () => {
    const diff = diffAnimal({ ...rocky, korte_beschrijving_nl: "" }, rockyLokaal);
    expect(rij(diff, "shortDescription").state).toBe("gelijk");
  });

  it("toont een onbesliste mapping wel, maar zonder knop", () => {
    const diff = diffAnimal(varken, {
      name: "Joske",
      species: "hangbuikvarken",
      gender: "mannetje",
    });

    expect(rij(diff, "species")).toMatchObject({ state: "niet_overneembaar", takeable: false });
    expect(rij(diff, "species").reason).toMatch(/other/i);
    // Hun "O" mag "mannetje" niet wegvegen; de reden legt uit waarom er geen knop staat.
    expect(rij(diff, "gender")).toMatchObject({ state: "niet_overneembaar", takeable: false });
  });

  it("zwijgt over een onbesliste mapping wanneer wij het veld ook niet ingevuld hebben", () => {
    const diff = diffAnimal(varken, { name: "Joske", gender: null });
    expect(rij(diff, "gender").state).toBe("gelijk");
  });

  it("vergelijkt fotolijsten op inhoud én volgorde", () => {
    const gelijk = diffAnimal(rocky, rockyLokaal);
    expect(rij(gelijk, "images").state).toBe("gelijk");

    const omgedraaid = diffAnimal(rocky, {
      ...rockyLokaal,
      images: [...rockyLokaal.images!].reverse(),
    });
    expect(rij(omgedraaid, "images").state).toBe("verschil");
  });

  it("telt de emmers samen voor het overzicht", () => {
    const diff = diffAnimal(rocky, { ...rockyLokaal, breed: "Husky", name: "Rocco" });
    expect(diff.samenvatting.open).toBe(2);
    expect(diff.samenvatting.gelijk).toBeGreaterThan(0);
  });
});

describe("bewaarde beslissingen (§4)", () => {
  const negeerRas = (over: Partial<StoredDecision> = {}): StoredDecision => ({
    fieldKey: "breed",
    decision: "negeer_waarde",
    remoteValueHash: hashFieldValue("Canis Vulgaris"),
    decidedBy: "Sven",
    decidedAt: "2026-07-26T10:00:00.000Z",
    ...over,
  });

  it("dempt een verschil waarover al beslist is", () => {
    const diff = diffAnimal(rocky, { ...rockyLokaal, breed: "Husky" }, [negeerRas()]);
    const ras = rij(diff, "breed");

    expect(ras.state).toBe("genegeerd");
    expect(diff.open).toBe(0);
    expect(diff.samenvatting.genegeerd).toBe(1);
  });

  it("houdt de genegeerde regel zichtbaar met wie en wanneer", () => {
    const diff = diffAnimal(rocky, { ...rockyLokaal, breed: "Husky" }, [negeerRas()]);
    expect(rij(diff, "breed").decision).toMatchObject({ decidedBy: "Sven" });
  });

  it("laat een genegeerde regel altijd nog overneembaar — nooit een doodlopende straat", () => {
    const diff = diffAnimal(rocky, { ...rockyLokaal, breed: "Husky" }, [negeerRas()]);
    expect(rij(diff, "breed").takeable).toBe(true);
  });

  it("brengt het verschil terug zodra AnimalShelter die waarde wijzigt", () => {
    // Dit is de kern van §4.1: een 'negeer' die nooit meer terugkomt is geen
    // beslissing maar een blinde vlek.
    const diff = diffAnimal({ ...rocky, ras: "Siberische Husky" }, { ...rockyLokaal, breed: "Husky" }, [
      negeerRas(),
    ]);

    expect(rij(diff, "breed").state).toBe("verschil");
    expect(diff.open).toBe(1);
  });

  it("laat 'altijd negeren' ook na een wijziging gedempt", () => {
    const diff = diffAnimal({ ...rocky, ras: "Siberische Husky" }, { ...rockyLokaal, breed: "Husky" }, [
      negeerRas({ decision: "negeer_altijd", remoteValueHash: null }),
    ]);

    expect(rij(diff, "breed").state).toBe("genegeerd");
    expect(diff.open).toBe(0);
  });

  it("dempt niets wanneer de velden intussen tóch gelijk zijn", () => {
    const diff = diffAnimal(rocky, rockyLokaal, [negeerRas()]);
    expect(rij(diff, "breed").state).toBe("gelijk");
  });

  it("negeert een beslissing over een veld dat niet meer bestaat", () => {
    const diff = diffAnimal(rocky, rockyLokaal, [
      { fieldKey: "afgeschaft_veld", decision: "negeer_altijd", remoteValueHash: null },
    ]);
    expect(diff.rows.some((r) => r.key === "afgeschaft_veld")).toBe(false);
  });
});

describe("hashFieldValue", () => {
  it("geeft dezelfde hash voor dezelfde waarde", () => {
    expect(hashFieldValue("Canis Vulgaris")).toBe(hashFieldValue("Canis Vulgaris"));
  });

  it("onderscheidt waarden, ook lege van ontbrekende", () => {
    expect(hashFieldValue("a")).not.toBe(hashFieldValue("b"));
    expect(hashFieldValue(null)).not.toBe(hashFieldValue(""));
    expect(hashFieldValue(["a", "b"])).not.toBe(hashFieldValue(["b", "a"]));
    expect(hashFieldValue(true)).not.toBe(hashFieldValue("true"));
  });

  it("levert een hash die in de kolom van 64 tekens past", () => {
    expect(hashFieldValue("iets")).toMatch(/^[0-9a-f]{64}$/);
  });
});
