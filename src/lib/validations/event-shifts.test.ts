import { describe, it, expect } from "vitest";
import { eventShiftSchema } from "./event-shifts";

const geldig = {
  eventId: "7",
  date: "2026-11-14",
  startTime: "16:00",
  endTime: "20:00",
  post: "Bar",
  personName: "Katrien",
  notes: "",
};

describe("eventShiftSchema", () => {
  it("aanvaardt een volledige shift", () => {
    const res = eventShiftSchema.safeParse(geldig);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.eventId).toBe(7);
  });

  it("aanvaardt een shift zonder uren — dat is 'hele dag'", () => {
    const res = eventShiftSchema.safeParse({ ...geldig, startTime: "", endTime: "" });
    expect(res.success).toBe(true);
  });

  it("eist een dag", () => {
    expect(eventShiftSchema.safeParse({ ...geldig, date: "" }).success).toBe(false);
  });

  it("eist een naam", () => {
    const res = eventShiftSchema.safeParse({ ...geldig, personName: "   " });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.flatten().fieldErrors.personName?.[0]).toBeTruthy();
  });

  it("eist een post", () => {
    expect(eventShiftSchema.safeParse({ ...geldig, post: "" }).success).toBe(false);
  });

  it("weigert een einduur vóór het beginuur", () => {
    const res = eventShiftSchema.safeParse({ ...geldig, startTime: "20:00", endTime: "16:00" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.flatten().fieldErrors.endTime?.[0]).toMatch(/vóór/i);
  });

  it("aanvaardt een shift die over middernacht loopt niet stilzwijgend, maar wel een gelijk uur", () => {
    expect(eventShiftSchema.safeParse({ ...geldig, startTime: "16:00", endTime: "16:00" }).success).toBe(true);
  });

  it("vraagt eerst een beginuur wanneer enkel het einduur ingevuld is", () => {
    const res = eventShiftSchema.safeParse({ ...geldig, startTime: "", endTime: "20:00" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.flatten().fieldErrors.startTime?.[0]).toBeTruthy();
  });

  it("weigert een onmogelijk uur", () => {
    expect(eventShiftSchema.safeParse({ ...geldig, startTime: "26:00" }).success).toBe(false);
  });
});
