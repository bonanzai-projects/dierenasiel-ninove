import { describe, it, expect } from "vitest";
import {
  CARD_PRICE_DEFAULT,
  MAX_SERIES_SIZE,
  parseNumberList,
  formatNumberList,
  seriesSize,
  soldCount,
  seriesAmountCents,
  findSeriesOverlap,
  unsoldIssues,
  cardTotals,
  drawableNumbers,
  drawIssue,
  pickNumber,
  seriesRangeIssue,
  type CardSeries,
} from "./support-cards";

// Story 13.15 — Sven (12 sep 2026): nummers per verkoper, € 5, "welke nummers er niet verkocht zijn",
// en de app mag trekken "enkel uit nummers die verkocht werden".

const reeks = (over: Partial<CardSeries> & { id: number }): CardSeries => ({
  seller: "Martine",
  numberFrom: 1,
  numberTo: 50,
  price: "5.00",
  unsoldNumbers: [],
  settledAt: null,
  ...over,
});

describe("standaarden", () => {
  it("kost een kaart standaard € 5 en telt een reeks hooguit 1000 kaarten", () => {
    expect(CARD_PRICE_DEFAULT).toBe(5);
    expect(MAX_SERIES_SIZE).toBe(1000);
  });
});

describe("parseNumberList", () => {
  it("leest losse nummers en reeksen, gesorteerd en zonder dubbels", () => {
    expect(parseNumberList("12, 40-43; 7 12")).toEqual({ ok: true, numbers: [7, 12, 40, 41, 42, 43] });
    expect(parseNumberList("40–42")).toEqual({ ok: true, numbers: [40, 41, 42] });
  });

  it("aanvaardt een lege lijst", () => {
    expect(parseNumberList("  ")).toEqual({ ok: true, numbers: [] });
  });

  it("weigert wat geen nummer is, en een omgekeerde reeks", () => {
    expect(parseNumberList("12, abc")).toEqual({ ok: false, error: 'Geen nummer: "abc"' });
    expect(parseNumberList("50-40")).toEqual({ ok: false, error: "Reeks 50-40 loopt achteruit" });
  });

  it("weigert een reeks die te groot is om te kloppen", () => {
    expect(parseNumberList("1-100000").ok).toBe(false);
  });
});

describe("formatNumberList", () => {
  it("vat opeenvolgende nummers samen", () => {
    expect(formatNumberList([12, 40, 41, 42, 7])).toBe("7, 12, 40–42");
    expect(formatNumberList([3, 4])).toBe("3–4");
    expect(formatNumberList([])).toBe("");
  });
});

describe("seriesRangeIssue", () => {
  it("aanvaardt een gewone reeks", () => {
    expect(seriesRangeIssue(1, 50)).toBeNull();
    expect(seriesRangeIssue(7, 7)).toBeNull();
  });

  it("weigert een omgekeerde of te grote reeks", () => {
    expect(seriesRangeIssue(50, 1)).toMatch(/tot-nummer/);
    expect(seriesRangeIssue(1, 1001)).toMatch(/1000/);
    expect(seriesRangeIssue(0, 10)).toMatch(/vanaf 1/);
  });
});

describe("een reeks", () => {
  it("telt haar kaarten", () => {
    expect(seriesSize(reeks({ id: 1 }))).toBe(50);
  });

  it("weet pas na het afrekenen hoeveel er verkocht zijn", () => {
    expect(soldCount(reeks({ id: 1 }))).toBeNull();
    expect(soldCount(reeks({ id: 1, settledAt: "2026-10-01T10:00:00Z", unsoldNumbers: [3, 4, 5] }))).toBe(47);
  });

  it("rekent het bedrag van een afgerekende reeks", () => {
    expect(seriesAmountCents(reeks({ id: 1 }))).toBe(0);
    expect(seriesAmountCents(reeks({ id: 1, settledAt: "2026-10-01T10:00:00Z", unsoldNumbers: [3, 4, 5] }))).toBe(23500);
    expect(seriesAmountCents(reeks({ id: 1, price: "2.50", settledAt: "2026-10-01T10:00:00Z" }))).toBe(12500);
  });
});

describe("findSeriesOverlap", () => {
  const bestaand = [reeks({ id: 1, numberFrom: 1, numberTo: 50 }), reeks({ id: 2, numberFrom: 51, numberTo: 100 })];

  it("vindt een reeks die botst", () => {
    expect(findSeriesOverlap(bestaand, 40, 60)?.id).toBe(1);
    expect(findSeriesOverlap(bestaand, 100, 120)?.id).toBe(2);
  });

  it("laat aansluitende reeksen toe", () => {
    expect(findSeriesOverlap(bestaand, 101, 150)).toBeNull();
  });
});

describe("unsoldIssues", () => {
  const r = reeks({ id: 1, numberFrom: 1, numberTo: 50 });

  it("aanvaardt onverkochte nummers uit de reeks", () => {
    expect(unsoldIssues(r, [3, 50], [])).toEqual([]);
  });

  it("weigert nummers buiten de reeks", () => {
    expect(unsoldIssues(r, [51, 60], [])).toEqual(["51, 60 hoort niet bij deze reeks (1–50)"]);
  });

  it("weigert een nummer dat al getrokken werd", () => {
    expect(unsoldIssues(r, [7], [{ id: 1, number: 7, prize: null, drawnByApp: false }])).toEqual([
      "Nummer 7 werd al getrokken en kan dus niet onverkocht terugkomen",
    ]);
  });
});

describe("cardTotals", () => {
  it("telt uitgedeeld, afgerekend, verkocht, onverkocht, open en opbrengst", () => {
    const totaal = cardTotals([
      reeks({ id: 1, numberFrom: 1, numberTo: 50, settledAt: "2026-10-01T10:00:00Z", unsoldNumbers: [1, 2] }),
      reeks({ id: 2, numberFrom: 51, numberTo: 100, settledAt: "2026-10-01T10:00:00Z" }),
      reeks({ id: 3, numberFrom: 101, numberTo: 130 }),
    ]);
    expect(totaal).toEqual({
      series: 3,
      cards: 130,
      settledSeries: 2,
      sold: 98,
      unsold: 2,
      openSeries: 1,
      openCards: 30,
      amountCents: 49000,
    });
  });
});

describe("trekking", () => {
  const reeksen = [
    reeks({ id: 1, numberFrom: 1, numberTo: 5, settledAt: "2026-10-01T10:00:00Z", unsoldNumbers: [2] }),
    reeks({ id: 2, numberFrom: 6, numberTo: 8 }), // nog niet afgerekend
  ];
  const getrokken = [{ id: 9, number: 4, prize: "Fles wijn", drawnByApp: false }];

  it("trekt enkel uit verkochte nummers van afgerekende reeksen, nooit twee keer", () => {
    expect(drawableNumbers(reeksen, getrokken)).toEqual([1, 3, 5]);
  });

  it("kiest met het meegegeven toeval", () => {
    expect(pickNumber([1, 3, 5], () => 2)).toBe(5);
    expect(pickNumber([], () => 0)).toBeNull();
  });

  it("controleert een ingetikt winnend nummer", () => {
    expect(drawIssue(reeksen, getrokken, 3)).toBeNull();
    expect(drawIssue(reeksen, getrokken, 7)).toBeNull(); // reeks nog niet afgerekend: kan verkocht zijn
    expect(drawIssue(reeksen, getrokken, 99)).toBe("Nummer 99 hoort bij geen enkele reeks");
    expect(drawIssue(reeksen, getrokken, 2)).toBe("Nummer 2 kwam onverkocht terug");
    expect(drawIssue(reeksen, getrokken, 4)).toBe("Nummer 4 werd al getrokken");
  });
});
