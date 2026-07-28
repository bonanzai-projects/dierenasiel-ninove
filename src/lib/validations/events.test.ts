import { describe, it, expect } from "vitest";
import { eventSchema } from "./events";

const geldig = {
  name: "Eetkermis 2026",
  type: "eetkermis",
  status: "gepland",
  date: "2026-09-12",
};

function fout(input: Record<string, unknown>, veld: string) {
  const res = eventSchema.safeParse(input);
  expect(res.success).toBe(false);
  if (!res.success) {
    const fieldErrors = res.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    expect(fieldErrors[veld]).toBeDefined();
  }
}

describe("eventSchema", () => {
  it("aanvaardt een minimaal evenement", () => {
    const res = eventSchema.safeParse(geldig);
    expect(res.success).toBe(true);
  });

  it("eist een naam", () => {
    fout({ ...geldig, name: "" }, "name");
  });

  it("eist een begindatum", () => {
    fout({ ...geldig, date: "" }, "date");
  });

  it("eist een gekend type en een gekende status", () => {
    fout({ ...geldig, type: "verzonnen" }, "type");
    fout({ ...geldig, status: "verzonnen" }, "status");
  });

  it("weigert een einddatum vóór de begindatum", () => {
    fout({ ...geldig, endDate: "2026-09-11" }, "endDate");
  });

  it("weigert een einduur zonder beginuur", () => {
    fout({ ...geldig, endTime: "23:00" }, "startTime");
  });

  it("weigert een einduur vóór het beginuur op dezelfde dag", () => {
    fout({ ...geldig, startTime: "18:00", endTime: "17:00" }, "endTime");
  });

  it("laat een einduur vóór het beginuur toe over meerdere dagen", () => {
    const res = eventSchema.safeParse({
      ...geldig,
      endDate: "2026-09-13",
      startTime: "18:00",
      endTime: "02:00",
    });
    expect(res.success).toBe(true);
  });

  it("weigert een negatief aantal verwachte bezoekers", () => {
    fout({ ...geldig, expectedVisitors: "-5" }, "expectedVisitors");
  });

  it("laat verwachte bezoekers leeg zijn", () => {
    const res = eventSchema.safeParse({ ...geldig, expectedVisitors: "" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.expectedVisitors).toBeUndefined();
  });

  it("zet verwachte bezoekers om naar een getal", () => {
    const res = eventSchema.safeParse({ ...geldig, expectedVisitors: "250" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.expectedVisitors).toBe(250);
  });
});
