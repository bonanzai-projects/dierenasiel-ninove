import { describe, it, expect } from "vitest";
import {
  SHIFT_POSTS,
  formatShiftTime,
  dayLabel,
  groupShiftsByDay,
  shiftSummary,
  type Shift,
} from "./shifts";

const shift = (over: Partial<Shift> & { id: number }): Shift => ({
  date: "2026-11-14",
  startTime: null,
  endTime: null,
  post: "Bar",
  personName: "Katrien",
  sortOrder: 0,
  ...over,
});

describe("SHIFT_POSTS", () => {
  // Sven, vraag 10: "bar, kassa, frituur, afwas, opbouw".
  it("stelt de posten voor die Sven noemde", () => {
    for (const post of ["Opbouw", "Bar", "Kassa", "Frituur", "Afwas"]) {
      expect(SHIFT_POSTS).toContain(post);
    }
  });
});

describe("formatShiftTime", () => {
  it("schrijft een volledig blok als van–tot", () => {
    expect(formatShiftTime("16:00", "20:00")).toBe("16:00 – 20:00");
  });

  it("schrijft een open einde als 'vanaf'", () => {
    expect(formatShiftTime("16:00", null)).toBe("vanaf 16:00");
  });

  it("schrijft een open begin als 'tot'", () => {
    expect(formatShiftTime(null, "20:00")).toBe("tot 20:00");
  });

  it("noemt een shift zonder uren 'hele dag'", () => {
    expect(formatShiftTime(null, null)).toBe("hele dag");
  });
});

describe("dayLabel", () => {
  it("schrijft de dag voluit met de weekdag", () => {
    expect(dayLabel("2026-11-14")).toBe("zaterdag 14/11/2026");
    expect(dayLabel("2026-11-15")).toBe("zondag 15/11/2026");
  });
});

describe("groupShiftsByDay", () => {
  it("groepeert per dag en daarbinnen per post", () => {
    const dagen = groupShiftsByDay([
      shift({ id: 1, date: "2026-11-15", post: "Bar", personName: "Peter" }),
      shift({ id: 2, date: "2026-11-14", post: "Kassa", personName: "Martine" }),
      shift({ id: 3, date: "2026-11-14", post: "Bar", personName: "Katrien" }),
      shift({ id: 4, date: "2026-11-14", post: "Bar", personName: "Sven" }),
    ]);

    expect(dagen.map((d) => d.date)).toEqual(["2026-11-14", "2026-11-15"]);
    expect(dagen[0].posten.map((p) => p.post)).toEqual(["Bar", "Kassa"]);
    expect(dagen[0].posten[0].shifts.map((s) => s.personName)).toEqual(["Katrien", "Sven"]);
  });

  it("sorteert binnen een post op beginuur, en zet 'hele dag' vooraan", () => {
    const dagen = groupShiftsByDay([
      shift({ id: 1, startTime: "20:00", personName: "Laat" }),
      shift({ id: 2, startTime: "16:00", personName: "Vroeg" }),
      shift({ id: 3, startTime: null, personName: "Hele dag" }),
    ]);
    expect(dagen[0].posten[0].shifts.map((s) => s.personName)).toEqual([
      "Hele dag",
      "Vroeg",
      "Laat",
    ]);
  });

  it("geeft elke dag een leesbaar opschrift", () => {
    const dagen = groupShiftsByDay([shift({ id: 1 })]);
    expect(dagen[0].label).toBe("zaterdag 14/11/2026");
  });

  it("blijft leeg zonder shiften", () => {
    expect(groupShiftsByDay([])).toEqual([]);
  });
});

describe("shiftSummary", () => {
  it("telt de shiften en de verschillende mensen", () => {
    const totaal = shiftSummary([
      shift({ id: 1, personName: "Katrien" }),
      shift({ id: 2, personName: "Katrien", date: "2026-11-15" }),
      shift({ id: 3, personName: "Sven" }),
    ]);
    expect(totaal).toEqual({ shiften: 3, personen: 2, dagen: 2 });
  });

  it("telt namen los van hoofdletters en spaties — dezelfde persoon blijft één persoon", () => {
    const totaal = shiftSummary([
      shift({ id: 1, personName: "katrien " }),
      shift({ id: 2, personName: "Katrien" }),
    ]);
    expect(totaal.personen).toBe(1);
  });

  it("geeft nullen terug voor een leeg overzicht", () => {
    expect(shiftSummary([])).toEqual({ shiften: 0, personen: 0, dagen: 0 });
  });
});
