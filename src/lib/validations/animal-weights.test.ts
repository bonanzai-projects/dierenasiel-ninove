import { describe, it, expect } from "vitest";
import { animalWeightSchema, todayInBrussels } from "./animal-weights";

const geldig = { animalId: "42", date: "2026-07-30", weightKg: "32,5", notes: "" };

describe("animalWeightSchema", () => {
  it("aanvaardt een weging met een komma", () => {
    const result = animalWeightSchema.safeParse(geldig);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.animalId).toBe(42);
    expect(result.data.weightKg).toBe(32.5);
    expect(result.data.date).toBe("2026-07-30");
  });

  it("weigert een gewicht dat geen getal is", () => {
    const result = animalWeightSchema.safeParse({ ...geldig, weightKg: "zwaar" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.weightKg?.[0]).toMatch(/kg/i);
  });

  it("weigert een leeg gewicht", () => {
    expect(animalWeightSchema.safeParse({ ...geldig, weightKg: "" }).success).toBe(false);
  });

  it("weigert een gewicht dat in gram lijkt ingetikt", () => {
    expect(animalWeightSchema.safeParse({ ...geldig, weightKg: "3400" }).success).toBe(false);
  });

  it("weigert een lege datum", () => {
    expect(animalWeightSchema.safeParse({ ...geldig, date: "" }).success).toBe(false);
  });

  it("weigert een weging in de toekomst", () => {
    const result = animalWeightSchema.safeParse({ ...geldig, date: "2099-01-01" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.date?.[0]).toMatch(/toekomst/i);
  });

  it("aanvaardt de dag van vandaag", () => {
    const result = animalWeightSchema.safeParse({ ...geldig, date: todayInBrussels() });
    expect(result.success).toBe(true);
  });

  it("houdt een opmerking bij en laat ze leeg zijn", () => {
    const met = animalWeightSchema.safeParse({ ...geldig, notes: "  na de operatie  " });
    expect(met.success && met.data.notes).toBe("na de operatie");

    const zonder = animalWeightSchema.safeParse({ ...geldig, notes: "" });
    expect(zonder.success && zonder.data.notes).toBe(undefined);
  });
});

describe("todayInBrussels", () => {
  it("geeft een datum in het formaat jjjj-mm-dd", () => {
    expect(todayInBrussels()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
