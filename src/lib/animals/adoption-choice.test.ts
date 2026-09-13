import { describe, it, expect } from "vitest";
import { adoptionChoice } from "./adoption-choice";

// Story 10.68 — de keuzelijst op de adoptieaanvraag toont een foto van het gekozen dier.

describe("adoptionChoice", () => {
  it("neemt de hoofdfoto", () => {
    expect(
      adoptionChoice({ name: "Marie", imageUrl: "https://x/marie.jpg", images: ["https://x/andere.jpg"] }),
    ).toEqual({ name: "Marie", photoUrl: "https://x/marie.jpg" });
  });

  it("valt terug op de eerste andere foto wanneer er geen hoofdfoto is", () => {
    expect(adoptionChoice({ name: "Fons", imageUrl: null, images: ["", "https://x/fons.jpg"] })).toEqual({
      name: "Fons",
      photoUrl: "https://x/fons.jpg",
    });
  });

  it("geeft null zonder enige foto", () => {
    expect(adoptionChoice({ name: "Rex", imageUrl: "", images: null })).toEqual({ name: "Rex", photoUrl: null });
  });

  it("gebruikt enkel de publieke naam — de echte naam hoort niet op het publieke formulier", () => {
    // Zoals een volledige rij uit de databank: die draagt ook de echte naam.
    const rij = { name: "Marie", aliasName: "Feliz", imageUrl: null, images: null };
    const keuze = adoptionChoice(rij);
    expect(keuze.name).toBe("Marie");
    expect(JSON.stringify(keuze)).not.toContain("Feliz");
  });
});
