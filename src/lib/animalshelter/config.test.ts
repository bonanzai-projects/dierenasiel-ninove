import { describe, it, expect } from "vitest";
import { isAnimalShelterEnabled, readAnimalShelterConfig } from "./config";

const COMPLETE = {
  ANIMALSHELTER_ENABLED: "true",
  ANIMALSHELTER_CLIENT_ID: "2",
  ANIMALSHELTER_CLIENT_SECRET: "geheim",
  ANIMALSHELTER_USERNAME: "info@example.be",
  ANIMALSHELTER_PASSWORD: "wachtwoord",
};

/**
 * Story 11.1 — laag 4 van de read-only garantie: het bestuur moet de koppeling
 * kunnen laten uitzetten met één instelling, zonder release.
 */

describe("isAnimalShelterEnabled — de noodrem", () => {
  it("staat aan bij exact 'true'", () => {
    expect(isAnimalShelterEnabled(COMPLETE)).toBe(true);
    expect(isAnimalShelterEnabled({ ...COMPLETE, ANIMALSHELTER_ENABLED: " TRUE " })).toBe(true);
  });

  it("staat uit wanneer de variabele ontbreekt", () => {
    expect(isAnimalShelterEnabled({})).toBe(false);
  });

  it("staat uit bij elke andere waarde — twijfel betekent uit", () => {
    for (const value of ["false", "1", "ja", "yes", "", "aan"]) {
      expect(isAnimalShelterEnabled({ ...COMPLETE, ANIMALSHELTER_ENABLED: value })).toBe(false);
    }
  });
});

describe("readAnimalShelterConfig", () => {
  it("leest de vier credentials uit de omgeving", () => {
    expect(readAnimalShelterConfig(COMPLETE)).toEqual({
      clientId: "2",
      clientSecret: "geheim",
      username: "info@example.be",
      password: "wachtwoord",
    });
  });

  it("geeft null wanneer de koppeling uitstaat, ook al zijn de credentials er", () => {
    expect(readAnimalShelterConfig({ ...COMPLETE, ANIMALSHELTER_ENABLED: "false" })).toBeNull();
  });

  it("geeft null wanneer één credential ontbreekt of leeg is", () => {
    const keys = [
      "ANIMALSHELTER_CLIENT_ID",
      "ANIMALSHELTER_CLIENT_SECRET",
      "ANIMALSHELTER_USERNAME",
      "ANIMALSHELTER_PASSWORD",
    ] as const;
    for (const key of keys) {
      expect(readAnimalShelterConfig({ ...COMPLETE, [key]: "" })).toBeNull();
      const zonder = { ...COMPLETE } as Record<string, string | undefined>;
      delete zonder[key];
      expect(readAnimalShelterConfig(zonder)).toBeNull();
    }
  });

  it("knipt spaties weg rond de waarden", () => {
    const config = readAnimalShelterConfig({ ...COMPLETE, ANIMALSHELTER_USERNAME: "  info@example.be  " });
    expect(config?.username).toBe("info@example.be");
  });

  it("gebruikt geen enkele variabele met een NEXT_PUBLIC_-prefix", () => {
    const bron = readAnimalShelterConfig.toString();
    expect(bron).not.toContain("NEXT_PUBLIC");
  });
});
