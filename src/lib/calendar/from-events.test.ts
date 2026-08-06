import { describe, it, expect } from "vitest";
import { eventsToCalendar, type CalendarSourceEvent } from "./from-events";

const evenement = (over: Partial<CalendarSourceEvent> & { id: number }): CalendarSourceEvent => ({
  name: "Eetfestijn 2026",
  status: "gepland",
  date: "2026-11-14",
  endDate: null,
  startTime: null,
  ...over,
});

describe("eventsToCalendar", () => {
  it("zet een evenement op zijn dag, met een link naar de fiche", () => {
    const items = eventsToCalendar([evenement({ id: 3 })], "2026-11-01", "2026-11-30");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "evenement-3-2026-11-14",
      category: "evenement",
      date: "2026-11-14",
      title: "Eetfestijn 2026",
      href: "/beheerder/evenementen/3",
      status: "gepland",
    });
  });

  it("toont een meerdaags evenement op elke dag die het beslaat", () => {
    const items = eventsToCalendar(
      [evenement({ id: 3, date: "2026-11-14", endDate: "2026-11-16" })],
      "2026-11-01",
      "2026-11-30",
    );
    expect(items.map((i) => i.date)).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"]);
  });

  it("toont het beginuur enkel op de eerste dag", () => {
    const items = eventsToCalendar(
      [evenement({ id: 3, endDate: "2026-11-15", startTime: "18:00" })],
      "2026-11-01",
      "2026-11-30",
    );
    expect(items[0].time).toBe("18:00");
    expect(items[1].time).toBeNull();
  });

  it("knipt een evenement af op de randen van het venster", () => {
    const items = eventsToCalendar(
      [evenement({ id: 3, date: "2026-10-28", endDate: "2026-11-03" })],
      "2026-11-01",
      "2026-11-30",
    );
    expect(items.map((i) => i.date)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
  });

  it("laat een geannuleerd evenement weg — dat gaat niet door", () => {
    const items = eventsToCalendar(
      [evenement({ id: 3, status: "geannuleerd" })],
      "2026-11-01",
      "2026-11-30",
    );
    expect(items).toEqual([]);
  });

  it("markeert een evenement dat nog concept is", () => {
    const items = eventsToCalendar(
      [evenement({ id: 3, status: "concept" })],
      "2026-11-01",
      "2026-11-30",
    );
    expect(items[0].title).toBe("Eetfestijn 2026 (concept)");
  });

  it("blijft leeg zonder evenementen", () => {
    expect(eventsToCalendar([], "2026-11-01", "2026-11-30")).toEqual([]);
  });
});
