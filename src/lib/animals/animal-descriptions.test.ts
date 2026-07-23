import { describe, it, expect } from "vitest";
import {
  resolveWebsiteDescription,
  resolvePosterDescription,
} from "./animal-descriptions";

// Story 10.32: de uitgebreide beschrijving is de werktekst; website en affiche
// hebben elk een eigen tekst die daarop mag afwijken. Zolang zo'n eigen tekst
// leeg is, valt het oppervlak terug op de uitgebreide beschrijving — zo staat
// er nooit plots niets op de website of op het blad.

describe("resolveWebsiteDescription", () => {
  it("gebruikt de websitetekst wanneer die is ingevuld", () => {
    expect(resolveWebsiteDescription("Site-tekst", "Werktekst")).toBe("Site-tekst");
  });

  it("valt terug op de uitgebreide beschrijving wanneer de websitetekst leeg is", () => {
    expect(resolveWebsiteDescription(null, "Werktekst")).toBe("Werktekst");
    expect(resolveWebsiteDescription("", "Werktekst")).toBe("Werktekst");
    expect(resolveWebsiteDescription("   ", "Werktekst")).toBe("Werktekst");
    expect(resolveWebsiteDescription(undefined, "Werktekst")).toBe("Werktekst");
  });

  it("geeft een lege string wanneer beide leeg zijn", () => {
    expect(resolveWebsiteDescription(null, null)).toBe("");
    expect(resolveWebsiteDescription("  ", "  ")).toBe("");
  });

  it("trimt de gekozen tekst", () => {
    expect(resolveWebsiteDescription("  Site-tekst  ", "Werktekst")).toBe("Site-tekst");
  });
});

describe("resolvePosterDescription", () => {
  it("gebruikt de affichetekst wanneer die is ingevuld", () => {
    expect(resolvePosterDescription("Affiche-tekst", "Werktekst")).toBe("Affiche-tekst");
  });

  it("valt terug op de uitgebreide beschrijving wanneer de affichetekst leeg is", () => {
    expect(resolvePosterDescription(null, "Werktekst")).toBe("Werktekst");
    expect(resolvePosterDescription("", "Werktekst")).toBe("Werktekst");
  });

  it("valt NIET terug op de websitetekst — die staat hier los van", () => {
    expect(resolvePosterDescription(null, "")).toBe("");
  });
});
