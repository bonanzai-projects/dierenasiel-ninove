import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetSession,
  mockHasPermission,
  mockLogAudit,
  mockSelectLimit,
  mockInsertValues,
  mockDeleteWhere,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockHasPermission: vi.fn(),
  mockLogAudit: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockInsertValues: vi.fn(),
  mockDeleteWhere: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockSelectLimit })) })),
    })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  staffAttendance: { id: "id", date: "date", userId: "userId" },
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: mockHasPermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addPersonToDay, removeAttendance, signUpForDay } from "./staff-attendance";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  mockGetSession.mockReset().mockResolvedValue({ userId: 7, role: "medewerker", name: "Nathalie" });
  mockHasPermission.mockReset().mockReturnValue(false);
  mockLogAudit.mockReset().mockResolvedValue(undefined);
  mockSelectLimit.mockReset().mockResolvedValue([]);
  mockInsertValues.mockReset().mockResolvedValue(undefined);
  mockDeleteWhere.mockReset().mockResolvedValue(undefined);
});

describe("signUpForDay", () => {
  it("schrijft de ingelogde gebruiker in, zonder schrijfrecht", async () => {
    const result = await signUpForDay(null, form({ date: "2026-08-16", note: "" }));

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-08-16", userId: 7, createdBy: 7 }),
    );
  });

  it("bewaart een toelichting", async () => {
    await signUpForDay(null, form({ date: "2026-08-16", note: "enkel voormiddag" }));

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ note: "enkel voormiddag" }),
    );
  });

  it("doet niets wanneer je al ingeschreven staat", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 3 }]);

    const result = await signUpForDay(null, form({ date: "2026-08-16" }));

    expect(result.success).toBe(true);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("weigert wie niet ingelogd is", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await signUpForDay(null, form({ date: "2026-08-16" }));

    expect(result.success).toBe(false);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("weigert een onzinnige datum", async () => {
    const result = await signUpForDay(null, form({ date: "16 augustus" }));

    expect(result.success).toBe(false);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe("addPersonToDay", () => {
  it("weigert iemand zonder schrijfrecht", async () => {
    const result = await addPersonToDay(null, form({ date: "2026-08-16", guestName: "Tante Marie" }));

    expect(result.success).toBe(false);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("schrijft een vrijwilliger zonder login in", async () => {
    mockHasPermission.mockReturnValue(true);

    const result = await addPersonToDay(null, form({ date: "2026-08-16", guestName: "Tante Marie" }));

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, guestName: "Tante Marie", createdBy: 7 }),
    );
  });

  it("weigert een lege naam en geeft de invoer terug", async () => {
    mockHasPermission.mockReturnValue(true);

    const result = await addPersonToDay(null, form({ date: "2026-08-16", guestName: "  " }));

    expect(result.success).toBe(false);
    expect(result.success === false && result.values?.date).toBe("2026-08-16");
  });
});

describe("removeAttendance", () => {
  it("laat je je eigen inschrijving weghalen", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 5, userId: 7, date: "2026-08-16" }]);

    const result = await removeAttendance(null, form({ id: "5" }));

    expect(result.success).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("belet dat je die van iemand anders weghaalt", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 5, userId: 8, date: "2026-08-16" }]);

    const result = await removeAttendance(null, form({ id: "5" }));

    expect(result.success).toBe(false);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });

  it("laat de leiding elke inschrijving weghalen", async () => {
    mockHasPermission.mockReturnValue(true);
    mockSelectLimit.mockResolvedValue([{ id: 5, userId: 8, date: "2026-08-16" }]);

    const result = await removeAttendance(null, form({ id: "5" }));

    expect(result.success).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("laat een gast enkel door de leiding weghalen", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 5, userId: null, date: "2026-08-16" }]);

    const result = await removeAttendance(null, form({ id: "5" }));

    expect(result.success).toBe(false);
  });

  it("weigert een onbekende inschrijving", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await removeAttendance(null, form({ id: "99" }));

    expect(result.success).toBe(false);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });
});
