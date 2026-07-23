import { describe, it, expect } from "vitest";
import { posterSterielLabel, posterAgeLine, posterPhotoUrls } from "./poster-format";

describe("posterSterielLabel", () => {
  it("gebruikt de tri-state uit story 10.29", () => {
    expect(posterSterielLabel(true)).toBe("ja");
    expect(posterSterielLabel(false)).toBe("nee");
    expect(posterSterielLabel(null)).toBe("niet gekend");
    expect(posterSterielLabel(undefined)).toBe("niet gekend");
  });
});

describe("posterAgeLine", () => {
  it("toont de geboortedatum met de leeftijd erachter", () => {
    // Leeftijd is 'nu'-afhankelijk: enkel de datum en de vorm worden vastgelegd.
    expect(posterAgeLine("2021-06-01")).toMatch(/^01-06-2021 \(\d+ (jaar|maanden)\)$/);
  });

  it("toont 'niet gekend' zonder geboortedatum", () => {
    expect(posterAgeLine(null)).toBe("niet gekend");
    expect(posterAgeLine("")).toBe("niet gekend");
    expect(posterAgeLine(undefined)).toBe("niet gekend");
  });
});

describe("posterPhotoUrls", () => {
  it("zet de hoofdfoto vooraan en vult aan met de extra foto's", () => {
    expect(posterPhotoUrls("/hoofd.jpg", ["/a.jpg", "/b.jpg"])).toEqual([
      "/hoofd.jpg",
      "/a.jpg",
      "/b.jpg",
    ]);
  });

  it("kapt af op vier foto's", () => {
    const urls = posterPhotoUrls("/hoofd.jpg", ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"]);
    expect(urls).toHaveLength(4);
    expect(urls).toEqual(["/hoofd.jpg", "/a.jpg", "/b.jpg", "/c.jpg"]);
  });

  it("ontdubbelt een hoofdfoto die ook in de lijst staat", () => {
    expect(posterPhotoUrls("/hoofd.jpg", ["/hoofd.jpg", "/a.jpg"])).toEqual([
      "/hoofd.jpg",
      "/a.jpg",
    ]);
  });

  it("negeert lege en whitespace-waarden", () => {
    expect(posterPhotoUrls(null, ["", "   ", "/a.jpg"])).toEqual(["/a.jpg"]);
    expect(posterPhotoUrls(undefined, null)).toEqual([]);
  });
});
