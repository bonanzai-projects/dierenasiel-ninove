import { describe, it, expect } from "vitest";
import {
  parseWeightInput,
  formatWeight,
  formatWeightDelta,
  sortWeighingsDesc,
  withWeightDeltas,
  weightSummary,
  buildWeightChart,
  MAX_WEIGHT_KG,
} from "./weight";

const weging = (date: string, weightKg: string, id = 1) => ({ id, date, weightKg });

describe("parseWeightInput", () => {
  it("aanvaardt een komma zoals mensen ze typen", () => {
    expect(parseWeightInput("32,5")).toBe(32.5);
  });

  it("aanvaardt ook een punt", () => {
    expect(parseWeightInput("32.5")).toBe(32.5);
  });

  it("negeert spaties en een kg-achtervoegsel", () => {
    expect(parseWeightInput("  3,4 kg ")).toBe(3.4);
    expect(parseWeightInput("3,4kg")).toBe(3.4);
  });

  it("houdt grammen over voor kittens", () => {
    expect(parseWeightInput("0,25")).toBe(0.25);
  });

  it("weigert leeg, tekst, nul en negatief", () => {
    expect(parseWeightInput("")).toBeNull();
    expect(parseWeightInput("   ")).toBeNull();
    expect(parseWeightInput("zwaar")).toBeNull();
    expect(parseWeightInput("0")).toBeNull();
    expect(parseWeightInput("-3")).toBeNull();
  });

  it("weigert een waarde die duidelijk in gram is ingetikt", () => {
    // 3400 gram i.p.v. 3,4 kg — dat is geen dier dat hier binnenkomt.
    expect(parseWeightInput("3400")).toBeNull();
    expect(parseWeightInput(String(MAX_WEIGHT_KG + 1))).toBeNull();
  });

  it("aanvaardt de bovengrens zelf", () => {
    expect(parseWeightInput(String(MAX_WEIGHT_KG))).toBe(MAX_WEIGHT_KG);
  });
});

describe("formatWeight", () => {
  it("toont kilo's met een komma", () => {
    expect(formatWeight("32.500")).toBe("32,5 kg");
  });

  it("laat nullen achteraan vallen", () => {
    expect(formatWeight("12.000")).toBe("12 kg");
    expect(formatWeight("0.250")).toBe("0,25 kg");
  });

  it("werkt ook met een getal", () => {
    expect(formatWeight(3.4)).toBe("3,4 kg");
  });

  it("geeft een streepje bij geen gewicht", () => {
    expect(formatWeight(null)).toBe("—");
  });
});

describe("formatWeightDelta", () => {
  it("zet een plus voor een toename", () => {
    expect(formatWeightDelta(0.4)).toBe("+0,4 kg");
  });

  it("zet een min voor een afname", () => {
    expect(formatWeightDelta(-1.25)).toBe("-1,25 kg");
  });

  it("geeft niets terug wanneer er geen verschil is", () => {
    expect(formatWeightDelta(0)).toBe("");
    expect(formatWeightDelta(null)).toBe("");
  });
});

describe("sortWeighingsDesc", () => {
  it("zet de recentste weging bovenaan", () => {
    const gesorteerd = sortWeighingsDesc([
      weging("2026-01-01", "10", 1),
      weging("2026-03-01", "12", 2),
      weging("2026-02-01", "11", 3),
    ]);
    expect(gesorteerd.map((w) => w.id)).toEqual([2, 3, 1]);
  });

  it("houdt bij dezelfde datum de laatst ingevoerde bovenaan", () => {
    const gesorteerd = sortWeighingsDesc([
      weging("2026-01-01", "10", 5),
      weging("2026-01-01", "11", 9),
    ]);
    expect(gesorteerd.map((w) => w.id)).toEqual([9, 5]);
  });

  it("wijzigt de oorspronkelijke lijst niet", () => {
    const lijst = [weging("2026-01-01", "10", 1), weging("2026-03-01", "12", 2)];
    const kopie = [...lijst];
    sortWeighingsDesc(lijst);
    expect(lijst).toEqual(kopie);
  });
});

describe("withWeightDeltas", () => {
  it("vergelijkt elke weging met de vorige (oudere) weging", () => {
    const rijen = withWeightDeltas([
      weging("2026-01-01", "10.000", 1),
      weging("2026-02-01", "11.500", 2),
      weging("2026-03-01", "11.000", 3),
    ]);

    // Recentste eerst
    expect(rijen.map((r) => r.id)).toEqual([3, 2, 1]);
    expect(rijen[0].delta).toBeCloseTo(-0.5);
    expect(rijen[1].delta).toBeCloseTo(1.5);
    expect(rijen[2].delta).toBeNull(); // de eerste weging heeft geen vorige
  });

  it("geeft een lege lijst terug voor geen wegingen", () => {
    expect(withWeightDeltas([])).toEqual([]);
  });
});

describe("weightSummary", () => {
  it("geeft het huidige gewicht en het verschil sinds de eerste weging", () => {
    const samenvatting = weightSummary([
      weging("2026-01-01", "10.000", 1),
      weging("2026-03-01", "12.500", 2),
    ]);
    expect(samenvatting.latest?.weightKg).toBe("12.500");
    expect(samenvatting.totalChange).toBeCloseTo(2.5);
    expect(samenvatting.count).toBe(2);
  });

  it("geeft geen verschil bij één enkele weging", () => {
    const samenvatting = weightSummary([weging("2026-01-01", "10.000", 1)]);
    expect(samenvatting.totalChange).toBeNull();
    expect(samenvatting.count).toBe(1);
  });

  it("geeft niets bij geen enkele weging", () => {
    const samenvatting = weightSummary([]);
    expect(samenvatting.latest).toBeNull();
    expect(samenvatting.totalChange).toBeNull();
    expect(samenvatting.count).toBe(0);
  });
});

describe("buildWeightChart", () => {
  const punten = [
    weging("2026-01-01", "10.000", 1),
    weging("2026-02-01", "11.000", 2),
    weging("2026-03-01", "12.000", 3),
  ];

  it("zet de oudste weging links en de recentste rechts", () => {
    const grafiek = buildWeightChart(punten, 300, 100);
    expect(grafiek.dots).toHaveLength(3);
    expect(grafiek.dots[0].x).toBe(0);
    expect(grafiek.dots[2].x).toBe(300);
    expect(grafiek.dots[0].weightKg).toBe(10);
  });

  it("zet het zwaarste punt bovenaan (kleinste y)", () => {
    const grafiek = buildWeightChart(punten, 300, 100);
    expect(grafiek.dots[2].y).toBeLessThan(grafiek.dots[0].y);
  });

  it("bouwt een lijn door alle punten", () => {
    const grafiek = buildWeightChart(punten, 300, 100);
    expect(grafiek.path.startsWith("M ")).toBe(true);
    expect(grafiek.path.split("L")).toHaveLength(3);
  });

  it("zet een enkele weging netjes in het midden i.p.v. te delen door nul", () => {
    const grafiek = buildWeightChart([weging("2026-01-01", "10.000", 1)], 300, 100);
    expect(grafiek.dots).toHaveLength(1);
    expect(grafiek.dots[0].y).toBe(50);
    expect(Number.isFinite(grafiek.dots[0].x)).toBe(true);
  });

  it("houdt een vlakke reeks in het midden", () => {
    const vlak = [weging("2026-01-01", "10.000", 1), weging("2026-02-01", "10.000", 2)];
    const grafiek = buildWeightChart(vlak, 300, 100);
    expect(grafiek.dots.every((d) => d.y === 50)).toBe(true);
  });

  it("geeft niets terug zonder wegingen", () => {
    const grafiek = buildWeightChart([], 300, 100);
    expect(grafiek.dots).toEqual([]);
    expect(grafiek.path).toBe("");
  });
});
