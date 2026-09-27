import { describe, it, expect } from "vitest";
import { adoptionUpdateSchema } from "./adoption-updates";
import { todayInBrussels } from "./animal-weights";

// Story 10.74 — een bericht na adoptie bewaren.

const geldig = {
  animalId: 315,
  receivedOn: "2026-09-20",
  channel: "whatsapp",
  sender: "  Sarah Peeters ",
  message: " Bo stelt het goed! ",
  fileCount: 0,
};

const fouten = (input: unknown) => {
  const r = adoptionUpdateSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("adoptionUpdateSchema", () => {
  it("aanvaardt een bericht en maakt de tekst netjes", () => {
    expect(adoptionUpdateSchema.parse(geldig)).toEqual({
      animalId: 315,
      receivedOn: "2026-09-20",
      channel: "whatsapp",
      sender: "Sarah Peeters",
      message: "Bo stelt het goed!",
      fileCount: 0,
    });
  });

  it("aanvaardt enkel foto's zonder tekst, en maakt lege velden null", () => {
    expect(adoptionUpdateSchema.parse({ ...geldig, sender: "", message: "  ", fileCount: 3 })).toMatchObject({
      sender: null,
      message: null,
      fileCount: 3,
    });
  });

  it("vraagt een tekst of minstens één bestand", () => {
    expect(fouten({ ...geldig, message: "", fileCount: 0 })).toContain(
      "Schrijf een bericht of voeg minstens één bestand toe.",
    );
  });

  it("weigert een datum in de toekomst, een ongeldige datum en vandaag niet", () => {
    expect(fouten({ ...geldig, receivedOn: "2999-01-01" })).toContain("De datum kan niet in de toekomst liggen.");
    expect(fouten({ ...geldig, receivedOn: "20-09-2026" })).toContain("Kies een geldige datum.");
    expect(fouten({ ...geldig, receivedOn: todayInBrussels() })).toEqual([]);
  });

  it("weigert een onbekend kanaal en te veel bestanden", () => {
    expect(fouten({ ...geldig, channel: "sms" })).toContain("Kies een kanaal.");
    expect(fouten({ ...geldig, fileCount: 21 })).toContain("Hooguit 20 bestanden per bericht.");
  });

  it("weigert een te lange tekst", () => {
    expect(fouten({ ...geldig, message: "x".repeat(5001) })).toContain("Het bericht is te lang (max. 5000 tekens).");
  });
});
