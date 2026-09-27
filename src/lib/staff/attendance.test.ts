import { describe, it, expect } from "vitest";
import {
  blocksOverlap,
  buildAttendanceWeek,
  canRemove,
  displayName,
  findOverlap,
  formatTimeRange,
  isSameBlock,
  isSignedUp,
  samePerson,
  weekStartFor,
  type AttendanceEntry,
} from "./attendance";

const entry = (overrides: Partial<AttendanceEntry> = {}): AttendanceEntry => ({
  id: 1,
  date: "2026-08-10",
  userId: 7,
  userName: "Nathalie",
  userRole: "medewerker",
  guestName: null,
  startTime: null,
  endTime: null,
  task: null,
  slotId: null,
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

  it("sorteert mensen die de hele dag komen op naam", () => {
    const week = buildAttendanceWeek("2026-08-10", [
      entry({ id: 1, date: "2026-08-10", userName: "Sven" }),
      entry({ id: 2, date: "2026-08-10", userId: null, userName: null, guestName: "Anja" }),
      entry({ id: 3, date: "2026-08-10", userId: 9, userName: "katrien" }),
    ]);

    expect(week[0].entries.map(displayName)).toEqual(["Anja", "katrien", "Sven"]);
  });

  // Story 14.7 — de volgorde waarin mensen binnenkomen.
  it("zet per dag de hele dag eerst, dan op beginuur, dan op naam", () => {
    const week = buildAttendanceWeek("2026-08-10", [
      entry({ id: 1, userName: "Sven", startTime: "14:00", endTime: "17:00" }),
      entry({ id: 2, userId: null, userName: null, guestName: "Anja" }),
      entry({ id: 3, userId: 9, userName: "katrien", startTime: "09:00", endTime: "12:00" }),
      entry({ id: 4, userId: 10, userName: "Bert", startTime: "09:00" }),
    ]);

    expect(week[0].entries.map(displayName)).toEqual(["Anja", "Bert", "katrien", "Sven"]);
  });

  it("noemt de dag bij naam", () => {
    const week = buildAttendanceWeek("2026-08-10", []);
    expect(week[0].label).toBe("maandag");
    expect(week[6].label).toBe("zondag");
  });
});

describe("formatTimeRange", () => {
  it("toont begin en einde", () => {
    expect(formatTimeRange({ startTime: "09:00", endTime: "12:00" })).toBe("09:00–12:00");
  });

  it("toont enkel het beginuur wanneer het einde open is", () => {
    expect(formatTimeRange({ startTime: "14:00", endTime: null })).toBe("vanaf 14:00");
  });

  it("noemt een inschrijving zonder uren een hele dag", () => {
    expect(formatTimeRange({ startTime: null, endTime: null })).toBe("hele dag");
  });
});

describe("blocksOverlap", () => {
  const blok = (startTime: string | null, endTime: string | null = null) => ({ startTime, endTime });

  it("laat een hele dag met alles overlappen", () => {
    expect(blocksOverlap(blok(null), blok("09:00", "12:00"))).toBe(true);
    expect(blocksOverlap(blok("09:00", "12:00"), blok(null))).toBe(true);
    expect(blocksOverlap(blok(null), blok(null))).toBe(true);
  });

  it("ziet aansluitende blokken niet als overlap", () => {
    expect(blocksOverlap(blok("09:00", "12:00"), blok("12:00", "15:00"))).toBe(false);
  });

  it("ziet blokken die in elkaar lopen wel als overlap", () => {
    expect(blocksOverlap(blok("09:00", "12:00"), blok("11:00", "14:00"))).toBe(true);
  });

  it("laat een open einde tot het einde van de dag lopen", () => {
    expect(blocksOverlap(blok("14:00"), blok("16:00", "17:00"))).toBe(true);
    expect(blocksOverlap(blok("14:00"), blok("09:00", "12:00"))).toBe(false);
    expect(blocksOverlap(blok("09:00", "12:00"), blok("11:00"))).toBe(true);
  });
});

describe("isSameBlock", () => {
  it("herkent exact hetzelfde blok", () => {
    expect(isSameBlock({ startTime: "09:00", endTime: "12:00" }, { startTime: "09:00", endTime: "12:00" })).toBe(true);
    expect(isSameBlock({ startTime: null, endTime: null }, { startTime: null, endTime: null })).toBe(true);
  });

  it("ziet een ander einduur als een ander blok", () => {
    expect(isSameBlock({ startTime: "09:00", endTime: "12:00" }, { startTime: "09:00", endTime: "13:00" })).toBe(false);
  });
});

describe("samePerson", () => {
  it("herkent hetzelfde account", () => {
    expect(samePerson({ userId: 7, guestName: null }, { userId: 7, guestName: null })).toBe(true);
    expect(samePerson({ userId: 7, guestName: null }, { userId: 8, guestName: null })).toBe(false);
  });

  it("herkent dezelfde vrijwilliger zonder account, ongeacht hoofdletters en spaties", () => {
    expect(
      samePerson({ userId: null, guestName: "Tante Marie" }, { userId: null, guestName: " tante marie " }),
    ).toBe(true);
    expect(samePerson({ userId: null, guestName: "Anja" }, { userId: null, guestName: "Marie" })).toBe(false);
  });

  it("verwart een vrijwilliger niet met een account", () => {
    expect(samePerson({ userId: 7, guestName: null }, { userId: null, guestName: "Nathalie" })).toBe(false);
  });
});

describe("findOverlap", () => {
  const bestaande = [
    entry({ id: 1, userId: 7, startTime: "09:00", endTime: "12:00" }),
    entry({ id: 2, userId: 8, userName: "Sven", startTime: "10:00", endTime: "11:00" }),
  ];

  it("vindt een overlappend blok van dezelfde persoon", () => {
    const nieuw = { userId: 7, guestName: null, startTime: "11:00", endTime: "14:00" };
    expect(findOverlap(bestaande, nieuw)?.id).toBe(1);
  });

  it("negeert de blokken van anderen", () => {
    const nieuw = { userId: 9, guestName: null, startTime: "09:00", endTime: "12:00" };
    expect(findOverlap(bestaande, nieuw)).toBeNull();
  });

  it("vindt niets bij een blok dat netjes aansluit", () => {
    const nieuw = { userId: 7, guestName: null, startTime: "12:00", endTime: "15:00" };
    expect(findOverlap(bestaande, nieuw)).toBeNull();
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
  // Story 14.8 — een vast moment is geen rij om weg te halen: stoppen gebeurt in het weekrooster.
  it("biedt bij een vast moment uit het weekrooster geen uitschrijven aan", () => {
    const vast = entry({ id: -3, userId: 7, patternId: 3 });
    expect(canRemove(vast, 7, false)).toBe(false);
    expect(canRemove(vast, 7, true)).toBe(false);
  });
});
