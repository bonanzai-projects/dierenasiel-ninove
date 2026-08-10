import { describe, it, expect } from "vitest";
import {
  buildAttendanceWeek,
  canRemove,
  displayName,
  isSignedUp,
  weekStartFor,
  type AttendanceEntry,
} from "./attendance";

const entry = (overrides: Partial<AttendanceEntry> = {}): AttendanceEntry => ({
  id: 1,
  date: "2026-08-10",
  userId: 7,
  userName: "Nathalie",
  guestName: null,
  note: null,
  ...overrides,
});

describe("displayName", () => {
  it("gebruikt de naam van het account", () => {
    expect(displayName(entry())).toBe("Nathalie");
  });

  it("gebruikt de vrije naam voor iemand zonder account", () => {
    expect(displayName(entry({ userId: null, userName: null, guestName: "Tante Marie" }))).toBe(
      "Tante Marie",
    );
  });

  it("valt terug op een streepje wanneer beide ontbreken", () => {
    expect(displayName(entry({ userId: null, userName: null, guestName: null }))).toBe("—");
  });

  it("laat de accountnaam voorgaan", () => {
    expect(displayName(entry({ guestName: "Oud" }))).toBe("Nathalie");
  });
});

describe("weekStartFor", () => {
  it("geeft maandag voor een dag midden in de week", () => {
    // 2026-08-13 is een donderdag
    expect(weekStartFor("2026-08-13")).toBe("2026-08-10");
  });

  it("geeft maandag zelf terug", () => {
    expect(weekStartFor("2026-08-10")).toBe("2026-08-10");
  });

  it("rekent zondag bij de week die maandag begon", () => {
    expect(weekStartFor("2026-08-16")).toBe("2026-08-10");
  });

  it("werkt over een maandgrens", () => {
    expect(weekStartFor("2026-09-02")).toBe("2026-08-31");
  });
});

describe("buildAttendanceWeek", () => {
  it("geeft zeven dagen, maandag eerst", () => {
    const week = buildAttendanceWeek("2026-08-10", []);
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-08-10");
    expect(week[6].date).toBe("2026-08-16");
  });

  it("hangt elke inschrijving aan de juiste dag", () => {
    const week = buildAttendanceWeek("2026-08-10", [
      entry({ id: 1, date: "2026-08-12" }),
      entry({ id: 2, date: "2026-08-12", userId: 8, userName: "Sven" }),
      entry({ id: 3, date: "2026-08-16", userId: 9, userName: "Katrien" }),
    ]);

    expect(week[2].entries.map((e) => e.id)).toEqual([1, 2]);
    expect(week[6].entries.map((e) => e.id)).toEqual([3]);
    expect(week[0].entries).toEqual([]);
  });

  it("negeert inschrijvingen buiten de week", () => {
    const week = buildAttendanceWeek("2026-08-10", [entry({ date: "2026-08-20" })]);
    expect(week.every((day) => day.entries.length === 0)).toBe(true);
  });

  it("sorteert de mensen per dag op naam", () => {
    const week = buildAttendanceWeek("2026-08-10", [
      entry({ id: 1, date: "2026-08-10", userName: "Sven" }),
      entry({ id: 2, date: "2026-08-10", userId: null, userName: null, guestName: "Anja" }),
      entry({ id: 3, date: "2026-08-10", userId: 9, userName: "katrien" }),
    ]);

    expect(week[0].entries.map(displayName)).toEqual(["Anja", "katrien", "Sven"]);
  });

  it("noemt de dag bij naam", () => {
    const week = buildAttendanceWeek("2026-08-10", []);
    expect(week[0].label).toBe("maandag");
    expect(week[6].label).toBe("zondag");
  });
});

describe("isSignedUp", () => {
  const dag = { date: "2026-08-10", label: "maandag", entries: [entry({ userId: 7 })] };

  it("herkent de eigen inschrijving", () => {
    expect(isSignedUp(dag, 7)).toBe(true);
  });

  it("ziet iemand anders niet aan voor jezelf", () => {
    expect(isSignedUp(dag, 8)).toBe(false);
  });

  it("is onwaar zonder ingelogde gebruiker", () => {
    expect(isSignedUp(dag, null)).toBe(false);
  });
});

describe("canRemove", () => {
  it("laat je je eigen inschrijving weghalen", () => {
    expect(canRemove(entry({ userId: 7 }), 7, false)).toBe(true);
  });

  it("belet dat je die van iemand anders weghaalt", () => {
    expect(canRemove(entry({ userId: 8 }), 7, false)).toBe(false);
  });

  it("laat de leiding elke inschrijving weghalen", () => {
    expect(canRemove(entry({ userId: 8 }), 7, true)).toBe(true);
  });

  it("laat een gast enkel door de leiding weghalen", () => {
    const gast = entry({ userId: null, userName: null, guestName: "Tante Marie" });
    expect(canRemove(gast, 7, false)).toBe(false);
    expect(canRemove(gast, 7, true)).toBe(true);
  });
});
