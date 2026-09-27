import { describe, it, expect } from "vitest";
import { defaultVetId, vetAddress, vetDetailLines, vetKey } from "./format";

// Story 10.81 (Sven): "volledige gegevens van de dierenarts moeten erop komen: adres, nummer, enz."

const fiche = {
  name: "Dr. Ine Wouters",
  practice: "Dierenkliniek De Dender",
  street: "Kerkstraat",
  houseNumber: "12",
  postalCode: "9400",
  city: "Ninove",
  phone: "054 12 34 56",
  mobile: "0470 12 34 56",
  email: "ine@dedender.be",
  orderNumber: "N1234",
  notes: null,
};

describe("vetKey", () => {
  it("vergelijkt namen zonder hoofdletters of spaties rond", () => {
    expect(vetKey("  Dr. Ine Wouters ")).toBe("dr. ine wouters");
  });
});

describe("vetAddress", () => {
  it("zet straat, nr, postcode en gemeente op één regel", () => {
    expect(vetAddress(fiche)).toBe("Kerkstraat 12, 9400 Ninove");
  });

  it("laat weg wat niet ingevuld is", () => {
    expect(vetAddress({ ...fiche, street: null, houseNumber: null })).toBe("9400 Ninove");
    expect(vetAddress({ ...fiche, postalCode: null, city: null })).toBe("Kerkstraat 12");
    expect(vetAddress({ ...fiche, street: null, houseNumber: null, postalCode: null, city: null })).toBe("");
  });
});

describe("vetDetailLines", () => {
  it("geeft alle gegevens voor op het rapport, telefoon en gsm herkenbaar", () => {
    expect(vetDetailLines(fiche)).toEqual([
      "Dierenkliniek De Dender",
      "Kerkstraat 12, 9400 Ninove",
      "Tel. 054 12 34 56",
      "Gsm 0470 12 34 56",
      "ine@dedender.be",
      "Ordenummer: N1234",
    ]);
  });

  it("toont enkel wat ingevuld is", () => {
    expect(
      vetDetailLines({ ...fiche, practice: null, mobile: " ", email: null, orderNumber: null, street: null, houseNumber: null, postalCode: null, city: null }),
    ).toEqual(["Tel. 054 12 34 56"]);
  });
});

describe("defaultVetId", () => {
  const lijst = [{ id: 3, name: "Dr. Ine Wouters" }, { id: 4, name: "Dr. Peeters" }];

  it("kiest de fiche met de naam van wie ingelogd is", () => {
    expect(defaultVetId(lijst, "dr. peeters")).toBe(4);
  });

  it("kiest niets als er geen fiche met die naam is", () => {
    expect(defaultVetId(lijst, "Nadia")).toBeNull();
    expect(defaultVetId(lijst, "")).toBeNull();
  });
});
