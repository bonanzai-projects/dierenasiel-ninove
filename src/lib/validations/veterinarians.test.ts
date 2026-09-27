import { describe, it, expect } from "vitest";
import { veterinarianSchema } from "./veterinarians";

// Story 10.81 — één fiche in de dierenartsenlijst.

describe("veterinarianSchema", () => {
  it("vraagt enkel een naam; lege velden worden null", () => {
    expect(veterinarianSchema.parse({ name: "  Dr. Peeters ", practice: "", email: "", phone: "" })).toEqual({
      name: "Dr. Peeters",
      practice: null,
      street: null,
      houseNumber: null,
      postalCode: null,
      city: null,
      phone: null,
      mobile: null,
      email: null,
      orderNumber: null,
      notes: null,
    });
  });

  it("weigert een lege naam en een ongeldig e-mailadres", () => {
    const r = veterinarianSchema.safeParse({ name: " ", email: "geen-mail" });
    expect(r.success).toBe(false);
    const fouten = r.success ? {} : r.error.flatten().fieldErrors;
    expect(fouten.name).toEqual(["Naam is verplicht"]);
    expect(fouten.email).toEqual(["Geen geldig e-mailadres"]);
  });

  it("aanvaardt een volledige fiche", () => {
    const r = veterinarianSchema.parse({
      name: "Dr. Ine Wouters", practice: "Dierenkliniek De Dender", street: "Kerkstraat", houseNumber: "12",
      postalCode: "9400", city: "Ninove", phone: "054 12 34 56", mobile: "0470 12 34 56",
      email: "ine@dedender.be", orderNumber: "N1234", notes: "Enkel op dinsdag",
    });
    expect(r.orderNumber).toBe("N1234");
    expect(r.mobile).toBe("0470 12 34 56");
  });
});
