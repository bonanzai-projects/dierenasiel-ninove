import { describe, it, expect } from "vitest";
import {
  cageResultsFor,
  catchSummary,
  parseCageCodes,
  wasSuccessfulFrom,
} from "./inspection-cages";

describe("parseCageCodes", () => {
  it("splitst het komma-veld op", () => {
    expect(parseCageCodes("K1,K7,K12")).toEqual(["K1", "K7", "K12"]);
  });

  it("verdraagt spaties rond de codes", () => {
    expect(parseCageCodes(" K1 , K7 ")).toEqual(["K1", "K7"]);
  });

  it("laat lege stukken weg", () => {
    expect(parseCageCodes("K1,,K7,")).toEqual(["K1", "K7"]);
  });

  it("geeft een lege lijst zonder kooien", () => {
    expect(parseCageCodes(null)).toEqual([]);
    expect(parseCageCodes("")).toEqual([]);
    expect(parseCageCodes("   ")).toEqual([]);
  });

  it("behoudt de volgorde zoals ingevuld", () => {
    expect(parseCageCodes("K12,K1,K7")).toEqual(["K12", "K1", "K7"]);
  });
});

describe("wasSuccessfulFrom", () => {
  it("is waar zodra één kooi vangst had", () => {
    expect(wasSuccessfulFrom(["K7"])).toBe(true);
  });

  it("is onwaar zonder vangst", () => {
    expect(wasSuccessfulFrom([])).toBe(false);
  });
});

describe("cageResultsFor", () => {
  it("maakt één rij per uitgezette kooi", () => {
    expect(cageResultsFor(["K1", "K7"], ["K7"])).toEqual([
      { cageCode: "K1", caught: false },
      { cageCode: "K7", caught: true },
    ]);
  });

  it("negeert vangst voor een kooi die niet uitgezet is", () => {
    // Anders kan een oud formulier een kooi binnensmokkelen die niet bij deze
    // campagne hoort.
    expect(cageResultsFor(["K1"], ["K9"])).toEqual([{ cageCode: "K1", caught: false }]);
  });

  it("geeft een lege lijst wanneer er geen kooien uitgezet zijn", () => {
    expect(cageResultsFor([], ["K1"])).toEqual([]);
  });
});

describe("catchSummary", () => {
  it("noemt de kooien met vangst", () => {
    expect(
      catchSummary([
        { cageCode: "K1", caught: false },
        { cageCode: "K7", caught: true },
        { cageCode: "K12", caught: true },
      ]),
    ).toBe("Vangst in K7, K12");
  });

  it("zegt het duidelijk wanneer geen enkele kooi vangst had", () => {
    expect(
      catchSummary([
        { cageCode: "K1", caught: false },
        { cageCode: "K7", caught: false },
      ]),
    ).toBe("Geen vangst");
  });

  it("geeft niets terug wanneer er geen kooien geregistreerd zijn", () => {
    // Oude inspecties van vóór deze story hebben geen kooirijen; daar valt het
    // scherm terug op het bestaande vinkje.
    expect(catchSummary([])).toBe("");
  });
});
