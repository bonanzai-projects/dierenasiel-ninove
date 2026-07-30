/**
 * Gewichtsopvolging per dier (Story 10.55, vraag Sven): niet één gewicht bij
 * intake, maar een reeks wegingen waaruit je de evolutie ziet. Pure functies,
 * zodat het rekenwerk zonder databank te testen valt.
 */

/**
 * Bovengrens in kg. Vooral bedoeld om een invoer in gram te onderscheppen
 * ("3400" i.p.v. "3,4"): de zwaarste hond weegt geen 200 kg.
 */
export const MAX_WEIGHT_KG = 200;

export type Weighing = {
  id: number;
  date: string;
  /** Zoals de databank het teruggeeft: een decimale tekst, bv. "32.500". */
  weightKg: string;
};

/**
 * Leest wat iemand intikt: "32,5", "32.5", "3,4 kg". Geeft null bij onzin,
 * bij nul of minder, en bij een waarde boven `MAX_WEIGHT_KG`.
 */
export function parseWeightInput(input: string): number | null {
  const opgeschoond = input.trim().toLowerCase().replace(/kg$/, "").trim().replace(",", ".");
  if (!opgeschoond) return null;
  if (!/^\d+(\.\d+)?$/.test(opgeschoond)) return null;

  const waarde = Number(opgeschoond);
  if (!Number.isFinite(waarde) || waarde <= 0 || waarde > MAX_WEIGHT_KG) return null;
  return waarde;
}

/** "32.500" -> "32,5 kg". Nullen achteraan vallen weg; niets wordt "—". */
export function formatWeight(weightKg: string | number | null | undefined): string {
  const waarde = formatWeightValue(weightKg);
  return waarde ? `${waarde} kg` : "—";
}

/**
 * Alleen het getal: "32.500" -> "32,5". Voor plaatsen met een eigen eenheid,
 * zoals het Kg-vakje op de kennelkaart. Leeg wanneer er geen gewicht is.
 */
export function formatWeightValue(weightKg: string | number | null | undefined): string {
  if (weightKg === null || weightKg === undefined || weightKg === "") return "";
  const waarde = typeof weightKg === "number" ? weightKg : Number(weightKg);
  if (!Number.isFinite(waarde)) return "";
  return getal(waarde);
}

/** Verschil met de vorige weging: "+0,4 kg" / "-1,25 kg". Geen verschil = niets. */
export function formatWeightDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "";
  const afgerond = Math.round(delta * 1000) / 1000;
  if (afgerond === 0) return "";
  return `${afgerond > 0 ? "+" : "-"}${getal(Math.abs(afgerond))} kg`;
}

/** Recentste weging eerst; bij dezelfde datum de laatst ingevoerde eerst. */
export function sortWeighingsDesc<T extends Weighing>(weighings: T[]): T[] {
  return [...weighings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.id - a.id;
  });
}

export type WeighingWithDelta<T extends Weighing = Weighing> = T & {
  /** Verschil in kg met de vorige (oudere) weging; null voor de eerste. */
  delta: number | null;
};

/** Recentste eerst, elk met het verschil tegenover de weging ervóór. */
export function withWeightDeltas<T extends Weighing>(weighings: T[]): WeighingWithDelta<T>[] {
  const aflopend = sortWeighingsDesc(weighings);

  return aflopend.map((weging, i) => {
    const vorige = aflopend[i + 1];
    return {
      ...weging,
      delta: vorige ? Number(weging.weightKg) - Number(vorige.weightKg) : null,
    };
  });
}

export type WeightSummary<T extends Weighing = Weighing> = {
  latest: T | null;
  first: T | null;
  /** Verschil tussen de eerste en de laatste weging; null bij minder dan twee. */
  totalChange: number | null;
  count: number;
};

export function weightSummary<T extends Weighing>(weighings: T[]): WeightSummary<T> {
  const aflopend = sortWeighingsDesc(weighings);
  const latest = aflopend[0] ?? null;
  const first = aflopend[aflopend.length - 1] ?? null;

  return {
    latest,
    first,
    totalChange:
      latest && first && aflopend.length > 1
        ? Number(latest.weightKg) - Number(first.weightKg)
        : null,
    count: weighings.length,
  };
}

export type WeightChartDot = { x: number; y: number; weightKg: number; date: string };
export type WeightChart = {
  path: string;
  dots: WeightChartDot[];
  min: number;
  max: number;
};

/**
 * Rekent de wegingen om naar coördinaten voor een klein lijngrafiekje
 * (oudste links). Bij één weging of een vlakke reeks komt alles op halve
 * hoogte, zodat er nooit door nul gedeeld wordt.
 */
export function buildWeightChart(
  weighings: Weighing[],
  width: number,
  height: number,
): WeightChart {
  const oplopend = sortWeighingsDesc(weighings).reverse();
  if (oplopend.length === 0) return { path: "", dots: [], min: 0, max: 0 };

  const waarden = oplopend.map((w) => Number(w.weightKg));
  const min = Math.min(...waarden);
  const max = Math.max(...waarden);
  const spanne = max - min;

  const dots: WeightChartDot[] = oplopend.map((weging, i) => {
    const waarde = Number(weging.weightKg);
    return {
      x: oplopend.length === 1 ? width / 2 : (i / (oplopend.length - 1)) * width,
      y: spanne === 0 ? height / 2 : height - ((waarde - min) / spanne) * height,
      weightKg: waarde,
      date: weging.date,
    };
  });

  const path = dots
    .map((dot, i) => `${i === 0 ? "M" : "L"} ${round(dot.x)} ${round(dot.y)}`)
    .join(" ");

  return { path, dots, min, max };
}

/** 32.5 -> "32,5", 12 -> "12", 0.25 -> "0,25" (max 3 cijfers na de komma). */
function getal(waarde: number): string {
  return waarde
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
    .replace(".", ",");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
