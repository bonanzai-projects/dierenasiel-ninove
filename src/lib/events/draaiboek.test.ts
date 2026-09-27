import { describe, it, expect } from "vitest";
import {
  DRAAIBOEK_PHASES,
  DRAAIBOEK_PHASE_KEYS,
  draaiboekPhaseLabel,
  groupTasksByPhase,
  draaiboekProgress,
  canMoveTask,
  reorderTask,
} from "./draaiboek";

type Taak = Parameters<typeof groupTasksByPhase>[0][number];

const taak = (over: Partial<Taak> & { id: number }): Taak => ({
  phase: "voorbereiding",
  date: null,
  time: null,
  sortOrder: 0,
  done: false,
  ...over,
});

describe("draaiboek-fasen", () => {
  // Sven, vraag 7 (2026-08-06): "Evaluatie mag er ook bij".
  it("kent voorbereiding, de dag zelf, afbraak en evaluatie — in die volgorde", () => {
    expect(DRAAIBOEK_PHASE_KEYS).toEqual([
      "voorbereiding",
      "dag-zelf",
      "afbraak",
      "evaluatie",
    ]);
  });

  it("geeft elke fase een label", () => {
    for (const f of DRAAIBOEK_PHASES) expect(f.label.length).toBeGreaterThan(0);
    expect(draaiboekPhaseLabel("dag-zelf")).toBe("De dag zelf");
    expect(draaiboekPhaseLabel("onbekend")).toBe("onbekend");
  });
});

describe("groupTasksByPhase", () => {
  it("geeft alle fasen terug, ook als ze leeg zijn", () => {
    const groepen = groupTasksByPhase([]);
    expect(groepen.map((g) => g.phase)).toEqual([
      "voorbereiding",
      "dag-zelf",
      "afbraak",
      "evaluatie",
    ]);
    expect(groepen.every((g) => g.tasks.length === 0)).toBe(true);
  });

  it("sorteert op datum, dan uur", () => {
    const groepen = groupTasksByPhase([
      taak({ id: 1, date: "2026-09-12", time: "10:00" }),
      taak({ id: 2, date: "2026-09-11", time: "18:00" }),
      taak({ id: 3, date: "2026-09-12", time: "08:00" }),
    ]);
    expect(groepen[0].tasks.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("zet taken zonder datum onderaan hun fase", () => {
    const groepen = groupTasksByPhase([
      taak({ id: 1, date: null }),
      taak({ id: 2, date: "2026-09-12" }),
    ]);
    expect(groepen[0].tasks.map((t) => t.id)).toEqual([2, 1]);
  });

  it("zet een taak zonder uur vóór een taak met uur op dezelfde dag", () => {
    const groepen = groupTasksByPhase([
      taak({ id: 1, date: "2026-09-12", time: "08:00" }),
      taak({ id: 2, date: "2026-09-12", time: null }),
    ]);
    expect(groepen[0].tasks.map((t) => t.id)).toEqual([2, 1]);
  });

  it("valt terug op de invoervolgorde bij gelijke datum en uur", () => {
    const groepen = groupTasksByPhase([
      taak({ id: 7, sortOrder: 2 }),
      taak({ id: 8, sortOrder: 1 }),
    ]);
    expect(groepen[0].tasks.map((t) => t.id)).toEqual([8, 7]);
  });

  it("verdeelt de taken over hun eigen fase", () => {
    const groepen = groupTasksByPhase([
      taak({ id: 1, phase: "afbraak" }),
      taak({ id: 2, phase: "dag-zelf" }),
      taak({ id: 3, phase: "voorbereiding" }),
      taak({ id: 4, phase: "evaluatie" }),
    ]);
    expect(groepen.map((g) => g.tasks.map((t) => t.id))).toEqual([[3], [2], [1], [4]]);
  });

  it("negeert een taak met een onbekende fase niet stilzwijgend maar zet ze bij de voorbereiding", () => {
    const groepen = groupTasksByPhase([taak({ id: 4, phase: "rommel" })]);
    expect(groepen[0].tasks.map((t) => t.id)).toEqual([4]);
  });
});

describe("draaiboekProgress", () => {
  it("telt afgevinkte taken", () => {
    expect(draaiboekProgress([taak({ id: 1, done: true }), taak({ id: 2 })])).toEqual({
      done: 1,
      total: 2,
      pct: 50,
    });
  });

  it("geeft 0% terug voor een leeg draaiboek zonder te delen door nul", () => {
    expect(draaiboekProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

// Story 13.19 — Sven: "volgorde aan kunnen passen ... tenzij dat dit door de datum bepaald wordt".
// Keuze Johan: de datum gaat voor; verplaatsen enkel naast een taak met hetzelfde moment.
describe("canMoveTask", () => {
  const fase = groupTasksByPhase([
    taak({ id: 1, date: "2026-10-01" }),
    taak({ id: 2, date: "2026-10-05", time: "10:00", sortOrder: 1 }),
    taak({ id: 3, date: "2026-10-05", time: "10:00", sortOrder: 2 }),
    taak({ id: 4, sortOrder: 1 }),
    taak({ id: 5, sortOrder: 2 }),
    taak({ id: 6, sortOrder: 3 }),
  ])[0].tasks;

  it("staat de taken in de verwachte volgorde", () => {
    expect(fase.map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("laat taken zonder datum onderling verschuiven", () => {
    expect(canMoveTask(fase, 3, "up")).toBe(false); // taak 4 niet boven een taak met datum
    expect(canMoveTask(fase, 3, "down")).toBe(true);
    expect(canMoveTask(fase, 4, "up")).toBe(true);
    expect(canMoveTask(fase, 5, "down")).toBe(false); // de laatste
  });

  it("laat taken op dezelfde dag en hetzelfde uur onderling verschuiven", () => {
    expect(canMoveTask(fase, 1, "down")).toBe(true);
    expect(canMoveTask(fase, 2, "up")).toBe(true);
    expect(canMoveTask(fase, 2, "down")).toBe(false); // daaronder: geen datum
  });

  it("laat de datum beslissen tussen verschillende momenten", () => {
    expect(canMoveTask(fase, 0, "up")).toBe(false);
    expect(canMoveTask(fase, 0, "down")).toBe(false);
    expect(canMoveTask(fase, 1, "up")).toBe(false);
  });

  it("ziet een ander uur op dezelfde dag als een ander moment", () => {
    const dag = groupTasksByPhase([
      taak({ id: 1, date: "2026-10-05", time: "09:00" }),
      taak({ id: 2, date: "2026-10-05", time: "10:00" }),
    ])[0].tasks;
    expect(canMoveTask(dag, 0, "down")).toBe(false);
  });
});

describe("reorderTask", () => {
  const taken = [
    taak({ id: 10, sortOrder: 1759000000 }),
    taak({ id: 11, sortOrder: 1759000100 }),
    taak({ id: 12, sortOrder: 1759000200 }),
    taak({ id: 20, phase: "afbraak", sortOrder: 5 }),
  ];

  it("wisselt een taak met die erboven en nummert de fase opnieuw", () => {
    const wijzigingen = reorderTask(taken, 12, "up")!;
    expect(wijzigingen).toEqual(
      expect.arrayContaining([
        { id: 10, sortOrder: 0 },
        { id: 12, sortOrder: 1 },
        { id: 11, sortOrder: 2 },
      ]),
    );
    const nieuw = taken.map((t) => ({ ...t, sortOrder: wijzigingen.find((w) => w.id === t.id)?.sortOrder ?? t.sortOrder }));
    expect(groupTasksByPhase(nieuw)[0].tasks.map((t) => t.id)).toEqual([10, 12, 11]);
  });

  it("wisselt een taak met die eronder", () => {
    const wijzigingen = reorderTask(taken, 10, "down")!;
    const nieuw = taken.map((t) => ({ ...t, sortOrder: wijzigingen.find((w) => w.id === t.id)?.sortOrder ?? t.sortOrder }));
    expect(groupTasksByPhase(nieuw)[0].tasks.map((t) => t.id)).toEqual([11, 10, 12]);
  });

  it("raakt de andere fasen niet aan", () => {
    expect(reorderTask(taken, 12, "up")!.map((w) => w.id)).not.toContain(20);
  });

  it("geeft enkel wat verandert", () => {
    const fase = [taak({ id: 1, sortOrder: 0 }), taak({ id: 2, sortOrder: 1 }), taak({ id: 3, sortOrder: 2 })];
    expect(reorderTask(fase, 3, "up")).toEqual([
      { id: 3, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ]);
  });

  it("werkt ook als taken dezelfde volgorde-waarde hebben", () => {
    const gelijk = [taak({ id: 1 }), taak({ id: 2 }), taak({ id: 3 })];
    const wijzigingen = reorderTask(gelijk, 3, "up")!;
    const nieuw = gelijk.map((t) => ({ ...t, sortOrder: wijzigingen.find((w) => w.id === t.id)?.sortOrder ?? t.sortOrder }));
    expect(groupTasksByPhase(nieuw)[0].tasks.map((t) => t.id)).toEqual([1, 3, 2]);
  });

  it("weigert waar de datum beslist, aan de rand, of voor een onbekende taak", () => {
    const gemengd = [taak({ id: 1, date: "2026-10-01" }), taak({ id: 2 })];
    expect(reorderTask(gemengd, 2, "up")).toBeNull();
    expect(reorderTask(gemengd, 1, "up")).toBeNull();
    expect(reorderTask(gemengd, 99, "down")).toBeNull();
  });
});
