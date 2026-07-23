import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockReturning, mockValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom,
  mockRequirePermission, mockLogAudit, mockRevalidatePath,
  mockGetSession,
  mockCountBehaviorRecords,
  mockGetAnimalById,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });

  const mockRequirePermission = vi.fn();
  const mockLogAudit = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockGetSession = vi.fn();
  const mockCountBehaviorRecords = vi.fn();
  const mockGetAnimalById = vi.fn();

  return {
    mockReturning, mockValues, mockInsert,
    mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
    mockDeleteWhere, mockDelete,
    mockSelectLimit, mockSelectWhere, mockSelectFrom,
    mockRequirePermission, mockLogAudit, mockRevalidatePath,
    mockGetSession,
    mockCountBehaviorRecords,
    mockGetAnimalById,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/db/schema", () => ({
  behaviorRecords: Symbol("behaviorRecords"),
  animals: Symbol("animals"),
}));

vi.mock("@/lib/permissions", () => ({
  requirePermission: mockRequirePermission,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mockGetSession,
}));

vi.mock("@/lib/queries/behavior-records", () => ({
  countBehaviorRecords: mockCountBehaviorRecords,
}));

vi.mock("@/lib/queries/animals", () => ({
  getAnimalById: mockGetAnimalById,
}));

import { createBehaviorRecord, updateBehaviorRecord, deleteBehaviorRecord } from "./behavior-records";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

const validChecklist = {
  verzorgers_algemeenAgressief: false,
  verzorgers_agressiefSpeelgoed: false,
  verzorgers_agressiefVoederkom: null,
  verzorgers_agressiefMand: false,
  verzorgers_gemakkelijkWandeling: true,
  verzorgers_speeltGraag: true,
  verzorgers_andere: null,
  honden_algemeenAgressief: true,
  honden_agressiefSpeelgoed: false,
  honden_agressiefVoederkom: null,
  honden_agressiefMand: false,
  honden_speeltGraag: false,
  honden_andere: null,
};

const validFormData = {
  animalId: "1",
  date: "2026-02-26",
  checklist: JSON.stringify(validChecklist),
  notes: "Rustige hond",
};

const createdRecord = {
  id: 1,
  animalId: 1,
  date: "2026-02-26",
  checklist: validChecklist,
  notes: "Rustige hond",
  recordedBy: 10,
  createdAt: new Date(),
};

describe("createBehaviorRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({ userId: 10, email: "test@test.com", role: "medewerker", name: "Test" });
    mockGetAnimalById.mockResolvedValue({ id: 1, species: "hond" });
    mockCountBehaviorRecords.mockResolvedValue(0);
    mockReturning.mockResolvedValue([createdRecord]);
  });

  it("requires animal:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(mockRequirePermission).toHaveBeenCalledWith("animal:write");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Onvoldoende rechten");
    }
  });

  it("returns error when checklist JSON is invalid", async () => {
    const result = await createBehaviorRecord(null, makeFormData({
      animalId: "1",
      date: "2026-02-26",
      checklist: "invalid-json",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns fieldErrors when validation fails", async () => {
    const result = await createBehaviorRecord(null, makeFormData({
      animalId: "1",
      date: "",
      checklist: JSON.stringify(validChecklist),
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
    }
  });

  // Story 10.28: de harde limiet van 3 fiches is opgeheven — Bijlage VIII B gaat uit
  // van minstens wekelijkse evaluatie in de eerste drie weken.
  it("allows more than 3 records for dogs", async () => {
    mockGetAnimalById.mockResolvedValue({ id: 1, species: "hond" });
    mockCountBehaviorRecords.mockResolvedValue(3);

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
  });

  it("allows a long stay with many records for dogs", async () => {
    mockGetAnimalById.mockResolvedValue({ id: 1, species: "hond" });
    mockCountBehaviorRecords.mockResolvedValue(12);

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
  });

  it("allows more than 3 records for cats", async () => {
    mockGetAnimalById.mockResolvedValue({ id: 1, species: "kat" });
    mockCountBehaviorRecords.mockResolvedValue(5);

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
  });

  it("allows more than 3 records for other species", async () => {
    mockGetAnimalById.mockResolvedValue({ id: 1, species: "konijn" });
    mockCountBehaviorRecords.mockResolvedValue(10);

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
  });

  it("creates record with correct values including recordedBy", async () => {
    await createBehaviorRecord(null, makeFormData(validFormData));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        animalId: 1,
        date: "2026-02-26",
        checklist: validChecklist,
        notes: "Rustige hond",
        recordedBy: 10,
      }),
    );
  });

  it("calls logAudit after successful creation", async () => {
    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalledWith(
      "create_behavior_record",
      "behavior_record",
      1,
      null,
      expect.objectContaining({ id: 1 }),
    );
  });

  it("returns success with created record data", async () => {
    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expect.objectContaining({
        id: 1,
        animalId: 1,
      }));
    }
  });

  it("revalidates the dieren path after creation", async () => {
    await createBehaviorRecord(null, makeFormData(validFormData));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren");
  });

  it("returns graceful error on DB failure", async () => {
    mockReturning.mockRejectedValue(new Error("Connection refused"));

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns error when animal not found", async () => {
    mockGetAnimalById.mockResolvedValue(null);

    const result = await createBehaviorRecord(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe("updateBehaviorRecord", () => {
  const existingRecord = { ...createdRecord, id: 1 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([existingRecord]);
    mockUpdateReturning.mockResolvedValue([{
      ...existingRecord,
      notes: "Bijgewerkte notitie",
    }]);
  });

  it("requires animal:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await updateBehaviorRecord(null, makeFormData({
      ...validFormData,
      id: "1",
    }));

    expect(mockRequirePermission).toHaveBeenCalledWith("animal:write");
    expect(result.success).toBe(false);
  });

  it("returns error when record not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await updateBehaviorRecord(null, makeFormData({
      ...validFormData,
      id: "999",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Gedragsfiche niet gevonden");
    }
  });

  it("updates record and returns updated data", async () => {
    const result = await updateBehaviorRecord(null, makeFormData({
      ...validFormData,
      id: "1",
      notes: "Bijgewerkte notitie",
    }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Bijgewerkte notitie");
    }
  });

  it("logs audit with old and new values", async () => {
    await updateBehaviorRecord(null, makeFormData({
      ...validFormData,
      id: "1",
    }));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "update_behavior_record",
      "behavior_record",
      1,
      existingRecord,
      expect.objectContaining({ id: 1 }),
    );
  });

  it("revalidates the dieren path after update", async () => {
    await updateBehaviorRecord(null, makeFormData({
      ...validFormData,
      id: "1",
    }));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren");
  });

  it("returns graceful error on DB failure", async () => {
    mockUpdateReturning.mockRejectedValue(new Error("Connection refused"));

    const result = await updateBehaviorRecord(null, makeFormData({
      ...validFormData,
      id: "1",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe("deleteBehaviorRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([createdRecord]);
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  it("requires animal:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await deleteBehaviorRecord(null, makeFormData({ id: "1" }));

    expect(mockRequirePermission).toHaveBeenCalledWith("animal:write");
    expect(result.success).toBe(false);
  });

  it("returns error when record not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await deleteBehaviorRecord(null, makeFormData({ id: "999" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Gedragsfiche niet gevonden");
    }
  });

  it("deletes record successfully", async () => {
    const result = await deleteBehaviorRecord(null, makeFormData({ id: "1" }));

    expect(result.success).toBe(true);
  });

  it("logs audit after successful deletion", async () => {
    await deleteBehaviorRecord(null, makeFormData({ id: "1" }));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "delete_behavior_record",
      "behavior_record",
      1,
      expect.objectContaining({ id: 1 }),
      null,
    );
  });

  it("revalidates the dieren path after deletion", async () => {
    await deleteBehaviorRecord(null, makeFormData({ id: "1" }));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren");
  });

  it("returns graceful error on DB failure", async () => {
    mockDeleteWhere.mockRejectedValue(new Error("Connection refused"));

    const result = await deleteBehaviorRecord(null, makeFormData({ id: "1" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});
