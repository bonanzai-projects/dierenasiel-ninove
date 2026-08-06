import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
  mockRequirePermission, mockGetSession, mockLogAudit, mockRevalidate,
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
    mockRequirePermission: vi.fn(), mockGetSession: vi.fn(),
    mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, update: mockUpdate, delete: mockDelete, select: mockSelect },
}));
vi.mock("@/lib/db/schema", () => ({ eventCosts: Symbol("eventCosts") }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { createEventCost, updateEventCost, deleteEventCost } from "./event-costs";

function fd(data: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) {
    for (const waarde of Array.isArray(v) ? v : [v]) f.append(k, waarde);
  }
  return f;
}

/** De waarden die de action aan drizzle doorgeeft. */
function insertWaarden(n = 0): Record<string, unknown> {
  return (mockInsertValues.mock.calls[n] as unknown[])[0] as Record<string, unknown>;
}
function updateWaarden(n = 0): Record<string, unknown> {
  return (mockUpdateSet.mock.calls[n] as unknown[])[0] as Record<string, unknown>;
}

const geldig = {
  eventId: "4",
  kind: "kost",
  category: "drank",
  description: "Drank bij de brouwer",
  budgetAmount: "400",
  actualAmount: "560,50",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 7, role: "beheerder" });
  mockLogAudit.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: 3, eventId: 4 }]);
  mockUpdateReturning.mockResolvedValue([{ id: 3, eventId: 4 }]);
  mockSelectLimit.mockResolvedValue([{ id: 3, eventId: 4, description: "Oud" }]);
});

describe("createEventCost", () => {
  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await createEventCost(null, fd(geldig));
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart de bedragen als tekst, zoals numeric ze verwacht", async () => {
    const res = await createEventCost(null, fd(geldig));
    expect(res.success).toBe(true);
    expect(insertWaarden()).toMatchObject({
      eventId: 4,
      kind: "kost",
      category: "drank",
      budgetAmount: "400",
      actualAmount: "560.5",
    });
  });

  it("laat een leeg bedrag leeg in plaats van er nul van te maken", async () => {
    await createEventCost(null, fd({ ...geldig, budgetAmount: "", actualAmount: "" }));
    expect(insertWaarden()).toMatchObject({ budgetAmount: null, actualAmount: null });
  });

  it("leest het aankruisvakje 'betaald' via het hidden+checkbox-patroon", async () => {
    await createEventCost(null, fd({ ...geldig, paid: ["false", "true"] }));
    expect(insertWaarden().paid).toBe(true);

    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockInsertReturning.mockResolvedValue([{ id: 4, eventId: 4 }]);
    await createEventCost(null, fd({ ...geldig, paid: "false" }));
    expect(insertWaarden().paid).toBe(false);
  });

  it("geeft veldfouten terug zonder iets te bewaren", async () => {
    const res = await createEventCost(null, fd({ ...geldig, description: "" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.description?.[0]).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("logt de aanmaak en ververst de fiche", async () => {
    await createEventCost(null, fd(geldig));
    expect(mockLogAudit).toHaveBeenCalledWith("create_event_cost", "event_cost", 3, null, expect.anything());
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/evenementen/4");
  });
});

describe("updateEventCost", () => {
  it("weigert een ongeldig nummer", async () => {
    const res = await updateEventCost(null, fd({ ...geldig, id: "0" }));
    expect(res.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("bewaart de gewijzigde bedragen", async () => {
    const res = await updateEventCost(null, fd({ ...geldig, id: "3", actualAmount: "612" }));
    expect(res.success).toBe(true);
    expect(updateWaarden()).toMatchObject({ actualAmount: "612" });
  });

  it("meldt een lijn die niet meer bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const res = await updateEventCost(null, fd({ ...geldig, id: "3" }));
    expect(res.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteEventCost", () => {
  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await deleteEventCost(3);
    expect(res.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("verwijdert de lijn en logt dat", async () => {
    const res = await deleteEventCost(3);
    expect(res.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith("delete_event_cost", "event_cost", 3, expect.anything(), null);
  });
});
