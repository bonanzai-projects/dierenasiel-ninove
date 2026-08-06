import { describe, it, expect } from "vitest";
import {
  MATERIAL_ORIGINS,
  originLabel,
  needsReturn,
  materialLine,
  materialSummary,
  sortMaterials,
  type Material,
} from "./materials";

const spul = (over: Partial<Material> & { id: number }): Material => ({
  name: "Tent",
  quantity: null,
  origin: "geleend",
  supplier: null,
  arranged: false,
  returned: false,
  sortOrder: 0,
  ...over,
});

describe("herkomst", () => {
  it("kent de manieren waarop materiaal er komt", () => {
    expect(MATERIAL_ORIGINS.map((o) => o.key)).toEqual([
      "eigen",
      "geleend",
      "gehuurd",
      "gekocht",
    ]);
  });

  it("geeft elke herkomst een label", () => {
    expect(originLabel("geleend")).toBe("Geleend");
    expect(originLabel("bestaat-niet")).toBe("bestaat-niet");
  });
});

describe("needsReturn", () => {
  it("wat geleend of gehuurd is, moet terug", () => {
    expect(needsReturn("geleend")).toBe(true);
    expect(needsReturn("gehuurd")).toBe(true);
  });

  it("wat van onszelf is of gekocht werd, niet", () => {
    expect(needsReturn("eigen")).toBe(false);
    expect(needsReturn("gekocht")).toBe(false);
  });
});

describe("materialLine", () => {
  it("zet het aantal vooraan wanneer het er is", () => {
    expect(materialLine(spul({ id: 1, name: "Tafels", quantity: 12 }))).toBe("12 × Tafels");
  });

  it("laat het aantal weg wanneer het niet ingevuld is", () => {
    expect(materialLine(spul({ id: 1, name: "Frigo" }))).toBe("Frigo");
  });

  it("noemt de leverancier erbij wanneer die er is", () => {
    expect(materialLine(spul({ id: 1, name: "Tent", quantity: 2, supplier: "Chiro Ninove" }))).toBe(
      "2 × Tent (Chiro Ninove)",
    );
  });
});

describe("sortMaterials", () => {
  it("houdt de invoervolgorde aan", () => {
    const gesorteerd = sortMaterials([
      spul({ id: 3, sortOrder: 2 }),
      spul({ id: 1, sortOrder: 1 }),
      spul({ id: 2, sortOrder: 1 }),
    ]);
    expect(gesorteerd.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});

describe("materialSummary", () => {
  it("telt wat er nog te regelen is en wat er terug moet", () => {
    const totaal = materialSummary([
      spul({ id: 1, origin: "geleend", arranged: false, returned: false }),
      spul({ id: 2, origin: "geleend", arranged: true, returned: false }),
      spul({ id: 3, origin: "gehuurd", arranged: true, returned: true }),
      spul({ id: 4, origin: "eigen", arranged: false, returned: false }),
      spul({ id: 5, origin: "gekocht", arranged: true, returned: false }),
    ]);
    // #1 en #2 zijn geleend en nog niet terug; #3 is al terugbezorgd.
    expect(totaal).toEqual({ totaal: 5, teRegelen: 2, terugTeBrengen: 2 });
  });

  it("telt eigen materiaal niet mee als 'terug te brengen'", () => {
    const totaal = materialSummary([spul({ id: 1, origin: "eigen", arranged: true })]);
    expect(totaal.terugTeBrengen).toBe(0);
  });

  it("geeft nullen terug voor een lege lijst", () => {
    expect(materialSummary([])).toEqual({ totaal: 0, teRegelen: 0, terugTeBrengen: 0 });
  });
});
