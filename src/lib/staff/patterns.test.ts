import { describe, it, expect } from "vitest";
import {
  WEEKDAYS,
  isoWeekday,
  patternEntriesBetween,
  mergePatternEntries,
  findPatternOverlap,
  stopPlan,
  describePattern,
  patternPeriod,
  sortPatterns,
  type StaffPattern,
} from "./patterns";
import type { AttendanceEntry } from "./attendance";

// Story 14.8 — Sven: "ja dat herhaalt zich maar soms ook niet (verlof)" en "ook willen zien wat voorbij is".

const patroon = (over: Partial<StaffPattern> & { id: number }): StaffPattern => ({
  userId: 5,
  userName: "Katrien",
  userRole: "medewerker",
  weekday: 1,
  startTime: "08:00",
  endTime: "12:00",
  task: null,
  validFrom: "2026-09-01",
  validUntil: null,
  ...over,
});

const inschrijving = (over: Partial<AttendanceEntry> & { id: number }): AttendanceEntry => ({
  date: "2026-09-28",
  userId: 5,
  guestName: null,
  userName: "Katrien",
  userRole: "medewerker",
  startTime: null,
  endTime: null,
  task: null,
  slotId: null,
  note: null,
  ...over,
});

describe("weekdagen", () => {
  it("telt van maandag (1) tot zondag (7)", () => {
    expect(WEEKDAYS.map((d) => d.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(WEEKDAYS[0].label).toBe("maandag");
    expect(WEEKDAYS[6].label).toBe("zondag");
  });

  it("vindt de weekdag van een datum", () => {
    expect(isoWeekday("2026-09-28")).toBe(1); // maandag
    expect(isoWeekday("2026-10-04")).toBe(7); // zondag
    expect(isoWeekday("2026-10-25")).toBe(7); // zondag van de wissel naar wintertijd
  });
});

describe("patternEntriesBetween", () => {
  it("zet het vaste moment op elke passende weekdag in de periode", () => {
    const rijen = patternEntriesBetween([patroon({ id: 3 })], "2026-09-28", "2026-10-11");
    expect(rijen.map((r) => r.date)).toEqual(["2026-09-28", "2026-10-05"]);
    expect(rijen[0]).toMatchObject({
      id: -3,
      patternId: 3,
      userId: 5,
      userName: "Katrien",
      startTime: "08:00",
      endTime: "12:00",
      slotId: null,
      guestName: null,
    });
  });

  it("begint pas op de vanaf-datum en stopt na de laatste dag", () => {
    const rijen = patternEntriesBetween(
      [patroon({ id: 3, validFrom: "2026-10-05", validUntil: "2026-10-12" })],
      "2026-09-28",
      "2026-10-25",
    );
    expect(rijen.map((r) => r.date)).toEqual(["2026-10-05", "2026-10-12"]);
  });

  it("neemt de taak mee", () => {
    const [rij] = patternEntriesBetween([patroon({ id: 3, weekday: 7, task: "Kuis honden" })], "2026-09-28", "2026-10-04");
    expect(rij).toMatchObject({ date: "2026-10-04", task: "Kuis honden" });
  });
});

describe("mergePatternEntries", () => {
  const vast = patternEntriesBetween([patroon({ id: 3 })], "2026-09-28", "2026-09-28");

  it("toont het vaste moment als er niets anders is", () => {
    expect(mergePatternEntries([], vast)).toHaveLength(1);
  });

  it("laat een overlappende inschrijving van dezelfde persoon die dag voorgaan", () => {
    const echt = inschrijving({ id: 1, startTime: "09:00", endTime: "11:00" });
    expect(mergePatternEntries([echt], vast).map((r) => r.id)).toEqual([1]);
  });

  it("houdt het vaste moment naast een blok dat er niet mee overlapt", () => {
    const echt = inschrijving({ id: 1, startTime: "14:00", endTime: "17:00" });
    expect(mergePatternEntries([echt], vast).map((r) => r.id)).toEqual([1, -3]);
  });

  it("laat een plaatsje niets vervangen", () => {
    const plaatsje = inschrijving({ id: 1, startTime: "09:00", endTime: "11:00", slotId: 8 });
    expect(mergePatternEntries([plaatsje], vast).map((r) => r.id)).toEqual([1, -3]);
  });

  it("kijkt enkel naar dezelfde persoon en dezelfde dag", () => {
    const ander = inschrijving({ id: 1, userId: 9, userName: "Jan" });
    const andereDag = inschrijving({ id: 2, date: "2026-09-29" });
    expect(mergePatternEntries([ander, andereDag], vast).map((r) => r.id)).toEqual([1, 2, -3]);
  });
});

describe("findPatternOverlap", () => {
  const bestaand = [patroon({ id: 3 })];

  it("weigert een overlappend vast moment op dezelfde weekdag", () => {
    expect(findPatternOverlap(bestaand, patroon({ id: 0, startTime: "10:00", endTime: "13:00" }))?.id).toBe(3);
    expect(findPatternOverlap(bestaand, patroon({ id: 0, startTime: null, endTime: null }))?.id).toBe(3);
  });

  it("laat een ander uur, een andere dag of een andere persoon toe", () => {
    expect(findPatternOverlap(bestaand, patroon({ id: 0, startTime: "13:00", endTime: "17:00" }))).toBeNull();
    expect(findPatternOverlap(bestaand, patroon({ id: 0, weekday: 3 }))).toBeNull();
    expect(findPatternOverlap(bestaand, patroon({ id: 0, userId: 9 }))).toBeNull();
  });

  it("laat een vast moment toe dat pas begint na het einde van het oude", () => {
    const gestopt = [patroon({ id: 3, validUntil: "2026-09-27" })];
    expect(findPatternOverlap(gestopt, patroon({ id: 0, validFrom: "2026-09-28" }))).toBeNull();
    expect(findPatternOverlap(gestopt, patroon({ id: 0, validFrom: "2026-09-27" }))?.id).toBe(3);
  });

  it("ziet een nieuw moment dat vóór een later begonnen oud moment start als overlappend", () => {
    const later = [patroon({ id: 3, validFrom: "2026-11-01" })];
    expect(findPatternOverlap(later, patroon({ id: 0, validFrom: "2026-10-01", validUntil: null }))?.id).toBe(3);
    expect(findPatternOverlap(later, patroon({ id: 0, validFrom: "2026-10-01", validUntil: "2026-10-31" }))).toBeNull();
  });
});

describe("stopPlan", () => {
  it("laat een lopend vast moment tot en met vandaag lopen", () => {
    expect(stopPlan(patroon({ id: 3 }), "2026-09-28")).toEqual({ kind: "end", validUntil: "2026-09-28" });
  });

  it("verwijdert een vast moment dat nog niet begonnen is", () => {
    expect(stopPlan(patroon({ id: 3, validFrom: "2026-10-05" }), "2026-09-28")).toEqual({ kind: "delete" });
  });

  it("doet niets met een vast moment dat al gestopt is", () => {
    expect(stopPlan(patroon({ id: 3, validUntil: "2026-09-20" }), "2026-09-28")).toEqual({ kind: "already" });
  });

  it("vervroegt een later einde tot vandaag", () => {
    expect(stopPlan(patroon({ id: 3, validUntil: "2026-12-31" }), "2026-09-28")).toEqual({ kind: "end", validUntil: "2026-09-28" });
  });
});

describe("weergave", () => {
  it("beschrijft een vast moment", () => {
    expect(describePattern(patroon({ id: 3 }))).toBe("elke maandag · 08:00–12:00");
    expect(describePattern(patroon({ id: 3, weekday: 7, startTime: null, endTime: null, task: "Kuis honden" }))).toBe(
      "elke zondag · hele dag · Kuis honden",
    );
  });

  it("toont de periode", () => {
    expect(patternPeriod(patroon({ id: 3 }), "2026-09-28")).toBe("sinds 01/09/2026");
    expect(patternPeriod(patroon({ id: 3, validFrom: "2026-10-05" }), "2026-09-28")).toBe("vanaf 05/10/2026");
    expect(patternPeriod(patroon({ id: 3, validUntil: "2026-12-31" }), "2026-09-28")).toBe("sinds 01/09/2026 t/m 31/12/2026");
  });

  it("sorteert op naam, dan weekdag, dan beginuur", () => {
    const lijst = sortPatterns([
      patroon({ id: 1, userName: "Katrien", weekday: 3 }),
      patroon({ id: 2, userName: "anja", weekday: 5 }),
      patroon({ id: 3, userName: "Katrien", weekday: 1, startTime: "13:00" }),
      patroon({ id: 4, userName: "Katrien", weekday: 1, startTime: null, endTime: null }),
    ]);
    expect(lijst.map((p) => p.id)).toEqual([2, 4, 3, 1]);
  });
});
