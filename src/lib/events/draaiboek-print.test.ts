import { describe, it, expect } from "vitest";
import {
  buildDraaiboekPrint,
  draaiboekFileName,
  printMoment,
  type DraaiboekPrintTask,
} from "./draaiboek-print";

const evenement = {
  name: "Eetfestijn 2026",
  type: "eetfestijn",
  date: "2026-11-14",
  endDate: "2026-11-15",
  startTime: null,
  endTime: null,
  location: "Parochiezaal Denderwindeke",
  responsible: "Sven",
  expectedVisitors: 300,
  description: null,
};

const taak = (over: Partial<DraaiboekPrintTask> & { id: number }): DraaiboekPrintTask => ({
  phase: "voorbereiding",
  date: null,
  time: null,
  title: "Iets doen",
  responsible: null,
  notes: null,
  sortOrder: 0,
  done: false,
  ...over,
});

describe("printMoment", () => {
  it("zet dag en uur naast elkaar, met de weekdag erbij", () => {
    expect(printMoment({ date: "2026-11-14", time: "16:00" })).toBe("za 14/11 · 16:00");
  });

  it("toont enkel de dag wanneer er geen uur is", () => {
    expect(printMoment({ date: "2026-11-14", time: null })).toBe("za 14/11");
  });

  it("toont enkel het uur wanneer er geen dag is", () => {
    expect(printMoment({ date: null, time: "16:00" })).toBe("16:00");
  });

  it("blijft leeg wanneer er niets is — geen streepje", () => {
    expect(printMoment({ date: null, time: null })).toBe("");
  });

  it("rekent de weekdag juist over een maandgrens", () => {
    // 1 maart 2026 is een zondag, 2 maart een maandag.
    expect(printMoment({ date: "2026-03-01", time: null })).toBe("zo 01/03");
    expect(printMoment({ date: "2026-03-02", time: null })).toBe("ma 02/03");
  });
});

describe("buildDraaiboekPrint", () => {
  it("zet de naam en de periode bovenaan", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [taak({ id: 1 })],
      afgedruktOp: "06/08/2026",
    });
    expect(model.titel).toBe("Eetfestijn 2026");
    expect(model.ondertitel).toBe("Eetfestijn · 14/11/2026 t.e.m. 15/11/2026");
    expect(model.afgedruktOp).toBe("06/08/2026");
  });

  it("toont enkel de gegevens die ingevuld zijn", () => {
    const model = buildDraaiboekPrint({
      event: { ...evenement, location: null, expectedVisitors: null },
      tasks: [],
      afgedruktOp: "06/08/2026",
    });
    expect(model.gegevens.map((g) => g.label)).toEqual(["Verantwoordelijke"]);
    expect(model.gegevens[0].waarde).toBe("Sven");
  });

  it("laat lege fasen weg — op papier is een lege kop enkel ruis", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [taak({ id: 1, phase: "dag-zelf" })],
      afgedruktOp: "06/08/2026",
    });
    expect(model.fasen.map((f) => f.label)).toEqual(["De dag zelf"]);
  });

  it("houdt de volgorde van de fasen aan", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [
        taak({ id: 1, phase: "evaluatie" }),
        taak({ id: 2, phase: "voorbereiding" }),
        taak({ id: 3, phase: "afbraak" }),
      ],
      afgedruktOp: "06/08/2026",
    });
    expect(model.fasen.map((f) => f.label)).toEqual([
      "Voorbereiding",
      "Afbraak & nazorg",
      "Evaluatie",
    ]);
  });

  it("sorteert de taken binnen een fase op datum en uur", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [
        taak({ id: 1, phase: "dag-zelf", title: "Frituur aan", date: "2026-11-14", time: "17:00" }),
        taak({ id: 2, phase: "dag-zelf", title: "Zaal openen", date: "2026-11-14", time: "16:00" }),
      ],
      afgedruktOp: "06/08/2026",
    });
    expect(model.fasen[0].taken.map((t) => t.titel)).toEqual(["Zaal openen", "Frituur aan"]);
  });

  it("neemt wie en de notitie mee, en laat ze leeg als ze er niet zijn", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [
        taak({ id: 1, title: "Traiteur bellen", responsible: "Katrien", notes: "voor 1 september" }),
        taak({ id: 2, title: "Affiches ophangen" }),
      ],
      afgedruktOp: "06/08/2026",
    });
    expect(model.fasen[0].taken[0]).toMatchObject({
      titel: "Traiteur bellen",
      wie: "Katrien",
      notitie: "voor 1 september",
      done: false,
    });
    expect(model.fasen[0].taken[1]).toMatchObject({ wie: "", notitie: "" });
  });

  it("telt de voortgang over alle fasen heen", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [
        taak({ id: 1, done: true }),
        taak({ id: 2, phase: "dag-zelf" }),
        taak({ id: 3, phase: "afbraak", done: true }),
        taak({ id: 4, phase: "evaluatie" }),
      ],
      afgedruktOp: "06/08/2026",
    });
    expect(model.voortgang).toEqual({ done: 2, total: 4, pct: 50 });
  });

  it("meldt een leeg draaiboek in plaats van een blad met enkel kopjes", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [],
      afgedruktOp: "06/08/2026",
    });
    expect(model.leeg).toBe(true);
    expect(model.fasen).toEqual([]);
  });

  it("laat een taak met een onbekende fase niet verdwijnen", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [taak({ id: 9, phase: "rommel", title: "Wees niet verloren" })],
      afgedruktOp: "06/08/2026",
    });
    expect(model.fasen[0].label).toBe("Voorbereiding");
    expect(model.fasen[0].taken[0].titel).toBe("Wees niet verloren");
  });

  it("neemt de omschrijving mee wanneer die er is", () => {
    const model = buildDraaiboekPrint({
      event: { ...evenement, description: "Zaal open vanaf 17u." },
      tasks: [],
      afgedruktOp: "06/08/2026",
    });
    expect(model.omschrijving).toBe("Zaal open vanaf 17u.");
  });
});

describe("buildDraaiboekPrint — wie staat waar (story 13.6)", () => {
  const shift = (over: { id: number; date?: string; post?: string; personName?: string; startTime?: string | null; endTime?: string | null }) => ({
    id: over.id,
    date: over.date ?? "2026-11-14",
    startTime: over.startTime ?? null,
    endTime: over.endTime ?? null,
    post: over.post ?? "Bar",
    personName: over.personName ?? "Katrien",
    sortOrder: 0,
  });

  it("blijft leeg wanneer er geen shiften meegegeven zijn", () => {
    const model = buildDraaiboekPrint({ event: evenement, tasks: [], afgedruktOp: "06/08/2026" });
    expect(model.shiftDagen).toEqual([]);
  });

  it("zet de mensen per dag onder hun post, met hun uren", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [],
      shifts: [
        shift({ id: 1, personName: "Katrien", startTime: "16:00", endTime: "20:00" }),
        shift({ id: 2, personName: "Sven", startTime: "20:00", endTime: "23:00" }),
        shift({ id: 3, post: "Kassa", personName: "Martine" }),
        shift({ id: 4, date: "2026-11-15", post: "Afbraak", personName: "Peter" }),
      ],
      afgedruktOp: "06/08/2026",
    });

    expect(model.shiftDagen.map((d) => d.label)).toEqual([
      "zaterdag 14/11/2026",
      "zondag 15/11/2026",
    ]);
    expect(model.shiftDagen[0].posten[0]).toEqual({
      post: "Bar",
      regels: ["Katrien · 16:00 – 20:00", "Sven · 20:00 – 23:00"],
    });
    expect(model.shiftDagen[0].posten[1].regels).toEqual(["Martine · hele dag"]);
  });
});

describe("buildDraaiboekPrint — materiaal (story 13.11)", () => {
  const spul = (over: { id: number; name?: string; quantity?: number | null; origin?: string; supplier?: string | null; returned?: boolean }) => ({
    id: over.id,
    name: over.name ?? "Tent",
    quantity: over.quantity ?? null,
    origin: over.origin ?? "geleend",
    supplier: over.supplier ?? null,
    arranged: false,
    returned: over.returned ?? false,
    sortOrder: over.id,
  });

  it("blijft leeg wanneer er geen materiaal meegegeven is", () => {
    const model = buildDraaiboekPrint({ event: evenement, tasks: [], afgedruktOp: "06/08/2026" });
    expect(model.materialen).toEqual([]);
  });

  it("zet per regel wat het is, waar het vandaan komt en of het terug moet", () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: [],
      materials: [
        spul({ id: 1, name: "Tent 4x8", quantity: 2, supplier: "Chiro Ninove" }),
        spul({ id: 2, name: "Frigo", origin: "eigen" }),
        spul({ id: 3, name: "Statafels", quantity: 12, origin: "gehuurd", returned: true }),
      ],
      afgedruktOp: "06/08/2026",
    });

    expect(model.materialen[0]).toEqual({
      regel: "2 × Tent 4x8 (Chiro Ninove)",
      herkomst: "Geleend",
      terug: "moet terug",
    });
    expect(model.materialen[1].terug).toBe("");
    expect(model.materialen[2].terug).toBe("terugbezorgd");
  });
});

describe("draaiboekFileName", () => {
  it("maakt een leesbare bestandsnaam van de evenementnaam", () => {
    expect(draaiboekFileName({ name: "Eetfestijn 2026", id: 7 })).toBe(
      "draaiboek-eetfestijn-2026.pdf",
    );
  });

  it("verwijdert leestekens en accenten uit de naam", () => {
    expect(draaiboekFileName({ name: "Benefiet: Café Céline!", id: 3 })).toBe(
      "draaiboek-benefiet-cafe-celine.pdf",
    );
  });

  it("valt terug op het nummer wanneer er van de naam niets overblijft", () => {
    expect(draaiboekFileName({ name: "!!!", id: 12 })).toBe("draaiboek-12.pdf");
  });
});
