import { describe, it, expect } from "vitest";
import { calendarEventSchema } from "./calendar-events";

const valid = {
  title: "Stage Lien",
  category: "stage" as const,
  date: "2026-09-12",
};

describe("calendarEventSchema", () => {
  it("aanvaardt een minimaal geldig item (titel + categorie + datum)", () => {
    expect(calendarEventSchema.safeParse(valid).success).toBe(true);
  });

  // Story 13.7: een evenement ontstaat in de evenementenmodule, niet hier.
  it("weigert de categorie 'evenement'", () => {
    const r = calendarEventSchema.safeParse({ ...valid, category: "evenement" });
    expect(r.success).toBe(false);
  });

  it("eist een titel", () => {
    const r = calendarEventSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(false);
  });

  it("eist een geldige categorie", () => {
    const r = calendarEventSchema.safeParse({ ...valid, category: "onbekend" });
    expect(r.success).toBe(false);
  });

  it("aanvaardt lege tijden (hele dag)", () => {
    const r = calendarEventSchema.safeParse({ ...valid, startTime: "", endTime: "" });
    expect(r.success).toBe(true);
  });

  it("weigert een ongeldig uur", () => {
    const r = calendarEventSchema.safeParse({ ...valid, startTime: "25:00" });
    expect(r.success).toBe(false);
  });

  it("weigert een einddatum vóór de begindatum", () => {
    const r = calendarEventSchema.safeParse({ ...valid, date: "2026-09-12", endDate: "2026-09-10" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.endDate).toBeDefined();
  });

  it("weigert een einduur zonder beginuur", () => {
    const r = calendarEventSchema.safeParse({ ...valid, endTime: "12:00" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.startTime).toBeDefined();
  });

  it("weigert einduur vóór beginuur op dezelfde dag", () => {
    const r = calendarEventSchema.safeParse({ ...valid, startTime: "14:00", endTime: "13:00" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.endTime).toBeDefined();
  });

  it("coerced animalId van string naar number", () => {
    const r = calendarEventSchema.safeParse({ ...valid, animalId: "7" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.animalId).toBe(7);
  });
});
