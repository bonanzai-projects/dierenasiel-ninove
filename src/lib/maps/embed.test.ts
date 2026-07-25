import { describe, it, expect } from "vitest";
import { buildMapQuery, buildMapEmbedUrl, buildMapLinkUrl } from "./embed";

describe("buildMapQuery", () => {
  it("combineert adres, gemeente en land tot één zoekterm", () => {
    expect(buildMapQuery({ address: "Brusselsesteenweg 1", municipality: "Ninove" })).toBe(
      "Brusselsesteenweg 1, Ninove, België",
    );
  });

  it("normaliseert nieuwe regels en dubbele spaties uit het adres-tekstvak", () => {
    expect(
      buildMapQuery({ address: "Brusselsesteenweg 1\nachter   het containerpark", municipality: "Ninove" }),
    ).toBe("Brusselsesteenweg 1 achter het containerpark, Ninove, België");
  });

  it("dupliceert de gemeente niet wanneer ze al in het adres staat", () => {
    expect(buildMapQuery({ address: "Brusselsesteenweg 1, 9400 Ninove", municipality: "Ninove" })).toBe(
      "Brusselsesteenweg 1, 9400 Ninove, België",
    );
  });

  it("voegt het land niet nog eens toe wanneer het al vermeld is", () => {
    expect(buildMapQuery({ address: "Brusselsesteenweg 1, Ninove, Belgium", municipality: "Ninove" })).toBe(
      "Brusselsesteenweg 1, Ninove, Belgium",
    );
  });

  it("werkt zonder gemeente", () => {
    expect(buildMapQuery({ address: "Brusselsesteenweg 1" })).toBe("Brusselsesteenweg 1, België");
  });

  it("geeft een lege string zonder (zinvol) adres", () => {
    expect(buildMapQuery({ address: "" })).toBe("");
    expect(buildMapQuery({ address: "   \n  ", municipality: "Ninove" })).toBe("");
  });
});

describe("buildMapEmbedUrl", () => {
  it("bouwt een insluitbare Google Maps-URL met de zoekterm ge-encodeerd", () => {
    const url = buildMapEmbedUrl({ address: "Brusselsesteenweg 1", municipality: "Ninove" });
    expect(url).toContain("output=embed");
    expect(url).toContain(encodeURIComponent("Brusselsesteenweg 1, Ninove, België"));
  });

  it("geeft null zonder adres, zodat de UI geen lege kaart toont", () => {
    expect(buildMapEmbedUrl({ address: "" })).toBeNull();
  });
});

describe("buildMapLinkUrl", () => {
  it("bouwt een link om het adres in Google Maps zelf te openen", () => {
    const url = buildMapLinkUrl({ address: "Brusselsesteenweg 1", municipality: "Ninove" });
    expect(url).toContain("google.com/maps/search/");
    expect(url).toContain(encodeURIComponent("Brusselsesteenweg 1, Ninove, België"));
  });

  it("geeft null zonder adres", () => {
    expect(buildMapLinkUrl({ address: "  " })).toBeNull();
  });
});
