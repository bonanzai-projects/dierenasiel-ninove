import { describe, it, expect } from "vitest";
import {
  COST_CATEGORIES,
  REVENUE_CATEGORIES,
  categoriesForKind,
  categoryLabel,
  parseAmount,
  formatAmount,
  lineDelta,
  splitCostLines,
  summarizeCosts,
  type CostLine,
} from "./costs";

const lijn = (over: Partial<CostLine> & { id: number }): CostLine => ({
  kind: "kost",
  category: "drank",
  description: "Drank",
  budgetAmount: null,
  actualAmount: null,
  supplier: null,
  paid: false,
  sortOrder: 0,
  ...over,
});

describe("categorieën", () => {
  // Sven, vraag 15/16 (2026-08-06).
  it("gebruikt de kostenposten die Sven opsomde, plus Sabam en verzekering", () => {
    expect(COST_CATEGORIES.map((c) => c.key)).toEqual([
      "zaalhuur",
      "drank",
      "traiteur",
      "vlees",
      "drukwerk",
      "tshirts",
      "sabam",
      "verzekering",
      "andere",
    ]);
  });

  it("gebruikt de opbrengsten die Sven opsomde", () => {
    expect(REVENUE_CATEGORIES.map((c) => c.key)).toEqual([
      "eten",
      "drank",
      "tombola",
      "sponsors",
      "giften",
      "kassaverkoop",
      "andere",
    ]);
  });

  it("geeft per soort de juiste lijst", () => {
    expect(categoriesForKind("kost")).toBe(COST_CATEGORIES);
    expect(categoriesForKind("opbrengst")).toBe(REVENUE_CATEGORIES);
  });

  it("leest een categorie binnen haar eigen soort — 'drank' bestaat aan beide kanten", () => {
    expect(categoryLabel("kost", "drank")).toBe("Drank");
    expect(categoryLabel("opbrengst", "drank")).toBe("Drank");
    expect(categoryLabel("kost", "tombola")).toBe("tombola"); // bestaat enkel als opbrengst
    expect(categoryLabel("kost", "")).toBe("");
  });
});

describe("parseAmount", () => {
  it("leest een komma als decimaalteken", () => {
    expect(parseAmount("12,50")).toEqual({ ok: true, value: 12.5 });
  });

  it("leest een punt als decimaalteken", () => {
    expect(parseAmount("12.50")).toEqual({ ok: true, value: 12.5 });
  });

  it("leest een punt met drie cijfers erna als duizendtalteken", () => {
    expect(parseAmount("1.500")).toEqual({ ok: true, value: 1500 });
  });

  it("leest de Belgische schrijfwijze met beide tekens", () => {
    expect(parseAmount("1.234,56")).toEqual({ ok: true, value: 1234.56 });
  });

  it("negeert het euroteken en spaties", () => {
    expect(parseAmount(" € 400 ")).toEqual({ ok: true, value: 400 });
  });

  it("geeft null terug voor een leeg veld — een bedrag mag ontbreken", () => {
    expect(parseAmount("")).toEqual({ ok: true, value: null });
    expect(parseAmount("   ")).toEqual({ ok: true, value: null });
  });

  it("weigert tekst", () => {
    expect(parseAmount("veel").ok).toBe(false);
  });

  it("weigert een negatief bedrag — de soort bepaalt het teken, niet het bedrag", () => {
    expect(parseAmount("-20").ok).toBe(false);
  });

  it("weigert een onwaarschijnlijk groot bedrag", () => {
    expect(parseAmount("1000001").ok).toBe(false);
  });

  it("rondt af op twee cijfers na de komma", () => {
    expect(parseAmount("10,005")).toEqual({ ok: true, value: 10.01 });
  });
});

describe("formatAmount", () => {
  it("schrijft bedragen op zijn Belgisch", () => {
    expect(formatAmount(1234.5)).toBe("€ 1.234,50");
    expect(formatAmount(0)).toBe("€ 0,00");
  });

  it("leest ook het tekstbedrag uit de databank", () => {
    expect(formatAmount("560.00")).toBe("€ 560,00");
  });

  it("blijft leeg bij een ontbrekend bedrag", () => {
    expect(formatAmount(null)).toBe("");
  });
});

describe("lineDelta", () => {
  it("meldt niets zolang een van beide bedragen ontbreekt", () => {
    expect(lineDelta(lijn({ id: 1, budgetAmount: "400" }))).toEqual({ value: null, gunstig: null });
  });

  it("een duurdere kost dan begroot is ongunstig", () => {
    const d = lineDelta(lijn({ id: 1, budgetAmount: "400", actualAmount: "560" }));
    expect(d).toEqual({ value: 160, gunstig: false });
  });

  it("een goedkopere kost dan begroot is gunstig", () => {
    const d = lineDelta(lijn({ id: 1, budgetAmount: "400", actualAmount: "350" }));
    expect(d).toEqual({ value: -50, gunstig: true });
  });

  it("een hogere opbrengst dan begroot is gunstig", () => {
    const d = lineDelta(lijn({ id: 1, kind: "opbrengst", budgetAmount: "1000", actualAmount: "1200" }));
    expect(d).toEqual({ value: 200, gunstig: true });
  });

  it("precies op de begroting is geen van beide", () => {
    const d = lineDelta(lijn({ id: 1, budgetAmount: "400", actualAmount: "400" }));
    expect(d).toEqual({ value: 0, gunstig: null });
  });
});

describe("splitCostLines", () => {
  it("scheidt kosten van opbrengsten en houdt de volgorde aan", () => {
    const { kosten, opbrengsten } = splitCostLines([
      lijn({ id: 1, sortOrder: 2 }),
      lijn({ id: 2, kind: "opbrengst", sortOrder: 1 }),
      lijn({ id: 3, sortOrder: 1 }),
    ]);
    expect(kosten.map((l) => l.id)).toEqual([3, 1]);
    expect(opbrengsten.map((l) => l.id)).toEqual([2]);
  });
});

describe("summarizeCosts", () => {
  it("telt begroot en werkelijk apart op, en berekent het netto-resultaat", () => {
    const totalen = summarizeCosts([
      lijn({ id: 1, kind: "kost", budgetAmount: "400", actualAmount: "560" }),
      lijn({ id: 2, kind: "kost", budgetAmount: "1200", actualAmount: "1200" }),
      lijn({ id: 3, kind: "opbrengst", budgetAmount: "2500", actualAmount: "2890" }),
    ]);
    expect(totalen).toEqual({
      kosten: { begroot: 1600, werkelijk: 1760 },
      opbrengsten: { begroot: 2500, werkelijk: 2890 },
      netto: { begroot: 900, werkelijk: 1130 },
    });
  });

  it("telt een ontbrekend bedrag als nul zonder de andere kant te vervuilen", () => {
    const totalen = summarizeCosts([
      lijn({ id: 1, budgetAmount: "400", actualAmount: null }),
      lijn({ id: 2, kind: "opbrengst", budgetAmount: null, actualAmount: "300" }),
    ]);
    expect(totalen.kosten).toEqual({ begroot: 400, werkelijk: 0 });
    expect(totalen.opbrengsten).toEqual({ begroot: 0, werkelijk: 300 });
    expect(totalen.netto).toEqual({ begroot: -400, werkelijk: 300 });
  });

  it("telt in centen, zodat 0,10 + 0,20 exact 0,30 is", () => {
    const totalen = summarizeCosts([
      lijn({ id: 1, actualAmount: "0.10" }),
      lijn({ id: 2, actualAmount: "0.20" }),
    ]);
    expect(totalen.kosten.werkelijk).toBe(0.3);
  });

  it("geeft nullen terug voor een leeg overzicht", () => {
    expect(summarizeCosts([])).toEqual({
      kosten: { begroot: 0, werkelijk: 0 },
      opbrengsten: { begroot: 0, werkelijk: 0 },
      netto: { begroot: 0, werkelijk: 0 },
    });
  });
});
