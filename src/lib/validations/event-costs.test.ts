import { describe, it, expect } from "vitest";
import { eventCostSchema } from "./event-costs";

const geldig = {
  eventId: "7",
  kind: "kost",
  category: "drank",
  description: "Drank bij de brouwer",
  budgetAmount: "400",
  actualAmount: "560,50",
  supplier: "Brouwerij De Ryck",
  paid: true,
  notes: "",
};

describe("eventCostSchema", () => {
  it("aanvaardt een volledige kostenlijn en zet de bedragen om", () => {
    const res = eventCostSchema.safeParse(geldig);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.eventId).toBe(7);
      expect(res.data.budgetAmount).toBe(400);
      expect(res.data.actualAmount).toBe(560.5);
      expect(res.data.paid).toBe(true);
    }
  });

  it("aanvaardt een lijn zonder bedragen — die mogen later komen", () => {
    const res = eventCostSchema.safeParse({ ...geldig, budgetAmount: "", actualAmount: "" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.budgetAmount).toBeNull();
      expect(res.data.actualAmount).toBeNull();
    }
  });

  it("eist een omschrijving", () => {
    const res = eventCostSchema.safeParse({ ...geldig, description: "  " });
    expect(res.success).toBe(false);
  });

  it("weigert een onbekende soort", () => {
    expect(eventCostSchema.safeParse({ ...geldig, kind: "gift" }).success).toBe(false);
  });

  it("weigert een categorie die niet bij de soort hoort", () => {
    // "tombola" bestaat enkel als opbrengst.
    const res = eventCostSchema.safeParse({ ...geldig, kind: "kost", category: "tombola" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.category?.[0]).toMatch(/categorie/i);
    }
  });

  it("aanvaardt diezelfde categorie wél aan de opbrengstenkant", () => {
    const res = eventCostSchema.safeParse({ ...geldig, kind: "opbrengst", category: "tombola" });
    expect(res.success).toBe(true);
  });

  it("weigert een onleesbaar bedrag met een verstaanbare boodschap", () => {
    const res = eventCostSchema.safeParse({ ...geldig, budgetAmount: "veel" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.budgetAmount?.[0]).toBe("Ongeldig bedrag");
    }
  });

  it("weigert een negatief bedrag", () => {
    const res = eventCostSchema.safeParse({ ...geldig, actualAmount: "-10" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.actualAmount?.[0]).toMatch(/negatief/i);
    }
  });
});
