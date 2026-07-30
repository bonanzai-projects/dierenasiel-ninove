import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
  mockRequirePermission, mockGetSession, mockLogAudit, mockRevalidate, mockGetAnimalById,
} = vi.hoisted(() => {
  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  return {
    mockInsertReturning, mockInsertValues, mockInsert,
    mockDeleteWhere, mockDelete,
    mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
    mockRequirePermission: vi.fn(), mockGetSession: vi.fn(),
    mockLogAudit: vi.fn(), mockRevalidate: vi.fn(), mockGetAnimalById: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, delete: mockDelete, select: mockSelect },
}));
vi.mock("@/lib/db/schema", () => ({ animalWeights: { id: "animal_weights.id" } }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("@/lib/queries/animals", () => ({ getAnimalById: mockGetAnimalById }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { createAnimalWeight, deleteAnimalWeight } from "./animal-weights";

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const geldig = { animalId: "42", date: "2026-07-30", weightKg: "32,5", notes: "" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 20, name: "Sven", role: "beheerder" });
  mockGetAnimalById.mockResolvedValue({ id: 42, name: "Iza" });
  mockLogAudit.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: 7, animalId: 42, date: "2026-07-30", weightKg: "32.500" }]);
});

describe("createAnimalWeight", () => {
  it("weigert wie geen dieren mag bewerken", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Geen toegang" });

    const result = await createAnimalWeight(null, fd(geldig));

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart het gewicht in kilogram en onthoudt wie het woog", async () => {
    const result = await createAnimalWeight(null, fd(geldig));

    expect(result.success).toBe(true);
    const waarden = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(waarden.animalId).toBe(42);
    expect(waarden.date).toBe("2026-07-30");
    expect(waarden.weightKg).toBe("32.5");
    expect(waarden.recordedBy).toBe(20);
    expect(waarden.notes).toBeNull();
  });

  it("geeft veldfouten terug bij een onmogelijk gewicht", async () => {
    const result = await createAnimalWeight(null, fd({ ...geldig, weightKg: "3400" }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.weightKg?.[0]).toMatch(/kg/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("meldt het wanneer het dier niet bestaat", async () => {
    mockGetAnimalById.mockResolvedValue(null);

    const result = await createAnimalWeight(null, fd(geldig));

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("schrijft de weging in het logboek en vernieuwt de fiche", async () => {
    await createAnimalWeight(null, fd(geldig));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "create_animal_weight",
      "animal_weight",
      7,
      null,
      expect.objectContaining({ id: 7 }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/dieren");
  });
});

describe("deleteAnimalWeight", () => {
  beforeEach(() => {
    mockSelectLimit.mockResolvedValue([{ id: 7, animalId: 42, weightKg: "32.500" }]);
  });

  it("weigert wie geen dieren mag bewerken", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Geen toegang" });

    const result = await deleteAnimalWeight(null, fd({ id: "7" }));

    expect(result.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("verwijdert de weging en logt het", async () => {
    const result = await deleteAnimalWeight(null, fd({ id: "7" }));

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(
      "delete_animal_weight",
      "animal_weight",
      7,
      expect.objectContaining({ id: 7 }),
      null,
    );
  });

  it("meldt het wanneer de weging niet meer bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await deleteAnimalWeight(null, fd({ id: "7" }));

    expect(result.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
