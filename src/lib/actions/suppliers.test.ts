import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
  mockBatch,
  mockRequirePermission, mockLogAudit, mockRevalidate,
} = vi.hoisted(() => {
  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  return {
    mockInsertReturning, mockInsertValues, mockInsert,
    mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
    mockDeleteWhere, mockDelete,
    mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
    mockBatch: vi.fn(),
    mockRequirePermission: vi.fn(), mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, update: mockUpdate, delete: mockDelete, select: mockSelect, batch: mockBatch },
}));
vi.mock("@/lib/db/schema", () => ({
  suppliers: { id: "suppliers.id", name: "suppliers.name" },
  eventCosts: { supplier: "event_costs.supplier" },
  eventMaterials: { supplier: "event_materials.supplier" },
}));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { createSupplier, updateSupplier, deleteSupplier } from "./suppliers";
import { eventCosts, eventMaterials, suppliers } from "@/lib/db/schema";

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const geldig = {
  name: "Brouwerij De Ryck",
  phone: "0470 12 34 56",
  email: "info@deryck.be",
  website: "deryck.be",
  notes: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  // mockResolvedValueOnce-wachtrijen overleven clearAllMocks; reset ze.
  mockSelectLimit.mockReset();
  mockSelectLimit.mockResolvedValue([]);
  mockBatch.mockReset();
  mockBatch.mockResolvedValue([[{ id: 3, name: "Brouwerij De Ryck" }], undefined, undefined]);
  mockRequirePermission.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: 3, name: "Brouwerij De Ryck" }]);
  mockUpdateReturning.mockResolvedValue([{ id: 3, name: "Brouwerij De Ryck" }]);
});

describe("createSupplier (Story 13.16)", () => {
  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await createSupplier(null, fd(geldig));
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart de leverancier, met de website aangevuld", async () => {
    const res = await createSupplier(null, fd(geldig));
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(suppliers);
    expect(mockInsertValues.mock.calls[0][0]).toMatchObject({
      name: "Brouwerij De Ryck",
      phone: "0470 12 34 56",
      email: "info@deryck.be",
      website: "https://deryck.be",
      notes: null,
    });
    expect(mockLogAudit).toHaveBeenCalledWith("create_supplier", "supplier", 3, null, expect.anything());
  });

  it("weigert een naam die al bestaat, ook met andere hoofdletters", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 9 }]);
    const res = await createSupplier(null, fd({ ...geldig, name: "brouwerij de ryck" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.name?.[0]).toMatch(/bestaat al/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // Review 13.16: React 19 zet het formulier na de action terug; zonder de waarden
  // is wat de gebruiker net typte weg.
  it("stuurt de ingevulde waarden terug bij een databankfout", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("DB weg"));
    const res = await createSupplier(null, fd(geldig));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/ging iets mis/);
      expect(res.values).toMatchObject({ name: "Brouwerij De Ryck", phone: "0470 12 34 56" });
    }
  });

  it("weigert een ongeldig e-mailadres", async () => {
    const res = await createSupplier(null, fd({ ...geldig, email: "info@" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.email).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("updateSupplier (Story 13.16)", () => {
  it("past bij een naamswijziging alle kosten- en materiaalregels mee aan, in één batch", async () => {
    // 1e select = de huidige leverancier, 2e = bestaat de nieuwe naam al?
    mockSelectLimit.mockResolvedValueOnce([{ id: 3, name: "De Ryck" }]).mockResolvedValueOnce([]);

    const res = await updateSupplier(null, fd({ id: "3", ...geldig }));

    expect(res.success).toBe(true);
    // Review 13.16: één batch = één transactie bij Neon over HTTP — alles of niets.
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch.mock.calls[0][0]).toHaveLength(3);
    expect(mockUpdate).toHaveBeenCalledWith(suppliers);
    expect(mockUpdate).toHaveBeenCalledWith(eventCosts);
    expect(mockUpdate).toHaveBeenCalledWith(eventMaterials);
    const regelUpdates = mockUpdateSet.mock.calls.filter(
      (c) => (c[0] as Record<string, unknown>).supplier !== undefined,
    );
    expect(regelUpdates).toHaveLength(2);
    for (const [waarden] of regelUpdates) {
      expect(waarden).toEqual({ supplier: "Brouwerij De Ryck", updatedAt: expect.any(Date) });
    }
  });

  it("meldt een fout en geeft de waarden terug als de batch mislukt", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 3, name: "De Ryck" }]).mockResolvedValueOnce([]);
    mockBatch.mockRejectedValueOnce(new Error("timeout"));

    const res = await updateSupplier(null, fd({ id: "3", ...geldig }));

    expect(res.success).toBe(false);
    if (!res.success) expect(res.values?.name).toBe("Brouwerij De Ryck");
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("raakt de regels niet aan wanneer de naam niet wijzigt", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 3, name: "Brouwerij De Ryck" }]);

    const res = await updateSupplier(null, fd({ id: "3", ...geldig }));

    expect(res.success).toBe(true);
    expect(mockBatch).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(suppliers);
  });

  it("weigert hernoemen naar een naam van een andere leverancier", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 3, name: "De Ryck" }]).mockResolvedValueOnce([{ id: 9 }]);

    const res = await updateSupplier(null, fd({ id: "3", ...geldig }));

    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.name?.[0]).toMatch(/bestaat al/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("geeft een fout voor een onbekende leverancier, met de waarden terug", async () => {
    const res = await updateSupplier(null, fd({ id: "99", ...geldig }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.values?.name).toBe("Brouwerij De Ryck");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("adres van de leverancier (Story 13.18)", () => {
  const metAdres = { ...geldig, street: "Kerkstraat", houseNumber: "12", postalCode: "9400", city: "Ninove" };
  const adres = { street: "Kerkstraat", houseNumber: "12", postalCode: "9400", city: "Ninove" };

  it("bewaart het adres in vier aparte velden", async () => {
    const res = await createSupplier(null, fd(metAdres));
    expect(res.success).toBe(true);
    expect(mockInsertValues.mock.calls[0][0]).toMatchObject(adres);
  });

  it("werkt het adres bij", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 3, name: "Brouwerij De Ryck" }]);
    const res = await updateSupplier(null, fd({ id: "3", ...metAdres }));
    expect(res.success).toBe(true);
    expect(mockUpdateSet.mock.calls[0][0]).toMatchObject(adres);
  });

  it("geeft het adres terug bij een fout, zodat het formulier het niet verliest", async () => {
    const res = await createSupplier(null, fd({ ...metAdres, email: "info@" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.values).toMatchObject(adres);
  });
});

describe("deleteSupplier (Story 13.16)", () => {
  it("verwijdert enkel de leverancier; de regels houden hun naam", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 3, name: "De Ryck" }]);

    const res = await deleteSupplier(3);

    expect(res.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(suppliers);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith("delete_supplier", "supplier", 3, expect.anything(), null);
  });

  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await deleteSupplier(3);
    expect(res.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
