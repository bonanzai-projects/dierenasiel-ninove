import { describe, it, expect } from "vitest";
import { BEHEERDER_NAV_ITEMS } from "./index";
import {
  LAPTOP_VIEWPORT_HEIGHT,
  fitsWithoutScrolling,
  maxItemsThatFit,
  sidebarHeightFor,
} from "./sidebar-fit";

describe("sidebarHeightFor", () => {
  it("telt kop, opvulling en items op", () => {
    // 51 (kop) + 24 (opvulling) + 1×28 = 103
    expect(sidebarHeightFor(1)).toBe(103);
  });

  it("rekent de tussenruimte tussen items mee, niet erna", () => {
    expect(sidebarHeightFor(2)).toBe(103 + 28 + 2);
  });

  it("geeft een lege zijbalk enkel kop en opvulling", () => {
    expect(sidebarHeightFor(0)).toBe(75);
  });
});

describe("de zijbalk past op een laptop", () => {
  it("past met alle huidige menu-items", () => {
    const aantal = BEHEERDER_NAV_ITEMS.length;
    const hoogte = sidebarHeightFor(aantal);

    expect(
      fitsWithoutScrolling(aantal),
      `De zijbalk heeft ${aantal} items nodig (${hoogte}px) en dat past niet in ` +
        `${LAPTOP_VIEWPORT_HEIGHT}px. Er passen er hoogstens ${maxItemsThatFit()}. ` +
        `Groepeer items of maak ze compacter in Sidebar.tsx — en pas dan de ` +
        `constanten in sidebar-fit.ts mee aan.`,
    ).toBe(true);
  });

  it("houdt nog ruimte over voor minstens één extra item", () => {
    // Zodat de volgende toevoeging geen verbouwing wordt.
    expect(fitsWithoutScrolling(BEHEERDER_NAV_ITEMS.length + 1)).toBe(true);
  });

  it("zegt eerlijk waar de grens ligt", () => {
    const max = maxItemsThatFit();
    expect(fitsWithoutScrolling(max)).toBe(true);
    expect(fitsWithoutScrolling(max + 1)).toBe(false);
  });

  it("past ook op een krappere 720px-laptop", () => {
    expect(fitsWithoutScrolling(BEHEERDER_NAV_ITEMS.length, 600)).toBe(true);
  });
});
