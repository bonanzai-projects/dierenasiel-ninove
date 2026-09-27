import { describe, it, expect } from "vitest";
import { buildKennelCard, type KennelCardInput } from "./kennel-card";

/**
 * Story 10.43 — de kaart die aan de kennel hangt, ter vervanging van de
 * handgeschreven steekkaart. Sven leverde de papieren versie aan als voorbeeld.
 */

function invoer(over: Partial<KennelCardInput["animal"]> = {}, rest: Partial<KennelCardInput> = {}): KennelCardInput {
  return {
    animal: {
      name: "Bo",
      aliasName: null,
      species: "hond",
      breed: "Chow Chow",
      gender: "reu",
      isNeutered: false,
      dateOfBirth: "2024-10-27",
      intakeDate: "2026-05-06",
      intakeReason: "afstand",
      weightKg: null,
      ...over,
    },
    lastVaccination: null,
    dewormings: [],
    ...rest,
  };
}

describe("buildKennelCard", () => {
  it("zet de gegevens van het dier op de kaart", () => {
    const kaart = buildKennelCard(invoer());

    expect(kaart.ras).toBe("Chow Chow");
    expect(kaart.naam).toBe("Bo");
    expect(kaart.geboortedatum).toBe("27.10.2024");
    expect(kaart.inHuisSinds).toBe("06.05.2026");
  });

  it("toont beide geslachtsopties en markeert de juiste — zoals op de papieren kaart", () => {
    expect(buildKennelCard(invoer()).geslacht).toEqual([
      { label: "Reu", gemarkeerd: true },
      { label: "Teef", gemarkeerd: false },
    ]);
  });

  it("gebruikt de opties die bij de soort horen", () => {
    expect(buildKennelCard(invoer({ species: "kat", gender: "poes" })).geslacht).toEqual([
      { label: "Kater", gemarkeerd: false },
      { label: "Poes", gemarkeerd: true },
    ]);
    expect(buildKennelCard(invoer({ species: "konijn", gender: "mannetje" })).geslacht).toEqual([
      { label: "Mannetje", gemarkeerd: true },
      { label: "Vrouwtje", gemarkeerd: false },
    ]);
  });

  it("markeert geen enkel geslacht wanneer het onbekend is", () => {
    for (const gender of ["", null, "onbekend"]) {
      const kaart = buildKennelCard(invoer({ gender }));
      expect(kaart.geslacht.every((o) => !o.gemarkeerd), `gender=${gender}`).toBe(true);
    }
  });

  it("herkent de oude waarden mannelijk/vrouwelijk van vóór Story 10.37", () => {
    // 9 van de 34 dieren dragen die nog, waaronder echte dieren als Foxy en
    // Gaston. Zonder deze terugval blijft hun kaart leeg op dit veld.
    expect(buildKennelCard(invoer({ gender: "vrouwelijk" })).geslacht).toEqual([
      { label: "Reu", gemarkeerd: false },
      { label: "Teef", gemarkeerd: true },
    ]);
    expect(buildKennelCard(invoer({ species: "kat", gender: "mannelijk" })).geslacht).toEqual([
      { label: "Kater", gemarkeerd: true },
      { label: "Poes", gemarkeerd: false },
    ]);
  });

  it("markeert Ja of Neen bij steriel", () => {
    expect(buildKennelCard(invoer({ isNeutered: true })).steriel).toEqual([
      { label: "Ja", gemarkeerd: true },
      { label: "Neen", gemarkeerd: false },
    ]);
    expect(buildKennelCard(invoer({ isNeutered: false })).steriel).toEqual([
      { label: "Ja", gemarkeerd: false },
      { label: "Neen", gemarkeerd: true },
    ]);
  });

  it("markeert niets wanneer steriel onbekend is", () => {
    // Drietoestand sinds Story 10.29: onbekend blijft open om met de hand aan te vullen.
    const kaart = buildKennelCard(invoer({ isNeutered: null }));
    expect(kaart.steriel.every((o) => !o.gemarkeerd)).toBe(true);
  });

  it("vult de laatste vaccinatie in", () => {
    expect(buildKennelCard(invoer({}, { lastVaccination: "2026-06-15" })).gevaccineerd).toBe("15.06.2026");
  });

  // Story 10.80 (Sven): "de ontworming zou een tabel moeten zijn … korte data met daarnaast ontwormingsproduct".
  it("zet de ontwormingen in een tabel: korte datum en product, oudste bovenaan", () => {
    const kaart = buildKennelCard(
      invoer({}, {
        dewormings: [
          { date: "2026-07-01", type: "Canicantel" },
          { date: "2026-04-15", type: "Milbemax" },
        ],
      }),
    );
    expect(kaart.ontwormingen).toEqual([
      { datum: "15.04.26", product: "Milbemax" },
      { datum: "01.07.26", product: "Canicantel" },
    ]);
  });

  it("vult de tabel aan tot 6 regels om met de hand bij te schrijven", () => {
    expect(buildKennelCard(invoer()).ontwormingLegeRegels).toBe(6);
    expect(
      buildKennelCard(invoer({}, { dewormings: [{ date: "2026-07-01", type: "Canicantel" }] })).ontwormingLegeRegels,
    ).toBe(5);
  });

  it("houdt de laatste 6 ontwormingen als er meer zijn", () => {
    const acht = Array.from({ length: 8 }, (_, i) => ({ date: `2026-0${i + 1}-10`, type: `Product ${i + 1}` }));
    const kaart = buildKennelCard(invoer({}, { dewormings: acht }));
    expect(kaart.ontwormingen.map((o) => o.product)).toEqual([
      "Product 3", "Product 4", "Product 5", "Product 6", "Product 7", "Product 8",
    ]);
    expect(kaart.ontwormingLegeRegels).toBe(0);
  });

  // Story 10.80 (Sven): "bij in huis is eigenlijk de intake en mag ook miss naast reden van intake".
  it("zet de reden van intake naast de datum waarop het dier binnenkwam", () => {
    expect(buildKennelCard(invoer()).redenIntake).toBe("Afstand door eigenaar");
    expect(buildKennelCard(invoer({ intakeReason: "ibn" })).redenIntake).toBe("Inbeslagname (IBN)");
    expect(buildKennelCard(invoer({ intakeReason: null })).redenIntake).toBe("");
  });

  it("laat een veld leeg in plaats van een streepje — er wordt op geschreven", () => {
    const kaart = buildKennelCard(invoer({ breed: null, dateOfBirth: null, weightKg: null }));

    expect(kaart.ras).toBe("");
    expect(kaart.geboortedatum).toBe("");
    expect(kaart.gewicht).toBe("");
    expect(kaart.gevaccineerd).toBe("");
  });

  it("neemt het gewicht bij aankomst over", () => {
    expect(buildKennelCard(invoer({ weightKg: "12,5" })).gewicht).toBe("12,5");
  });

  it("toont de echte naam apart wanneer die ingevuld is", () => {
    // Story 10.42: `name` is de publieke naam, `aliasName` de echte naam.
    const kaart = buildKennelCard(invoer({ name: "Bo", aliasName: "Shana" }));

    expect(kaart.naam).toBe("Bo");
    expect(kaart.echteNaam).toBe("Shana");
  });

  it("laat de echte naam weg wanneer die er niet is", () => {
    expect(buildKennelCard(invoer({ aliasName: "  " })).echteNaam).toBe("");
  });

  it("verdraagt een onbruikbare datum zonder te ontsporen", () => {
    const kaart = buildKennelCard(invoer({ dateOfBirth: "geen datum" }));
    expect(kaart.geboortedatum).toBe("");
  });
});
