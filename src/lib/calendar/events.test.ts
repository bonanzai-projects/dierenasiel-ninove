import { describe, it, expect } from "vitest";
import {
  ymd,
  buildMonthGrid,
  addMonths,
  monthTitle,
  groupEventsByDate,
  sortDayEvents,
  filterEventsByCategories,
  upcomingEvents,
  type CalendarEvent,
} from "./events";

function ev(partial: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "date">): CalendarEvent {
  return { category: "adopties", title: "Test", ...partial };
}

describe("ymd", () => {
  it("nult maand en dag aan", () => {
    expect(ymd(2026, 7, 4)).toBe("2026-07-04");
    expect(ymd(2026, 12, 25)).toBe("2026-12-25");
  });
});

describe("buildMonthGrid", () => {
  it("levert altijd 42 cellen (6 weken)", () => {
    expect(buildMonthGrid(2026, 7)).toHaveLength(42);
  });

  it("start op maandag: juli 2026 (1 juli = woensdag) begint met 29 en 30 juni", () => {
    const grid = buildMonthGrid(2026, 7);
    expect(grid[0].date).toBe("2026-06-29"); // maandag
    expect(grid[0].inCurrentMonth).toBe(false);
    expect(grid[2].date).toBe("2026-07-01"); // woensdag
    expect(grid[2].inCurrentMonth).toBe(true);
  });

  it("markeert de dag van vandaag", () => {
    const grid = buildMonthGrid(2026, 7, "2026-07-15");
    const today = grid.find((c) => c.isToday);
    expect(today?.date).toBe("2026-07-15");
    expect(grid.filter((c) => c.isToday)).toHaveLength(1);
  });

  it("bevat elke dag van de maand exact één keer als inCurrentMonth", () => {
    const grid = buildMonthGrid(2026, 2); // februari 2026, 28 dagen
    const inMonth = grid.filter((c) => c.inCurrentMonth);
    expect(inMonth).toHaveLength(28);
    expect(inMonth[0].date).toBe("2026-02-01");
    expect(inMonth[27].date).toBe("2026-02-28");
  });
});

describe("addMonths", () => {
  it("gaat vooruit binnen het jaar", () => {
    expect(addMonths(2026, 7, 1)).toEqual({ year: 2026, month: 8 });
  });
  it("rolt over het jaareinde", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
  it("gaat achteruit over het jaarbegin", () => {
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 2, -5)).toEqual({ year: 2025, month: 9 });
  });
});

describe("monthTitle", () => {
  it("geeft een Nederlandse titel met hoofdletter", () => {
    expect(monthTitle(2026, 7)).toBe("Juli 2026");
    expect(monthTitle(2026, 12)).toBe("December 2026");
  });
});

describe("groupEventsByDate", () => {
  it("groepeert per datum", () => {
    const grouped = groupEventsByDate([
      ev({ id: "a", date: "2026-07-01" }),
      ev({ id: "b", date: "2026-07-01" }),
      ev({ id: "c", date: "2026-07-02" }),
    ]);
    expect(grouped["2026-07-01"].map((e) => e.id)).toEqual(["a", "b"]);
    expect(grouped["2026-07-02"].map((e) => e.id)).toEqual(["c"]);
  });
});

describe("sortDayEvents", () => {
  it("sorteert op tijd, events zonder tijd achteraan", () => {
    const sorted = sortDayEvents([
      ev({ id: "geen", date: "2026-07-01", title: "Zonder tijd" }),
      ev({ id: "laat", date: "2026-07-01", time: "14:00", title: "Laat" }),
      ev({ id: "vroeg", date: "2026-07-01", time: "09:30", title: "Vroeg" }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["vroeg", "laat", "geen"]);
  });
});

describe("filterEventsByCategories", () => {
  it("behoudt enkel actieve categorieën", () => {
    const events = [
      ev({ id: "a", date: "2026-07-01", category: "adopties" }),
      ev({ id: "m", date: "2026-07-01", category: "medisch" }),
      ev({ id: "w", date: "2026-07-01", category: "wandelingen" }),
    ];
    const result = filterEventsByCategories(events, ["adopties", "wandelingen"]);
    expect(result.map((e) => e.id)).toEqual(["a", "w"]);
  });
});

describe("upcomingEvents", () => {
  it("neemt enkel events vanaf de datum, gesorteerd, beperkt tot limit", () => {
    const events = [
      ev({ id: "verleden", date: "2026-06-30" }),
      ev({ id: "vandaag-laat", date: "2026-07-01", time: "16:00" }),
      ev({ id: "vandaag-vroeg", date: "2026-07-01", time: "08:00" }),
      ev({ id: "morgen", date: "2026-07-02" }),
      ev({ id: "later", date: "2026-07-03" }),
    ];
    const result = upcomingEvents(events, "2026-07-01", 3);
    expect(result.map((e) => e.id)).toEqual(["vandaag-vroeg", "vandaag-laat", "morgen"]);
  });
});
