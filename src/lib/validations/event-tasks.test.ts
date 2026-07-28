import { describe, it, expect } from "vitest";
import { eventTaskSchema } from "./event-tasks";

const geldig = { eventId: "4", phase: "voorbereiding", title: "Zaal reserveren" };

function veldFout(input: Record<string, unknown>, veld: string) {
  const res = eventTaskSchema.safeParse(input);
  expect(res.success).toBe(false);
  if (!res.success) {
    const fieldErrors = res.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    expect(fieldErrors[veld]).toBeDefined();
  }
}

describe("eventTaskSchema", () => {
  it("aanvaardt een minimale taak", () => {
    const res = eventTaskSchema.safeParse(geldig);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.eventId).toBe(4);
  });

  it("eist een omschrijving", () => {
    veldFout({ ...geldig, title: "   " }, "title");
  });

  it("eist een gekende fase", () => {
    veldFout({ ...geldig, phase: "tussendoor" }, "phase");
  });

  it("eist een evenement", () => {
    veldFout({ ...geldig, eventId: "0" }, "eventId");
  });

  it("weigert een ongeldig uur", () => {
    veldFout({ ...geldig, time: "25:00" }, "time");
  });

  it("aanvaardt een geldig uur en een datum", () => {
    const res = eventTaskSchema.safeParse({ ...geldig, date: "2026-09-12", time: "08:30" });
    expect(res.success).toBe(true);
  });

  it("laat datum en uur leeg", () => {
    const res = eventTaskSchema.safeParse({ ...geldig, date: "", time: "" });
    expect(res.success).toBe(true);
  });
});
