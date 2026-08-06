import { describe, it, expect } from "vitest";
import {
  REMINDER_HORIZON_DAYS,
  taskReminders,
  reminderCounts,
  type ReminderTask,
} from "./reminders";

const VANDAAG = "2026-08-06";

const taak = (over: Partial<ReminderTask> & { id: number }): ReminderTask => ({
  eventId: 3,
  eventName: "Eetfestijn 2026",
  phase: "voorbereiding",
  title: "Traiteur bellen",
  date: VANDAAG,
  time: null,
  responsible: null,
  done: false,
  ...over,
});

describe("taskReminders", () => {
  it("meldt een taak die vandaag moet gebeuren", () => {
    const [r] = taskReminders([taak({ id: 1 })], VANDAAG);
    expect(r).toMatchObject({ days: 0, urgency: "vandaag", label: "Vandaag" });
  });

  it("meldt een taak die te laat is, met hoeveel dagen", () => {
    const [r] = taskReminders([taak({ id: 1, date: "2026-08-01" })], VANDAAG);
    expect(r).toMatchObject({ days: -5, urgency: "verlopen", label: "5 dagen te laat" });
  });

  it("schrijft één dag te laat in het enkelvoud", () => {
    const [r] = taskReminders([taak({ id: 1, date: "2026-08-05" })], VANDAAG);
    expect(r.label).toBe("1 dag te laat");
  });

  it("noemt morgen bij naam", () => {
    const [r] = taskReminders([taak({ id: 1, date: "2026-08-07" })], VANDAAG);
    expect(r).toMatchObject({ days: 1, urgency: "binnenkort", label: "Morgen" });
  });

  it("telt de dagen voor wat verderop ligt", () => {
    const [r] = taskReminders([taak({ id: 1, date: "2026-08-11" })], VANDAAG);
    expect(r.label).toBe("over 5 dagen");
  });

  it("kijkt niet verder vooruit dan de horizon", () => {
    const binnen = taskReminders([taak({ id: 1, date: "2026-08-20" })], VANDAAG);
    const buiten = taskReminders([taak({ id: 2, date: "2026-08-21" })], VANDAAG);
    expect(binnen).toHaveLength(1);
    expect(buiten).toHaveLength(0);
    expect(REMINDER_HORIZON_DAYS).toBe(14);
  });

  it("blijft wél alles tonen wat te laat is, hoe oud ook", () => {
    const r = taskReminders([taak({ id: 1, date: "2026-01-02" })], VANDAAG);
    expect(r).toHaveLength(1);
    expect(r[0].urgency).toBe("verlopen");
  });

  it("laat afgevinkte taken weg — die zijn gebeurd", () => {
    expect(taskReminders([taak({ id: 1, done: true })], VANDAAG)).toEqual([]);
  });

  it("laat taken zonder datum weg — die kunnen niet te laat zijn", () => {
    expect(taskReminders([taak({ id: 1, date: null })], VANDAAG)).toEqual([]);
  });

  it("zet het meest dringende bovenaan", () => {
    const r = taskReminders(
      [
        taak({ id: 1, date: "2026-08-11" }),
        taak({ id: 2, date: "2026-08-01" }),
        taak({ id: 3, date: VANDAAG }),
      ],
      VANDAAG,
    );
    expect(r.map((x) => x.id)).toEqual([2, 3, 1]);
  });

  it("sorteert binnen dezelfde dag op uur", () => {
    const r = taskReminders(
      [
        taak({ id: 1, time: "16:00" }),
        taak({ id: 2, time: null }),
        taak({ id: 3, time: "09:00" }),
      ],
      VANDAAG,
    );
    expect(r.map((x) => x.id)).toEqual([2, 3, 1]);
  });

  it("houdt het evenement erbij, zodat je weet waarover het gaat", () => {
    const [r] = taskReminders([taak({ id: 1, eventId: 9, eventName: "Kerstmarkt" })], VANDAAG);
    expect(r.eventId).toBe(9);
    expect(r.eventName).toBe("Kerstmarkt");
  });

  it("rekent over een maand- en jaargrens juist", () => {
    const [r] = taskReminders([taak({ id: 1, date: "2027-01-01" })], "2026-12-28");
    expect(r.days).toBe(4);
  });
});

describe("reminderCounts", () => {
  it("telt per dringendheid", () => {
    const r = taskReminders(
      [
        taak({ id: 1, date: "2026-08-01" }),
        taak({ id: 2, date: "2026-08-02" }),
        taak({ id: 3, date: VANDAAG }),
        taak({ id: 4, date: "2026-08-10" }),
      ],
      VANDAAG,
    );
    expect(reminderCounts(r)).toEqual({ verlopen: 2, vandaag: 1, binnenkort: 1, totaal: 4 });
  });

  it("telt nullen voor een lege lijst", () => {
    expect(reminderCounts([])).toEqual({ verlopen: 0, vandaag: 0, binnenkort: 0, totaal: 0 });
  });
});
