import { describe, it, expect } from "vitest";
import {
  CATEGORY_PATHS,
  assertReadPath,
  categoryPath,
  detailPath,
  isReadPath,
} from "./paths";

/**
 * Story 11.1 — de padlijst is laag 1 van de read-only garantie (zie
 * epic-11-koerswijziging-2026-07-26.md §3). Alles wat hier niet expliciet
 * toegelaten is, mag de deur niet uit.
 */

describe("isReadPath — de allowlist", () => {
  it("laat de drie categoriepaden door", () => {
    expect(CATEGORY_PATHS).toEqual(["/category/dogs", "/category/cats", "/category/other"]);
    for (const path of CATEGORY_PATHS) {
      expect(isReadPath(path)).toBe(true);
    }
  });

  it("laat een detailpad met een dier-id door", () => {
    expect(isReadPath("/animal/1880761")).toBe(true);
    expect(isReadPath("/animal/1")).toBe(true);
  });

  it("weigert het token-pad — dat hoort niet via de leesfunctie te lopen", () => {
    expect(isReadPath("/oauth/token")).toBe(false);
  });

  it("weigert een volledige URL in plaats van een pad", () => {
    expect(isReadPath("https://api.animalshelter.be/category/dogs")).toBe(false);
    expect(isReadPath("//elders.example/category/dogs")).toBe(false);
  });

  it("weigert een pad naar een andere host die op een leespad lijkt", () => {
    expect(isReadPath("http://elders.example/animal/1")).toBe(false);
  });

  it("weigert paden die met traversal buiten de lijst proberen te breken", () => {
    expect(isReadPath("/category/dogs/../../animal/1")).toBe(false);
    expect(isReadPath("/category/../oauth/token")).toBe(false);
  });

  it("weigert een querystring of fragment", () => {
    expect(isReadPath("/category/dogs?force=1")).toBe(false);
    expect(isReadPath("/category/dogs#x")).toBe(false);
  });

  it("weigert varianten die net naast de lijst vallen", () => {
    expect(isReadPath("/category/dogs/")).toBe(false);
    expect(isReadPath("/Category/Dogs")).toBe(false);
    expect(isReadPath("/category/birds")).toBe(false);
    expect(isReadPath("category/dogs")).toBe(false);
    expect(isReadPath("")).toBe(false);
  });

  it("weigert een detailpad zonder geldig id", () => {
    expect(isReadPath("/animal/")).toBe(false);
    expect(isReadPath("/animal/0")).toBe(false);
    expect(isReadPath("/animal/-1")).toBe(false);
    expect(isReadPath("/animal/abc")).toBe(false);
    expect(isReadPath("/animal/1/edit")).toBe(false);
    expect(isReadPath("/animal/1?x=2")).toBe(false);
  });
});

describe("assertReadPath", () => {
  it("laat een geldig pad zonder fout passeren", () => {
    expect(() => assertReadPath("/category/cats")).not.toThrow();
  });

  it("gooit met een duidelijke boodschap bij een verboden pad", () => {
    expect(() => assertReadPath("/animal/1/delete")).toThrow(/alleen-lezen/i);
  });
});

describe("padbouwers", () => {
  it("bouwt categoriepaden die zelf door de allowlist komen", () => {
    expect(categoryPath("dogs")).toBe("/category/dogs");
    expect(isReadPath(categoryPath("other"))).toBe(true);
  });

  it("bouwt een detailpad dat zelf door de allowlist komt", () => {
    expect(detailPath(1880761)).toBe("/animal/1880761");
    expect(isReadPath(detailPath(1880761))).toBe(true);
  });

  it("weigert een onzinnig dier-id te verpakken", () => {
    expect(() => detailPath(0)).toThrow();
    expect(() => detailPath(-3)).toThrow();
    expect(() => detailPath(1.5)).toThrow();
    expect(() => detailPath(Number.NaN)).toThrow();
  });
});
