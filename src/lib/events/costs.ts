/**
 * Epic 13, story 13.5 — kosten en opbrengsten van een evenement.
 *
 * Sven (vraag 14, 2026-08-06): vandaag is er géén begroting, enkel de rekening
 * achteraf. Op het voorstel "begroot naast werkelijk in dezelfde lijn": "Duim duim".
 * Daarom staan beide bedragen op één rij — zo zie je volgend jaar waar je ernaast zat,
 * zonder twee lijsten te moeten vergelijken.
 *
 * Kosten en opbrengsten delen één tabel met een soort-veld: bij een eetfestijn is de
 * vraag niet "wat kostte het" maar "wat hield het over".
 *
 * Pure logica, geen database.
 */

export type CostKind = "kost" | "opbrengst";

export interface CostCategory {
  key: string;
  label: string;
}

/**
 * Sven, vraag 15: "zaalhuur, drank, traiteur, vlees, drukwerk" + "T-shirts vrijwilligers".
 * Sabam/billijke vergoeding en verzekering heeft hij niet aangeduid, maar Johan
 * bevestigde op 2026-08-06 dat ze erbij mogen.
 */
export const COST_CATEGORIES: readonly CostCategory[] = [
  { key: "zaalhuur", label: "Zaalhuur" },
  { key: "drank", label: "Drank" },
  { key: "traiteur", label: "Traiteur" },
  { key: "vlees", label: "Vlees" },
  { key: "drukwerk", label: "Drukwerk" },
  { key: "tshirts", label: "T-shirts vrijwilligers" },
  { key: "sabam", label: "Sabam / billijke vergoeding" },
  { key: "verzekering", label: "Verzekering" },
  { key: "andere", label: "Andere" },
] as const;

/** Sven, vraag 16: "eten, drank, tombola, sponsors, vrije giften, verkoop aan de kassa". */
export const REVENUE_CATEGORIES: readonly CostCategory[] = [
  { key: "eten", label: "Eten" },
  { key: "drank", label: "Drank" },
  { key: "tombola", label: "Tombola" },
  { key: "sponsors", label: "Sponsors" },
  { key: "giften", label: "Vrije giften" },
  { key: "kassaverkoop", label: "Verkoop aan de kassa" },
  { key: "andere", label: "Andere" },
] as const;

export function categoriesForKind(kind: CostKind): readonly CostCategory[] {
  return kind === "opbrengst" ? REVENUE_CATEGORIES : COST_CATEGORIES;
}

/** Een categorie hoort bij één soort: "tombola" bestaat enkel als opbrengst. */
export function categoryLabel(kind: CostKind, key: string): string {
  if (!key) return "";
  return categoriesForKind(kind).find((c) => c.key === key)?.label ?? key;
}

export const COST_CATEGORY_KEYS = COST_CATEGORIES.map((c) => c.key);
export const REVENUE_CATEGORY_KEYS = REVENUE_CATEGORIES.map((c) => c.key);

export interface CostLine {
  id: number;
  kind: CostKind;
  category: string;
  description: string;
  /** Bedragen komen als tekst uit de databank (numeric). Leeg = niet ingevuld. */
  budgetAmount: string | null;
  actualAmount: string | null;
  supplier: string | null;
  paid: boolean;
  sortOrder: number;
}

const MAX_BEDRAG = 1_000_000;

export type ParsedAmount =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/**
 * Leest wat iemand intypt: "12,50", "12.50", "€ 400", "1.234,56", "1.500".
 *
 * Eén punt gevolgd door precies drie cijfers is een duizendtalteken ("1.500" = 1500);
 * in alle andere gevallen is een punt een decimaalteken ("12.50" = 12,50). Dat is de
 * lezing die bij ons het vaakst klopt, en ze is voorspelbaar.
 */
export function parseAmount(raw: string): ParsedAmount {
  const schoon = (raw ?? "")
    .replace(/[€\s ]/g, "")
    .trim();

  if (schoon === "") return { ok: true, value: null };

  let genormaliseerd = schoon;
  if (schoon.includes(",")) {
    // Beide tekens: de punt is dan altijd het duizendtalteken.
    genormaliseerd = schoon.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{3}$/.test(schoon)) {
    genormaliseerd = schoon.replace(".", "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(genormaliseerd)) {
    return { ok: false, error: "Ongeldig bedrag" };
  }

  const waarde = Number(genormaliseerd);
  if (!Number.isFinite(waarde)) return { ok: false, error: "Ongeldig bedrag" };
  if (waarde < 0) return { ok: false, error: "Een bedrag kan niet negatief zijn" };
  if (waarde > MAX_BEDRAG) return { ok: false, error: "Dit bedrag lijkt niet te kloppen" };

  return { ok: true, value: Math.round(waarde * 100) / 100 };
}

/** 1234.5 → "€ 1.234,50". Een ontbrekend bedrag blijft leeg, geen "€ 0,00". */
export function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const getal = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(getal)) return "";
  return `€ ${getal.toLocaleString("nl-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function centen(value: string | null): number {
  if (value === null || value === "") return 0;
  const getal = Number(value);
  return Number.isFinite(getal) ? Math.round(getal * 100) : 0;
}

/**
 * Het verschil tussen begroot en werkelijk, met de vraag die er echt toe doet:
 * is dat goed nieuws? Bij een kost is méér ongunstig, bij een opbrengst gunstig.
 * Ontbreekt een van beide bedragen, dan valt er niets te vergelijken.
 */
export function lineDelta(line: CostLine): { value: number | null; gunstig: boolean | null } {
  if (!line.budgetAmount || !line.actualAmount) return { value: null, gunstig: null };
  const verschil = (centen(line.actualAmount) - centen(line.budgetAmount)) / 100;
  if (verschil === 0) return { value: 0, gunstig: null };
  return { value: verschil, gunstig: line.kind === "opbrengst" ? verschil > 0 : verschil < 0 };
}

export function splitCostLines<T extends { kind: CostKind; sortOrder: number; id: number }>(
  lines: readonly T[],
): { kosten: T[]; opbrengsten: T[] } {
  const sorteer = (a: T, b: T) => a.sortOrder - b.sortOrder || a.id - b.id;
  return {
    kosten: lines.filter((l) => l.kind !== "opbrengst").sort(sorteer),
    opbrengsten: lines.filter((l) => l.kind === "opbrengst").sort(sorteer),
  };
}

/**
 * Het minimum om mee te kunnen optellen. Bewust losser dan `CostLine`, zodat een rij
 * zoals ze uit de databank komt (waar `kind` gewoon tekst is) er ook in past.
 */
export interface CostAmounts {
  kind: string;
  budgetAmount: string | null;
  actualAmount: string | null;
}

export interface CostSummary {
  kosten: { begroot: number; werkelijk: number };
  opbrengsten: { begroot: number; werkelijk: number };
  netto: { begroot: number; werkelijk: number };
}

/** Optellen gebeurt in centen: 0,10 + 0,20 moet exact 0,30 zijn, niet 0,30000000000000004. */
export function summarizeCosts(lines: readonly CostAmounts[]): CostSummary {
  const totaal = {
    kostBegroot: 0,
    kostWerkelijk: 0,
    opbrengstBegroot: 0,
    opbrengstWerkelijk: 0,
  };

  for (const line of lines) {
    if (line.kind === "opbrengst") {
      totaal.opbrengstBegroot += centen(line.budgetAmount);
      totaal.opbrengstWerkelijk += centen(line.actualAmount);
    } else {
      totaal.kostBegroot += centen(line.budgetAmount);
      totaal.kostWerkelijk += centen(line.actualAmount);
    }
  }

  return {
    kosten: { begroot: totaal.kostBegroot / 100, werkelijk: totaal.kostWerkelijk / 100 },
    opbrengsten: {
      begroot: totaal.opbrengstBegroot / 100,
      werkelijk: totaal.opbrengstWerkelijk / 100,
    },
    netto: {
      begroot: (totaal.opbrengstBegroot - totaal.kostBegroot) / 100,
      werkelijk: (totaal.opbrengstWerkelijk - totaal.kostWerkelijk) / 100,
    },
  };
}
