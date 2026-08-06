import { describe, it, expect } from "vitest";
import {
  evaluationFigures,
  perPlate,
  hasEvaluationContent,
  type EvaluationInputs,
} from "./evaluation";

const basis: EvaluationInputs = {
  costs: [
    { kind: "kost", budgetAmount: "400", actualAmount: "560" },
    { kind: "opbrengst", budgetAmount: "2500", actualAmount: "2890" },
  ],
  shiftCount: 22,
  tasksDone: 11,
  tasksTotal: 13,
  evaluation: { visitors: 280, ticketsUsed: 310, paidPlates: 289 },
};

describe("perPlate", () => {
  it("rekent de opbrengst per bord uit", () => {
    expect(perPlate(2890, 289)).toBe(10);
  });

  it("rondt af op twee cijfers", () => {
    expect(perPlate(100, 3)).toBe(33.33);
  });

  it("deelt niet door nul", () => {
    expect(perPlate(2890, 0)).toBeNull();
    expect(perPlate(2890, null)).toBeNull();
  });
});

describe("evaluationFigures", () => {
  it("zet het netto-resultaat vooraan", () => {
    const cijfers = evaluationFigures(basis);
    expect(cijfers[0]).toEqual({ label: "Netto-resultaat", waarde: "€ 2.330,00" });
  });

  it("neemt de cijfers over die Sven zelf bijhoudt", () => {
    const cijfers = evaluationFigures(basis);
    const kaart = (label: string) => cijfers.find((c) => c.label === label)?.waarde;
    expect(kaart("Bezoekers")).toBe("280");
    expect(kaart("Kaarten gebruikt")).toBe("310");
    expect(kaart("Betalende borden")).toBe("289");
  });

  it("rekent de opbrengst per bord mee", () => {
    expect(evaluationFigures(basis).find((c) => c.label === "Opbrengst per bord")?.waarde).toBe(
      "€ 10,00",
    );
  });

  it("toont de bezetting en het afgewerkte draaiboek", () => {
    const cijfers = evaluationFigures(basis);
    const kaart = (label: string) => cijfers.find((c) => c.label === label)?.waarde;
    expect(kaart("Vrijwilligersshiften")).toBe("22");
    expect(kaart("Draaiboek")).toBe("11 van 13");
  });

  it("laat een cijfer weg dat niemand ingevuld heeft, in plaats van er nul van te maken", () => {
    const cijfers = evaluationFigures({
      ...basis,
      evaluation: { visitors: null, ticketsUsed: null, paidPlates: null },
    });
    const labels = cijfers.map((c) => c.label);
    expect(labels).not.toContain("Bezoekers");
    expect(labels).not.toContain("Kaarten gebruikt");
    expect(labels).not.toContain("Opbrengst per bord");
    expect(labels).toContain("Netto-resultaat");
  });

  it("laat de bezetting weg wanneer er niemand ingepland is", () => {
    const cijfers = evaluationFigures({ ...basis, shiftCount: 0 });
    expect(cijfers.map((c) => c.label)).not.toContain("Vrijwilligersshiften");
  });

  it("laat het draaiboek weg wanneer er geen taken zijn", () => {
    const cijfers = evaluationFigures({ ...basis, tasksTotal: 0, tasksDone: 0 });
    expect(cijfers.map((c) => c.label)).not.toContain("Draaiboek");
  });

  it("werkt met een leeg evenement zonder te breken", () => {
    const cijfers = evaluationFigures({
      costs: [],
      shiftCount: 0,
      tasksDone: 0,
      tasksTotal: 0,
      evaluation: null,
    });
    expect(cijfers).toEqual([{ label: "Netto-resultaat", waarde: "€ 0,00" }]);
  });
});

describe("hasEvaluationContent", () => {
  it("herkent een lege evaluatie", () => {
    expect(hasEvaluationContent(null)).toBe(false);
    expect(
      hasEvaluationContent({
        visitors: null, ticketsUsed: null, paidPlates: null,
        wentWell: "", couldBeBetter: "  ", agreements: null,
      }),
    ).toBe(false);
  });

  it("herkent een evaluatie met één ingevuld veld", () => {
    expect(
      hasEvaluationContent({
        visitors: null, ticketsUsed: null, paidPlates: null,
        wentWell: "De frituur draaide vlot", couldBeBetter: null, agreements: null,
      }),
    ).toBe(true);
    expect(
      hasEvaluationContent({
        visitors: 280, ticketsUsed: null, paidPlates: null,
        wentWell: null, couldBeBetter: null, agreements: null,
      }),
    ).toBe(true);
  });
});
