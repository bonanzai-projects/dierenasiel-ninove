import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PDF_LETTERHEAD, SHELTER_LOCATIONS, SITE_NAME } from "@/lib/constants";

describe("PDF_LETTERHEAD", () => {
  it("gebruikt de naam van het asiel", () => {
    expect(PDF_LETTERHEAD.name).toBe(SITE_NAME);
  });

  it("blijft overeenkomen met het adres van de hondenvestiging", () => {
    expect(PDF_LETTERHEAD.address).toContain(SHELTER_LOCATIONS.dogs.address);
  });

  it("noemt de postgemeente", () => {
    expect(PDF_LETTERHEAD.address).toContain("9400 Denderwindeke");
  });
});

/**
 * Bewaakt dat het briefhoofd niet opnieuw in de componenten wordt overgetypt.
 * Story 10.59 haalde het uit zeventien bestanden; zonder deze test sluipt het
 * er bij het volgende rapport gewoon weer in.
 */
describe("geen overgetypt briefhoofd in PDF-componenten", () => {
  const roots = [
    "src/components/beheerder/rapporten",
    "src/components/beheerder/adoptie",
    "src/components/beheerder/evenementen",
    "src/components/beheerder/medisch",
  ];

  const bestanden = roots.flatMap((root) =>
    readdirSync(root)
      .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
      .map((name) => join(root, name)),
  );

  it("vindt bestanden om na te kijken", () => {
    expect(bestanden.length).toBeGreaterThan(10);
  });

  it.each(bestanden)("%s bevat de naam niet letterlijk", (bestand) => {
    const inhoud = readFileSync(bestand, "utf8");
    expect(inhoud).not.toContain(SITE_NAME);
  });

  it.each(bestanden)("%s bevat het adres niet letterlijk", (bestand) => {
    const inhoud = readFileSync(bestand, "utf8");
    expect(inhoud).not.toContain(SHELTER_LOCATIONS.dogs.address);
  });
});
