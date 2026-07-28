import { describe, it, expect } from "vitest";
import { splitEvents, formatEventPeriod } from "./list";

const e = (id: number, date: string, endDate: string | null = null) => ({
  id,
  date,
  endDate,
});

describe("splitEvents", () => {
  const alles = [e(1, "2026-05-01"), e(2, "2026-09-12"), e(3, "2026-12-20"), e(4, "2026-07-28")];

  it("zet komende evenementen chronologisch, eerstvolgende bovenaan", () => {
    const { komend } = splitEvents(alles, "2026-07-28");
    expect(komend.map((x) => x.id)).toEqual([4, 2, 3]);
  });

  it("zet afgelopen evenementen omgekeerd, recentste bovenaan", () => {
    const { afgelopen } = splitEvents([e(1, "2026-05-01"), e(5, "2026-06-15")], "2026-07-28");
    expect(afgelopen.map((x) => x.id)).toEqual([5, 1]);
  });

  it("rekent een meerdaags evenement dat nog loopt bij de komende", () => {
    const { komend } = splitEvents([e(9, "2026-07-20", "2026-08-02")], "2026-07-28");
    expect(komend.map((x) => x.id)).toEqual([9]);
  });
});

describe("formatEventPeriod", () => {
  it("toont één datum zonder uren", () => {
    expect(formatEventPeriod({ date: "2026-09-12", endDate: null, startTime: null, endTime: null }))
      .toBe("12/09/2026");
  });

  it("toont het beginuur wanneer het er is", () => {
    expect(formatEventPeriod({ date: "2026-09-12", endDate: null, startTime: "18:00", endTime: null }))
      .toBe("12/09/2026 om 18:00");
  });

  it("toont begin- en einduur op dezelfde dag", () => {
    expect(formatEventPeriod({ date: "2026-09-12", endDate: null, startTime: "18:00", endTime: "23:30" }))
      .toBe("12/09/2026 van 18:00 tot 23:30");
  });

  it("toont een periode over meerdere dagen", () => {
    expect(formatEventPeriod({ date: "2026-09-12", endDate: "2026-09-14", startTime: null, endTime: null }))
      .toBe("12/09/2026 t.e.m. 14/09/2026");
  });

  it("negeert een einddatum die gelijk is aan de begindatum", () => {
    expect(formatEventPeriod({ date: "2026-09-12", endDate: "2026-09-12", startTime: null, endTime: null }))
      .toBe("12/09/2026");
  });
});
