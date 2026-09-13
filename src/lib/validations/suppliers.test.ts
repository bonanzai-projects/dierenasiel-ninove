import { describe, it, expect } from "vitest";
import { supplierSchema } from "./suppliers";

// Story 13.16 — één leverancier uit de lijst.

describe("supplierSchema", () => {
  it("maakt van lege velden null en vult de website aan", () => {
    const res = supplierSchema.safeParse({
      name: " Brouwerij De Ryck ",
      phone: "",
      email: "",
      website: "deryck.be",
      notes: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({
        name: "Brouwerij De Ryck",
        phone: null,
        email: null,
        website: "https://deryck.be",
        notes: null,
        street: null,
        houseNumber: null,
        postalCode: null,
        city: null,
      });
    }
  });

  it("vraagt een naam", () => {
    const res = supplierSchema.safeParse({ name: "  " });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.flatten().fieldErrors.name?.[0]).toMatch(/naam/i);
  });

  it("weigert een ongeldig e-mailadres", () => {
    const res = supplierSchema.safeParse({ name: "De Ryck", email: "info@deryck" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.flatten().fieldErrors.email).toBeDefined();
  });

  it("laat een gsm-nummer van hoogstens 30 tekens toe", () => {
    expect(supplierSchema.safeParse({ name: "X", phone: "0470 12 34 56" }).success).toBe(true);
    expect(supplierSchema.safeParse({ name: "X", phone: "1".repeat(31) }).success).toBe(false);
  });
});

// Story 13.18 — Sven: "adres: straat + nr + postcode + gemeente (aparte velden aub)".
describe("supplierSchema — adres", () => {
  it("bewaart straat, nr, postcode en gemeente apart, zonder spaties aan de randen", () => {
    const res = supplierSchema.safeParse({
      name: "X",
      street: " Kerkstraat ",
      houseNumber: " 12A ",
      postalCode: " 9400 ",
      city: " Ninove ",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toMatchObject({
        street: "Kerkstraat",
        houseNumber: "12A",
        postalCode: "9400",
        city: "Ninove",
      });
    }
  });

  it("begrenst de lengte van elk veld", () => {
    expect(supplierSchema.safeParse({ name: "X", street: "s".repeat(121) }).success).toBe(false);
    expect(supplierSchema.safeParse({ name: "X", houseNumber: "1".repeat(21) }).success).toBe(false);
    expect(supplierSchema.safeParse({ name: "X", postalCode: "1".repeat(11) }).success).toBe(false);
    expect(supplierSchema.safeParse({ name: "X", city: "g".repeat(81) }).success).toBe(false);
  });

  it("controleert het formaat van de postcode niet — een leverancier over de grens mag", () => {
    expect(supplierSchema.safeParse({ name: "X", postalCode: "NL-1234 AB" }).success).toBe(true);
  });
});
