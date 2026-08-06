import { describe, it, expect } from "vitest";
import {
  DRAAIBOEK_PHASES,
  DRAAIBOEK_PHASE_KEYS,
  draaiboekPhaseLabel,
  groupTasksByPhase,
  draaiboekProgress,
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
