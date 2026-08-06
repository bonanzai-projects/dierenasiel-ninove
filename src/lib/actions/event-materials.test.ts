import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
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
    mockRequirePermission: vi.fn(), mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, update: mockUpdate, delete: mockDelete, select: mockSelect },
}));
vi.mock("@/lib/db/schema", () => ({ eventMaterials: Symbol("eventMaterials") }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import {
  createEventMaterial,
  updateEventMaterial,
  toggleEventMaterial,
  deleteEventMaterial,
} from "./event-materials";

function fd(data: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) {
    for (const w of Array.isArray(v) ? v : [v]) f.append(k, w);
  }
  return f;
}

function insertWaarden(): Record<string, unknown> {
  return (mockInsertValues.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
}
function updateWaarden(): Record<string, unknown> {
  return (mockUpdateSet.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
}

const geldig = {
  eventId: "7",
  name: "Tent 4x8",
  quantity: "2",
  origin: "geleend",
  supplier: "Chiro Ninove",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: 3, eventId: 7 }]);
  mockUpdateReturning.mockResolvedValue([{ id: 3, eventId: 7 }]);
  mockSelectLimit.mockResolvedValue([{ id: 3, eventId: 7, name: "Oud" }]);
});

describe("createEventMaterial", () => {
  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect((await createEventMaterial(null, fd(geldig))).success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart de regel met herkomst en leverancier", async () => {
    const res = await createEventMaterial(null, fd(geldig));
    expect(res.success).toBe(true);
    expect(insertWaarden()).toMatchObject({
      eventId: 7,
      name: "Tent 4x8",
      quantity: 2,
      origin: "geleend",
      supplier: "Chiro Ninove",
      arranged: false,
      returned: false,
    });
  });

  it("laat een leeg aantal leeg", async () => {
    await createEventMaterial(null, fd({ ...geldig, quantity: "" }));
    expect(insertWaarden().quantity).toBeNull();
  });

  it("leest het vinkje 'geregeld' via het hidden+checkbox-patroon", async () => {
    await createEventMaterial(null, fd({ ...geldig, arranged: ["false", "true"] }));
    expect(insertWaarden().arranged).toBe(true);
  });

  it("eist een omschrijving", async () => {
    const res = await createEventMaterial(null, fd({ ...geldig, name: " " }));
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("weigert een onbekende herkomst", async () => {
    const res = await createEventMaterial(null, fd({ ...geldig, origin: "gevonden" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.origin?.[0]).toBeTruthy();
  });

  it("weigert een aantal van nul", async () => {
    expect((await createEventMaterial(null, fd({ ...geldig, quantity: "0" }))).success).toBe(false);
  });
});

describe("updateEventMaterial", () => {
  it("bewaart de wijziging", async () => {
    const res = await updateEventMaterial(null, fd({ ...geldig, id: "3", supplier: "Gemeente" }));
    expect(res.success).toBe(true);
    expect(updateWaarden()).toMatchObject({ supplier: "Gemeente" });
  });

  it("meldt een regel die niet meer bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    expect((await updateEventMaterial(null, fd({ ...geldig, id: "3" }))).success).toBe(false);
  });
});

describe("toggleEventMaterial", () => {
  it("zet 'terugbezorgd' aan", async () => {
    const res = await toggleEventMaterial(3, "returned", true);
    expect(res.success).toBe(true);
    expect(updateWaarden()).toMatchObject({ returned: true });
  });

  it("zet 'geregeld' weer uit", async () => {
    await toggleEventMaterial(3, "arranged", false);
    expect(updateWaarden()).toMatchObject({ arranged: false });
  });

  it("weigert een veld dat niet mag", async () => {
    // @ts-expect-error — bewust een verkeerde veldnaam
    const res = await toggleEventMaterial(3, "name", true);
    expect(res.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteEventMaterial", () => {
  it("verwijdert de regel en logt dat", async () => {
    const res = await deleteEventMaterial(3);
    expect(res.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalledWith(
      "delete_event_material", "event_material", 3, expect.anything(), null,
    );
  });

  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect((await deleteEventMaterial(3)).success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
