import { describe, it, expect, vi } from "vitest";
import {
  classifyLocationType,
  isUsableMunicipality,
  buildGeocodeAttempts,
  pickBestMatch,
  isPlausibleMatch,
  geocodeAddress,
  type GeopuntLocation,
} from "./geocode";

const treffer = (over: Partial<GeopuntLocation> = {}): GeopuntLocation =>
  ({
    FormattedAddress: "Bosstraat 32A, 1755 Pajottegem",
    LocationType: "basisregisters_huisnummer_afgeleidVanObject",
    Location: { Lat_WGS84: 50.782315, Lon_WGS84: 4.117176 },
    ...over,
  }) as GeopuntLocation;

describe("classifyLocationType", () => {
  it("herkent een treffer op huisnummer", () => {
    expect(classifyLocationType("basisregisters_huisnummer_afgeleidVanObject")).toBe("huisnummer");
    expect(classifyLocationType("basisregisters_huisnummer_aangeduidDoorBeheerder")).toBe("huisnummer");
  });

  it("herkent straat- en gemeenteniveau", () => {
    expect(classifyLocationType("basisregisters_straat")).toBe("straat");
    expect(classifyLocationType("basisregisters_gemeente")).toBe("gemeente");
  });

  it("noemt de rest onbekend", () => {
    expect(classifyLocationType("iets_anders")).toBe("onbekend");
    expect(classifyLocationType("")).toBe("onbekend");
  });
});

describe("isUsableMunicipality", () => {
  it("aanvaardt een gewone gemeentenaam", () => {
    expect(isUsableMunicipality("Ninove")).toBe(true);
    expect(isUsableMunicipality("Sint-Pieters-Leeuw")).toBe(true);
  });

  it("weigert een opsomming van gemeenten", () => {
    // Het veld heet "Gemeente / Opdrachtgever" en bevat vaak de opdrachtgever.
    expect(isUsableMunicipality("Pajottegem Gooik/ Herne / Galmaarden")).toBe(false);
    expect(isUsableMunicipality("Gooik, Herne")).toBe(false);
  });

  it("weigert leeg of veel te lang", () => {
    expect(isUsableMunicipality("")).toBe(false);
    expect(isUsableMunicipality("   ")).toBe(false);
    expect(isUsableMunicipality("a".repeat(80))).toBe(false);
  });
});

describe("buildGeocodeAttempts", () => {
  it("probeert eerst het adres alleen", () => {
    // Gemeten: "condijstraat 49, Herne" geeft niets, "condijstraat 49" wel —
    // die straat ligt in Pajottegem. Het adres alleen is dus de beste eerste gok.
    expect(buildGeocodeAttempts("Bosstraat 32A Leerbeek", "Pajottegem Gooik/ Herne / Galmaarden"))
      .toEqual(["Bosstraat 32A Leerbeek"]);
  });

  it("probeert daarna met de gemeente erbij als die bruikbaar is", () => {
    expect(buildGeocodeAttempts("Minnenhofstraat 24", "Ninove"))
      .toEqual(["Minnenhofstraat 24", "Minnenhofstraat 24, Ninove"]);
  });

  it("herhaalt de gemeente niet als ze al in het adres staat", () => {
    expect(buildGeocodeAttempts("Minnenhofstraat 24, 9400 Ninove", "Ninove"))
      .toEqual(["Minnenhofstraat 24, 9400 Ninove"]);
  });

  it("geeft niets terug zonder adres", () => {
    expect(buildGeocodeAttempts("", "Ninove")).toEqual([]);
    expect(buildGeocodeAttempts("   ", "Ninove")).toEqual([]);
  });
});

describe("pickBestMatch", () => {
  it("kiest de treffer op huisnummer, ook als ze niet eerst staat", () => {
    const beste = pickBestMatch([
      treffer({ LocationType: "basisregisters_straat", FormattedAddress: "Bosstraat, Aalst" }),
      treffer(),
    ]);
    expect(beste?.matchType).toBe("huisnummer");
    expect(beste?.formattedAddress).toBe("Bosstraat 32A, 1755 Pajottegem");
    expect(beste?.lat).toBeCloseTo(50.782315);
    expect(beste?.lng).toBeCloseTo(4.117176);
  });

  it("valt terug op straatniveau wanneer er geen huisnummer bij is", () => {
    const beste = pickBestMatch([
      treffer({ LocationType: "basisregisters_gemeente", FormattedAddress: "Aarschot" }),
      treffer({ LocationType: "basisregisters_straat", FormattedAddress: "Kortestraat, Halle" }),
    ]);
    expect(beste?.matchType).toBe("straat");
    expect(beste?.formattedAddress).toBe("Kortestraat, Halle");
  });

  it("geeft niets terug bij een lege lijst", () => {
    expect(pickBestMatch([])).toBeNull();
  });

  it("negeert treffers zonder coördinaten", () => {
    expect(pickBestMatch([treffer({ Location: undefined })])).toBeNull();
  });
});

describe("geocodeAddress", () => {
  function nepFetch(perQuery: Record<string, GeopuntLocation[]>) {
    return vi.fn(async (url: string) => {
      const q = decodeURIComponent(new URL(url).searchParams.get("q") ?? "");
      return {
        ok: true,
        json: async () => ({ LocationResult: perQuery[q] ?? [] }),
      } as Response;
    });
  }

  it("vindt het adres met de eerste poging", async () => {
    const fetchImpl = nepFetch({ "Bosstraat 32A Leerbeek": [treffer()] });

    const result = await geocodeAddress("Bosstraat 32A Leerbeek", "Pajottegem Gooik/ Herne / Galmaarden", fetchImpl);

    expect(result?.matchType).toBe("huisnummer");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("probeert het adres mét gemeente wanneer de eerste poging geen huisnummer vindt", async () => {
    const fetchImpl = nepFetch({
      "Minnenhofstraat 24": [treffer({ LocationType: "basisregisters_straat" })],
      "Minnenhofstraat 24, Ninove": [treffer()],
    });

    const result = await geocodeAddress("Minnenhofstraat 24", "Ninove", fetchImpl);

    expect(result?.matchType).toBe("huisnummer");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("houdt de beste van de pogingen wanneer geen enkele een huisnummer geeft", async () => {
    const fetchImpl = nepFetch({
      "Dorpsstraat": [treffer({ LocationType: "basisregisters_straat", FormattedAddress: "Dorpsstraat, Laarne" })],
      "Dorpsstraat, Laarne": [],
    });

    const result = await geocodeAddress("Dorpsstraat", "Laarne", fetchImpl);

    expect(result?.matchType).toBe("straat");
  });

  it("geeft null bij onvindbare onzin", async () => {
    const fetchImpl = nepFetch({});
    expect(await geocodeAddress("gd", "Laarne", fetchImpl)).toBeNull();
  });

  it("geeft null zonder adres, zonder het register te bevragen", async () => {
    const fetchImpl = nepFetch({});
    expect(await geocodeAddress("", "Ninove", fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("laat een storing van het register niet doorslaan naar de oproeper", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("netwerk plat");
    });

    await expect(geocodeAddress("Bosstraat 32A", "Ninove", fetchImpl)).resolves.toBeNull();
  });

  it("slikt een foutstatus van het register", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response);
    expect(await geocodeAddress("Bosstraat 32A", "Ninove", fetchImpl)).toBeNull();
  });
});

// Gemeten bij de backfill: "gd" leverde "Abingdonstraat, Sint-Niklaas" op en
// "test" leverde "Testeltsebaan, Herselt". Zo'n gok tonen is erger dan niets.
describe("isPlausibleMatch", () => {
  it("aanvaardt een treffer die een woord uit de invoer deelt", () => {
    expect(isPlausibleMatch("Dorpsstraat", "Dorpsstraat, Laarne")).toBe(true);
    expect(isPlausibleMatch("kapelstraat 15", "Kapelstraat 15, 1755 Pajottegem")).toBe(true);
  });

  it("weigert een gok die niets met de invoer te maken heeft", () => {
    expect(isPlausibleMatch("gd", "Abingdonstraat, Sint-Niklaas")).toBe(false);
    expect(isPlausibleMatch("test", "Testeltsebaan, Herselt")).toBe(false);
    expect(isPlausibleMatch("gd, Laarne", "Aarschot")).toBe(false);
  });

  it("laat zich niet foppen door hoofdletters of leestekens", () => {
    expect(isPlausibleMatch("BOSSTRAAT 32a, leerbeek", "Bosstraat 32A, 1755 Pajottegem")).toBe(true);
  });
});

describe("geocodeAddress — vage treffers", () => {
  function nepFetch(results: GeopuntLocation[]) {
    return vi.fn(async () => ({ ok: true, json: async () => ({ LocationResult: results }) }) as Response);
  }

  it("houdt een straattreffer die bij de invoer past", async () => {
    const result = await geocodeAddress(
      "Dorpsstraat",
      "Laarne",
      nepFetch([treffer({ LocationType: "basisregisters_straat", FormattedAddress: "Dorpsstraat, Laarne" })]),
    );
    expect(result?.matchType).toBe("straat");
  });

  it("verwerpt een straattreffer die niets met de invoer te maken heeft", async () => {
    const result = await geocodeAddress(
      "gd",
      "Laarne",
      nepFetch([treffer({ LocationType: "basisregisters_straat", FormattedAddress: "Abingdonstraat, Sint-Niklaas" })]),
    );
    expect(result).toBeNull();
  });

  it("laat een kloppende gemeente geen vage straattreffer goedpraten", async () => {
    // "test, Halle" gaf "Kortestraat, Halle": enkel de gemeente kwam overeen.
    const result = await geocodeAddress(
      "test",
      "Halle",
      nepFetch([treffer({ LocationType: "basisregisters_straat", FormattedAddress: "Kortestraat, Halle" })]),
    );
    expect(result).toBeNull();
  });

  it("laat een huisnummertreffer altijd door — die is per definitie het adres", async () => {
    const result = await geocodeAddress("Bosstraat 32A Leerbeek", "Pajottegem", nepFetch([treffer()]));
    expect(result?.matchType).toBe("huisnummer");
  });
});
