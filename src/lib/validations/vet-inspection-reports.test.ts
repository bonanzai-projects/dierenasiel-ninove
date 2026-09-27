import { describe, it, expect } from "vitest";
import {
  createVetInspectionReportSchema,
  signReportSchema,
  treatedAnimalSchema,
  euthanizedAnimalSchema,
  abnormalBehaviorSchema,
} from "./vet-inspection-reports";

describe("createVetInspectionReportSchema", () => {
  const validMinimal = {
    visitDate: "2026-02-27",
    vetName: "Dr. Janssen",
  };

  it("accepts valid minimal data (visitDate + vetName only)", () => {
    const result = createVetInspectionReportSchema.safeParse(validMinimal);
    expect(result.success).toBe(true);
  });

  it("coerces visitDate in YYYY-MM-DD format", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      visitDate: "2026-01-15",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.visitDate).toBe("2026-01-15");
  });

  it("rejects missing visitDate", () => {
    const result = createVetInspectionReportSchema.safeParse({
      vetName: "Dr. Janssen",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.visitDate).toBeDefined();
    }
  });

  it("rejects invalid visitDate format", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      visitDate: "27-02-2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.visitDate).toBeDefined();
    }
  });

  it("rejects empty vetName", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      vetName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.vetName).toBeDefined();
    }
  });

  it("rejects missing vetName", () => {
    const result = createVetInspectionReportSchema.safeParse({
      visitDate: "2026-02-27",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.vetName).toBeDefined();
    }
  });

  it("rejects vetName longer than 200 characters", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      vetName: "A".repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.vetName).toBeDefined();
    }
  });

  it("accepts valid animalsTreated array", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      animalsTreated: [
        {
          animalId: 1,
          animalName: "Buddy",
          species: "hond",
          chipNr: "981234567890",
          diagnosis: "Oorontsteking",
          treatment: "Antibiotica",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid animalsTreated entry (missing fields)", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      animalsTreated: [
        { animalId: 1, animalName: "Buddy" }, // missing species, diagnosis, treatment
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid animalsEuthanized array", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      animalsEuthanized: [
        {
          animalId: 2,
          animalName: "Max",
          species: "hond",
          chipNr: null,
          reason: "Onbehandelbare pijn",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid abnormalBehavior array", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      abnormalBehavior: [
        {
          animalId: 3,
          animalName: "Luna",
          species: "kat",
          chipNr: "981234567891",
          description: "Agressief gedrag bij benadering",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts recommendations text", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      recommendations: "Verbeter ventilatie in kattenverblijf.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects recommendations longer than 5000 characters", () => {
    const result = createVetInspectionReportSchema.safeParse({
      ...validMinimal,
      recommendations: "A".repeat(5001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.recommendations).toBeDefined();
    }
  });

  it("defaults arrays to empty when not provided", () => {
    const result = createVetInspectionReportSchema.safeParse(validMinimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.animalsTreated).toEqual([]);
      expect(result.data.animalsEuthanized).toEqual([]);
      expect(result.data.abnormalBehavior).toEqual([]);
    }
  });

  // Story 10.81 — dierenarts uit de lijst (of "Andere": geen id, enkel naam).
  it("aanvaardt een dierenarts uit de lijst", () => {
    const result = createVetInspectionReportSchema.safeParse({ ...validMinimal, veterinarianId: 3 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.veterinarianId).toBe(3);
  });

  it("aanvaardt geen dierenarts uit de lijst (null of weggelaten)", () => {
    expect(createVetInspectionReportSchema.safeParse({ ...validMinimal, veterinarianId: null }).success).toBe(true);
    expect(createVetInspectionReportSchema.safeParse(validMinimal).success).toBe(true);
  });

  it("weigert een ongeldig dierenarts-id", () => {
    expect(createVetInspectionReportSchema.safeParse({ ...validMinimal, veterinarianId: 0 }).success).toBe(false);
    expect(createVetInspectionReportSchema.safeParse({ ...validMinimal, veterinarianId: 1.5 }).success).toBe(false);
  });
});

describe("treatedAnimalSchema", () => {
  it("accepts valid entry", () => {
    const result = treatedAnimalSchema.safeParse({
      animalId: 1,
      animalName: "Buddy",
      species: "hond",
      chipNr: "981234567890",
      diagnosis: "Oorontsteking",
      treatment: "Antibiotica",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null chipNr", () => {
    const result = treatedAnimalSchema.safeParse({
      animalId: 1,
      animalName: "Buddy",
      species: "hond",
      chipNr: null,
      diagnosis: "Oorontsteking",
      treatment: "Antibiotica",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing diagnosis", () => {
    const result = treatedAnimalSchema.safeParse({
      animalId: 1,
      animalName: "Buddy",
      species: "hond",
      chipNr: null,
      treatment: "Antibiotica",
    });
    expect(result.success).toBe(false);
  });
});

describe("euthanizedAnimalSchema", () => {
  it("accepts valid entry", () => {
    const result = euthanizedAnimalSchema.safeParse({
      animalId: 2,
      animalName: "Max",
      species: "hond",
      chipNr: null,
      reason: "Onbehandelbare pijn",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reason", () => {
    const result = euthanizedAnimalSchema.safeParse({
      animalId: 2,
      animalName: "Max",
      species: "hond",
      chipNr: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("abnormalBehaviorSchema", () => {
  it("accepts valid entry", () => {
    const result = abnormalBehaviorSchema.safeParse({
      animalId: 3,
      animalName: "Luna",
      species: "kat",
      chipNr: "981234567891",
      description: "Agressief gedrag",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing description", () => {
    const result = abnormalBehaviorSchema.safeParse({
      animalId: 3,
      animalName: "Luna",
      species: "kat",
      chipNr: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("signReportSchema", () => {
  it("accepts valid id", () => {
    const result = signReportSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("coerces string id to number", () => {
    const result = signReportSchema.safeParse({ id: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(5);
  });

  it("rejects zero id", () => {
    const result = signReportSchema.safeParse({ id: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative id", () => {
    const result = signReportSchema.safeParse({ id: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric string", () => {
    const result = signReportSchema.safeParse({ id: "abc" });
    expect(result.success).toBe(false);
  });
});
