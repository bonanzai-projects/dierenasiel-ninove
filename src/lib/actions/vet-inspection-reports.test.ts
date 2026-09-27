import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockReturning, mockInsert,
  mockUpdateSet, mockUpdate,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom,
  mockRequirePermission, mockLogAudit, mockRevalidatePath, mockGetSession,
  mockValues, mockGetVeterinarianById,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn();
  const mockGetVeterinarianById = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockRequirePermission = vi.fn();
  const mockLogAudit = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockGetSession = vi.fn();
  return {
    mockReturning, mockInsert,
    mockUpdateSet, mockUpdate,
    mockDeleteWhere, mockDelete,
    mockSelectLimit, mockSelectWhere, mockSelectFrom,
    mockRequirePermission, mockLogAudit, mockRevalidatePath, mockGetSession,
    mockValues, mockGetVeterinarianById,
  };
});

vi.mock("@/lib/db", () => {
  mockValues.mockReturnValue({ returning: mockReturning });
  mockInsert.mockReturnValue({ values: mockValues });
  const mockUpdateReturning = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });
  return {
    db: {
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/db/schema", () => ({
  vetInspectionReports: { id: Symbol("vetInspectionReports.id") },
}));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/queries/veterinarians", () => ({ getVeterinarianById: mockGetVeterinarianById }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })) }));

import { createVetInspectionReport, signVetInspectionReport, deleteVetInspectionReport } from "./vet-inspection-reports";

const validPayload = {
  visitDate: "2026-02-27",
  vetName: "Dr. Janssen",
  animalsTreated: [
    { animalId: 1, animalName: "Buddy", species: "hond", chipNr: "981234567890", diagnosis: "Oorontsteking", treatment: "Antibiotica" },
  ],
  animalsEuthanized: [],
  abnormalBehavior: [],
  recommendations: "Verbeter ventilatie.",
};

function makeFormData(json: unknown): FormData {
  const fd = new FormData();
  fd.append("json", JSON.stringify(json));
  return fd;
}

function makeIdFormData(id: string): FormData {
  const fd = new FormData();
  fd.append("id", id);
  return fd;
}

const createdRecord = {
  id: 1,
  visitDate: "2026-02-27",
  vetUserId: 5,
  vetName: "Dr. Janssen",
  vetSignature: false,
  signedAt: null,
  animalsTreated: validPayload.animalsTreated,
  animalsEuthanized: [],
  abnormalBehavior: [],
  recommendations: "Verbeter ventilatie.",
  createdAt: new Date(),
};

const signedRecord = {
  ...createdRecord,
  vetSignature: true,
  signedAt: new Date(),
};

describe("createVetInspectionReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({ userId: 5, role: "dierenarts", name: "Dr. Janssen" });
    mockReturning.mockResolvedValue([createdRecord]);
  });

  it("requires medical:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const result = await createVetInspectionReport(null, makeFormData(validPayload));
    expect(mockRequirePermission).toHaveBeenCalledWith("medical:write");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Onvoldoende rechten");
  });

  it("returns error when json is missing from FormData", async () => {
    const result = await createVetInspectionReport(null, new FormData());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns fieldErrors when visitDate is missing", async () => {
    const result = await createVetInspectionReport(null, makeFormData({ vetName: "Dr. Janssen" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors?.visitDate).toBeDefined();
  });

  it("returns fieldErrors when vetName is empty", async () => {
    const result = await createVetInspectionReport(null, makeFormData({ ...validPayload, vetName: "" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors?.vetName).toBeDefined();
  });

  it("creates report with valid data", async () => {
    const result = await createVetInspectionReport(null, makeFormData(validPayload));
    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("stores vetUserId from session", async () => {
    const result = await createVetInspectionReport(null, makeFormData(validPayload));
    expect(result.success).toBe(true);
  });

  it("calls logAudit after success", async () => {
    await createVetInspectionReport(null, makeFormData(validPayload));
    expect(mockLogAudit).toHaveBeenCalledWith(
      "create_vet_inspection_report",
      "vet_inspection_report",
      1,
      null,
      expect.objectContaining({ id: 1 }),
    );
  });

  it("revalidates bezoekrapport path", async () => {
    await createVetInspectionReport(null, makeFormData(validPayload));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/medisch/bezoekrapport");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/medisch");
  });

  it("returns graceful error on DB failure", async () => {
    mockReturning.mockRejectedValue(new Error("Connection refused"));
    const result = await createVetInspectionReport(null, makeFormData(validPayload));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("creates report with minimal data (no arrays)", async () => {
    const minimal = { visitDate: "2026-02-27", vetName: "Dr. Janssen" };
    const result = await createVetInspectionReport(null, makeFormData(minimal));
    expect(result.success).toBe(true);
  });

  // Story 10.81 — dierenarts uit de lijst: de fiche bepaalt de naam op het rapport.
  it("koppelt de dierenarts uit de lijst en neemt de naam van de fiche over", async () => {
    mockGetVeterinarianById.mockResolvedValue({ id: 3, name: "Dr. Ine Wouters" });
    const result = await createVetInspectionReport(null, makeFormData({ ...validPayload, vetName: "iets anders", veterinarianId: 3 }));
    expect(result.success).toBe(true);
    expect(mockGetVeterinarianById).toHaveBeenCalledWith(3);
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ veterinarianId: 3, vetName: "Dr. Ine Wouters" }));
  });

  it("weigert een dierenarts die niet (meer) in de lijst staat", async () => {
    mockGetVeterinarianById.mockResolvedValue(null);
    const result = await createVetInspectionReport(null, makeFormData({ ...validPayload, veterinarianId: 99 }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors?.vetName?.[0]).toMatch(/niet gevonden/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("geeft een nette fout als de dierenartsenlijst niet te lezen is", async () => {
    mockGetVeterinarianById.mockRejectedValue(new Error("Connection refused"));
    const result = await createVetInspectionReport(null, makeFormData({ ...validPayload, veterinarianId: 3 }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/Er ging iets mis/);
  });

  it("bewaart zonder koppeling als de dierenarts niet in de lijst staat (Andere)", async () => {
    await createVetInspectionReport(null, makeFormData(validPayload));
    expect(mockGetVeterinarianById).not.toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ veterinarianId: null, vetName: "Dr. Janssen" }));
  });
});

describe("signVetInspectionReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([createdRecord]);
    mockReturning.mockResolvedValue([signedRecord]);
  });

  it("requires medical:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const result = await signVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(false);
  });

  it("returns error when id is invalid", async () => {
    const result = await signVetInspectionReport(null, makeIdFormData("abc"));
    expect(result.success).toBe(false);
  });

  it("returns error when report not found", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await signVetInspectionReport(null, makeIdFormData("999"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Rapport niet gevonden");
  });

  it("returns error when already signed", async () => {
    mockSelectLimit.mockResolvedValue([signedRecord]);
    const result = await signVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Rapport is al ondertekend");
  });

  it("signs report successfully", async () => {
    const result = await signVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("calls logAudit after signing", async () => {
    await signVetInspectionReport(null, makeIdFormData("1"));
    expect(mockLogAudit).toHaveBeenCalledWith(
      "sign_vet_inspection_report",
      "vet_inspection_report",
      1,
      expect.objectContaining({ vetSignature: false }),
      expect.objectContaining({ vetSignature: true }),
    );
  });

  it("revalidates paths after signing", async () => {
    await signVetInspectionReport(null, makeIdFormData("1"));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/medisch/bezoekrapport");
  });

  it("returns graceful error on DB failure", async () => {
    mockReturning.mockRejectedValue(new Error("Connection refused"));
    const result = await signVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(false);
  });
});

describe("deleteVetInspectionReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([createdRecord]);
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  it("requires medical:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const result = await deleteVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(false);
  });

  it("returns error when id is invalid", async () => {
    const result = await deleteVetInspectionReport(null, makeIdFormData("abc"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ongeldig rapport-ID");
  });

  it("returns error when not found", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await deleteVetInspectionReport(null, makeIdFormData("999"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Rapport niet gevonden");
  });

  it("returns error when report is signed", async () => {
    mockSelectLimit.mockResolvedValue([signedRecord]);
    const result = await deleteVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ondertekend rapport kan niet verwijderd worden");
  });

  it("deletes unsigned report successfully", async () => {
    const result = await deleteVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("calls logAudit with old value", async () => {
    await deleteVetInspectionReport(null, makeIdFormData("1"));
    expect(mockLogAudit).toHaveBeenCalledWith(
      "delete_vet_inspection_report",
      "vet_inspection_report",
      1,
      createdRecord,
      null,
    );
  });

  it("revalidates paths after deletion", async () => {
    await deleteVetInspectionReport(null, makeIdFormData("1"));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/medisch/bezoekrapport");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/medisch");
  });

  it("returns graceful error on DB failure", async () => {
    mockDeleteWhere.mockRejectedValue(new Error("Connection refused"));
    const result = await deleteVetInspectionReport(null, makeIdFormData("1"));
    expect(result.success).toBe(false);
  });
});
