import { describe, it, expect } from "vitest";
import {
  supplierKey,
  normalizeWebsite,
  contactLinks,
  formatAddress,
  findSupplier,
  eventCountBySupplier,
  missingSupplierNames,
} from "./suppliers";

// Story 13.16 — de leverancierslijst. De koppeling met een kosten- of materiaalregel
// gebeurt op naam, zonder onderscheid tussen hoofd- en kleine letters.

describe("supplierKey", () => {
  it("negeert hoofdletters en spaties aan de randen", () => {
    expect(supplierKey("  De Ryck ")).toBe("de ryck");
  });

  it("geeft een lege sleutel voor niets", () => {
    expect(supplierKey(null)).toBe("");
    expect(supplierKey(undefined)).toBe("");
    expect(supplierKey("   ")).toBe("");
  });
});

describe("normalizeWebsite", () => {
  it("zet https:// voor een adres zonder protocol", () => {
    expect(normalizeWebsite("deryck.be")).toBe("https://deryck.be");
    expect(normalizeWebsite("  www.deryck.be  ")).toBe("https://www.deryck.be");
  });

  it("laat een adres met protocol ongemoeid", () => {
    expect(normalizeWebsite("http://deryck.be")).toBe("http://deryck.be");
    expect(normalizeWebsite("HTTPS://Deryck.be")).toBe("HTTPS://Deryck.be");
  });

  it("maakt van leeg null", () => {
    expect(normalizeWebsite("")).toBeNull();
    expect(normalizeWebsite(null)).toBeNull();
  });
});

describe("contactLinks", () => {
  it("maakt een belbare link van een gsm-nummer, zonder spaties of tekens", () => {
    expect(contactLinks({ phone: "0470 12 34 56", email: null, website: null })).toEqual([
      { kind: "gsm", label: "0470 12 34 56", href: "tel:0470123456" },
    ]);
    expect(contactLinks({ phone: "+32 470/12.34.56", email: null, website: null })[0].href).toBe(
      "tel:+32470123456",
    );
  });

  it("maakt een mail- en een websitelink; de website zonder protocol als tekst", () => {
    const links = contactLinks({
      phone: null,
      email: "info@deryck.be",
      website: "https://www.deryck.be/",
    });
    expect(links).toEqual([
      { kind: "mail", label: "info@deryck.be", href: "mailto:info@deryck.be" },
      { kind: "website", label: "www.deryck.be", href: "https://www.deryck.be/" },
    ]);
  });

  it("geeft niets voor lege velden, en houdt de volgorde gsm · mail · website", () => {
    expect(contactLinks({ phone: "", email: null, website: null })).toEqual([]);
    const kinds = contactLinks({ phone: "0470", email: "a@b.be", website: "b.be" }).map((l) => l.kind);
    expect(kinds).toEqual(["gsm", "mail", "website"]);
  });
});

// Story 13.18 — het adres in vier aparte velden, getoond als één regel.
describe("formatAddress", () => {
  it("zet straat en nr, dan postcode en gemeente", () => {
    expect(
      formatAddress({ street: "Kerkstraat", houseNumber: "12", postalCode: "9400", city: "Ninove" }),
    ).toBe("Kerkstraat 12, 9400 Ninove");
  });

  it("laat ontbrekende delen weg", () => {
    expect(formatAddress({ street: null, houseNumber: null, postalCode: "9400", city: "Ninove" })).toBe(
      "9400 Ninove",
    );
    expect(formatAddress({ street: "Kerkstraat", houseNumber: " ", postalCode: null, city: "Ninove" })).toBe(
      "Kerkstraat, Ninove",
    );
    expect(formatAddress({ city: "Ninove" })).toBe("Ninove");
  });

  it("geeft null zonder adres", () => {
    expect(formatAddress({})).toBeNull();
    expect(formatAddress({ street: "", houseNumber: null, postalCode: "  " })).toBeNull();
  });
});

describe("contactLinks — adres (Story 13.18)", () => {
  it("zet het adres als laatste, met een link naar Google Maps", () => {
    const links = contactLinks({ phone: "0470", email: null, website: null, postalCode: "9400", city: "Ninove" });
    expect(links.map((l) => l.kind)).toEqual(["gsm", "adres"]);
    expect(links[1]).toEqual({
      kind: "adres",
      label: "9400 Ninove",
      href: "https://www.google.com/maps/search/?api=1&query=9400%20Ninove",
    });
  });
});

describe("findSupplier", () => {
  const lijst = [
    { name: "Brouwerij De Ryck", phone: "0470" },
    { name: "Chiro Ninove", phone: null },
  ];

  it("vindt een leverancier ongeacht hoofdletters en spaties", () => {
    expect(findSupplier(lijst, " brouwerij de ryck")?.phone).toBe("0470");
  });

  it("geeft null voor een onbekende of lege naam", () => {
    expect(findSupplier(lijst, "Verhuur Van Damme")).toBeNull();
    expect(findSupplier(lijst, null)).toBeNull();
  });
});

describe("eventCountBySupplier", () => {
  it("telt per leverancier in hoeveel verschillende evenementen hij voorkomt", () => {
    const telling = eventCountBySupplier([
      { supplier: "De Ryck", eventId: 1 },
      { supplier: "de ryck ", eventId: 1 },
      { supplier: "De Ryck", eventId: 2 },
      { supplier: null, eventId: 3 },
      { supplier: "", eventId: 4 },
    ]);
    expect(telling.get("de ryck")).toBe(2);
    expect(telling.size).toBe(1);
  });
});

describe("missingSupplierNames", () => {
  it("geeft de namen op regels die nog niet in de lijst staan, elk één keer", () => {
    expect(
      missingSupplierNames(["De Ryck"], ["de ryck", "Chiro Ninove", " chiro ninove", null, ""]),
    ).toEqual(["Chiro Ninove"]);
  });
});
