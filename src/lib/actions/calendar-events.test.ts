import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockDeleteWhere, mockDelete,
  mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
  mockGetSession, mockLogAudit, mockRevalidate,
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
    mockGetSession: vi.fn(), mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, update: mockUpdate, delete: mockDelete, select: mockSelect },
}));
vi.mock("@/lib/db/schema", () => ({ calendarEvents: Symbol("calendarEvents") }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "./calendar-events";

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const validCreate = { title: "Stage Lien", category: "stage", date: "2026-09-12" };

describe("createCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1 });
    mockLogAudit.mockResolvedValue(undefined);
    mockInsertReturning.mockResolvedValue([{ id: 5, ...validCreate }]);
  });

  it("weigert wanneer niemand is ingelogd", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await createCalendarEvent(null, fd(validCreate));
    expect(res.success).toBe(false);
  });

  it("valideert verplichte velden", async () => {
    const res = await createCalendarEvent(null, fd({ ...validCreate, title: "" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.title).toBeDefined();
  });

  it("slaat een geldig item op met de aangemelde gebruiker", async () => {
    const res = await createCalendarEvent(null, fd({ ...validCreate, startTime: "18:00", animalId: "3" }));
    expect(res.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Stage Lien",
        category: "stage",
        date: "2026-09-12",
        startTime: "18:00",
        animalId: 3,
        createdByUserId: 1,
      }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/kalender");
  });
});

describe("updateCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1 });
    mockLogAudit.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([{ id: 5, title: "Oud" }]);
    mockUpdateReturning.mockResolvedValue([{ id: 5, title: "Nieuw" }]);
  });

  it("werkt een bestaand item bij", async () => {
    const res = await updateCalendarEvent(null, fd({ id: "5", ...validCreate, title: "Nieuw" }));
    expect(res.success).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ title: "Nieuw" }));
  });

  it("faalt wanneer het item niet bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const res = await updateCalendarEvent(null, fd({ id: "99", ...validCreate }));
    expect(res.success).toBe(false);
  });
});

describe("deleteCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1 });
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("verwijdert een bestaand item", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 5, title: "Weg" }]);
    const res = await deleteCalendarEvent(5);
    expect(res.success).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/kalender");
  });

  it("faalt wanneer het item niet bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const res = await deleteCalendarEvent(99);
    expect(res.success).toBe(false);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });
});
