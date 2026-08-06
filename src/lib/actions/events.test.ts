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
vi.mock("@/lib/db/schema", () => ({ events: Symbol("events") }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { createEvent, updateEvent, deleteEvent } from "./events";

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const geldig = {
  name: "Eetkermis 2026",
  type: "eetfestijn",
  status: "gepland",
  date: "2026-09-12",
};

beforeEach(() => {
  vi.clearAllMocks();
  // requirePermission geeft undefined terug wanneer alles in orde is.
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 7, role: "beheerder" });
  mockLogAudit.mockResolvedValue(undefined);
});

describe("createEvent", () => {
  beforeEach(() => {
    mockInsertReturning.mockResolvedValue([{ id: 3, ...geldig }]);
  });

  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await createEvent(null, fd(geldig));
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("valideert verplichte velden", async () => {
    const res = await createEvent(null, fd({ ...geldig, name: "" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.name).toBeDefined();
  });

  it("slaat een geldig evenement op met de aangemelde gebruiker", async () => {
    const res = await createEvent(
      null,
      fd({ ...geldig, location: "Parochiezaal", responsible: "Sven", expectedVisitors: "250" }),
    );
    expect(res.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Eetkermis 2026",
        type: "eetfestijn",
        status: "gepland",
        date: "2026-09-12",
        location: "Parochiezaal",
        responsible: "Sven",
        expectedVisitors: 250,
        createdByUserId: 7,
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith("create_event", "event", 3, null, expect.anything());
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/evenementen");
  });

  it("bewaart lege optionele velden als null, niet als lege tekst", async () => {
    await createEvent(null, fd({ ...geldig, location: "", responsible: "", expectedVisitors: "" }));
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ location: null, responsible: null, expectedVisitors: null }),
    );
  });

  it("geeft de ingevulde waarden terug bij een validatiefout", async () => {
    const res = await createEvent(null, fd({ ...geldig, name: "", location: "Parochiezaal" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.values?.location).toBe("Parochiezaal");
  });
});

describe("updateEvent", () => {
  beforeEach(() => {
    mockSelectLimit.mockResolvedValue([{ id: 3, name: "Oud" }]);
    mockUpdateReturning.mockResolvedValue([{ id: 3, name: "Eetkermis 2026" }]);
  });

  it("werkt een bestaand evenement bij", async () => {
    const res = await updateEvent(null, fd({ id: "3", ...geldig }));
    expect(res.success).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ name: "Eetkermis 2026" }));
    expect(mockLogAudit).toHaveBeenCalledWith("update_event", "event", 3, expect.anything(), expect.anything());
  });

  it("faalt wanneer het evenement niet bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const res = await updateEvent(null, fd({ id: "99", ...geldig }));
    expect(res.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await updateEvent(null, fd({ id: "3", ...geldig }));
    expect(res.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteEvent", () => {
  it("verwijdert een bestaand evenement", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 3, name: "Weg" }]);
    const res = await deleteEvent(3);
    expect(res.success).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith("delete_event", "event", 3, expect.anything(), null);
  });

  it("faalt wanneer het evenement niet bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const res = await deleteEvent(99);
    expect(res.success).toBe(false);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });

  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await deleteEvent(3);
    expect(res.success).toBe(false);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });
});
