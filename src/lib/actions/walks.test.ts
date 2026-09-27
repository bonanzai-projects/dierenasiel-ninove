import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockReturning, mockValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockSelectWhere, mockSelectFrom, mockSelect,
  mockSelectLimit, mockSelectOrderBy,
  mockGetSession, mockLogAudit, mockRevalidatePath,
  mockGetWalkingClubThreshold, mockGetWalkDays,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  const mockSelectOrderBy = vi.fn();
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: mockSelectOrderBy });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });
  const mockGetSession = vi.fn();
  const mockLogAudit = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockGetWalkingClubThreshold = vi.fn();
  const mockGetWalkDays = vi.fn();
  return {
    mockReturning, mockValues, mockInsert,
    mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
    mockSelectWhere, mockSelectFrom, mockSelect,
    mockSelectLimit, mockSelectOrderBy,
    mockGetSession, mockLogAudit, mockRevalidatePath,
    mockGetWalkingClubThreshold, mockGetWalkDays,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  walks: {
    id: Symbol("walks.id"),
    walkerId: Symbol("walks.walkerId"),
    status: Symbol("walks.status"),
  },
  walkers: {
    userId: Symbol("walkers.userId"),
    id: Symbol("walkers.id"),
    walkCount: Symbol("walkers.walkCount"),
    isWalkingClubMember: Symbol("walkers.isWalkingClubMember"),
  },
  animals: {
    id: Symbol("animals.id"),
    species: Symbol("animals.species"),
    isInShelter: Symbol("animals.isInShelter"),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mockGetSession,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/queries/shelter-settings", () => ({
  getWalkingClubThreshold: mockGetWalkingClubThreshold,
  getWalkDays: mockGetWalkDays,
}));

import { bookWalk, checkInWalk, checkOutWalk } from "./walks";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

const validFormFields = {
  animalId: "5",
  date: "2026-03-15",
  startTime: "10:00",
  remarks: "Graag rustige wandeling",
};

const mockWalker = {
  id: 1,
  userId: 99,
  firstName: "Jan",
  lastName: "Janssens",
  status: "approved",
  isApproved: true,
  // Story 10.77: heeft de huidige versie van het wandelreglement aanvaard.
  regulationsVersion: "2026-05-05",
};

const mockAnimal = {
  id: 5,
  name: "Rex",
  species: "hond",
  isInShelter: true,
};

const mockCreatedWalk = {
  id: 10,
  walkerId: 1,
  animalId: 5,
  date: "2026-03-15",
  startTime: "10:00",
  endTime: null,
  durationMinutes: null,
  remarks: "Graag rustige wandeling",
  status: "planned",
};

describe("bookWalk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 99, role: "wandelaar", email: "jan@example.com", name: "Jan" });
    mockLogAudit.mockResolvedValue(undefined);
    // Story 10.13: default — alle dagen toegestaan in tests, individuele tests
    // overschrijven dit waar nodig.
    mockGetWalkDays.mockResolvedValue([0, 1, 2, 3, 4, 5, 6]);

    // Default mock chain:
    // 1st select: walker lookup by userId
    // 2nd select: animal lookup by id
    let selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([mockWalker]);
      if (selectCallCount === 2) return Promise.resolve([mockAnimal]);
      return Promise.resolve([]);
    });

    mockReturning.mockResolvedValue([mockCreatedWalk]);
  });

  it("Story 10.77: weigert te boeken zolang de huidige versie van het reglement niet aanvaard is", async () => {
    mockSelectLimit.mockReset();
    mockSelectLimit.mockResolvedValueOnce([{ ...mockWalker, regulationsVersion: null }]);

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result).toEqual({ success: false, error: "Aanvaard eerst het wandelreglement." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("Story 10.13: weigert boeking als dag niet in walk_days", async () => {
    // 2026-03-15 = zondag (getDay=0); allowed = enkel maandag
    mockGetWalkDays.mockResolvedValue([1]);

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet mogelijk");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("Story 10.13: slaagt als dag in walk_days zit", async () => {
    // 2026-03-15 = zondag (getDay=0)
    mockGetWalkDays.mockResolvedValue([0, 3]);

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("ingelogd");
    }
  });

  it("returns error when user role is not wandelaar", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns error when walker is not approved", async () => {
    let selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([{ ...mockWalker, status: "pending", isApproved: false }]);
      return Promise.resolve([]);
    });

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("goedgekeurd");
    }
  });

  it("returns error when walker profile not found", async () => {
    let selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("profiel");
    }
  });

  it("returns fieldErrors on invalid input", async () => {
    const result = await bookWalk(null, makeFormData({ ...validFormFields, date: "bad-date" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.date).toBeDefined();
    }
  });

  it("returns error when animal is not a dog in shelter", async () => {
    let selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([mockWalker]);
      if (selectCallCount === 2) return Promise.resolve([{ ...mockAnimal, species: "kat" }]);
      return Promise.resolve([]);
    });

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("hond");
    }
  });

  it("returns error when animal not found", async () => {
    let selectCallCount = 0;
    mockSelectLimit.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([mockWalker]);
      if (selectCallCount === 2) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("niet gevonden");
    }
  });

  it("creates walk with status planned and null endTime", async () => {
    await bookWalk(null, makeFormData(validFormFields));

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        walkerId: 1,
        animalId: 5,
        date: "2026-03-15",
        startTime: "10:00",
        status: "planned",
        endTime: null,
        durationMinutes: null,
      }),
    );
  });

  it("logs audit after booking", async () => {
    await bookWalk(null, makeFormData(validFormFields));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "walk.booked",
      "walk",
      10,
      null,
      expect.objectContaining({ status: "planned" }),
    );
  });

  it("revalidates wandelaar path", async () => {
    await bookWalk(null, makeFormData(validFormFields));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/wandelaar");
  });

  it("returns success with walk data", async () => {
    const result = await bookWalk(null, makeFormData(validFormFields));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(10);
      expect(result.data.status).toBe("planned");
    }
  });
});

const mockPlannedWalk = {
  id: 10,
  walkerId: 1,
  animalId: 5,
  date: "2026-03-15",
  startTime: "10:00",
  endTime: null,
  durationMinutes: null,
  remarks: null,
  status: "planned",
};

describe("checkInWalk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 99, role: "wandelaar", email: "jan@example.com", name: "Jan" });
    mockLogAudit.mockResolvedValue(undefined);
    // Walk lookup
    mockSelectLimit.mockResolvedValue([mockPlannedWalk]);
    // Update returns checked-in walk
    mockUpdateReturning.mockResolvedValue([{ ...mockPlannedWalk, status: "in_progress", startTime: "10:30" }]);
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await checkInWalk(10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("ingelogd");
  });

  it("Story 10.77: weigert aan te melden zolang een oudere versie van het reglement aanvaard is", async () => {
    mockSelectLimit.mockReset();
    mockSelectLimit.mockResolvedValueOnce([{ ...mockWalker, regulationsVersion: "2025-01-01" }]);
    const result = await checkInWalk(10);
    expect(result).toEqual({ success: false, error: "Aanvaard eerst het wandelreglement." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when walk not found", async () => {
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const result = await checkInWalk(999);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet gevonden");
  });

  it("returns error when walk is not in planned status", async () => {
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([{ ...mockPlannedWalk, status: "completed" }]);
      return Promise.resolve([]);
    });
    const result = await checkInWalk(10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("ingecheckt");
  });

  it("returns error when walk belongs to different walker", async () => {
    mockSelectLimit.mockResolvedValue([{ ...mockPlannedWalk, walkerId: 999 }]);
    // Walker lookup returns walker with id 1, but walk belongs to walker 999
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([{ ...mockPlannedWalk, walkerId: 999 }]);
      return Promise.resolve([mockWalker]);
    });
    const result = await checkInWalk(10);
    expect(result.success).toBe(false);
  });

  it("updates walk to in_progress with current startTime", async () => {
    // Walker lookup then walk lookup
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([mockPlannedWalk]);
      return Promise.resolve([]);
    });

    await checkInWalk(10);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "in_progress",
      }),
    );
  });

  it("logs audit on check-in", async () => {
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([mockPlannedWalk]);
      return Promise.resolve([]);
    });

    await checkInWalk(10);

    expect(mockLogAudit).toHaveBeenCalledWith(
      "walk.checked_in",
      "walk",
      10,
      expect.objectContaining({ status: "planned" }),
      expect.objectContaining({ status: "in_progress" }),
    );
  });

  it("revalidates wandelaar path", async () => {
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([mockPlannedWalk]);
      return Promise.resolve([]);
    });

    await checkInWalk(10);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/wandelaar");
  });
});

const mockActiveWalk = {
  id: 10,
  walkerId: 1,
  animalId: 5,
  date: "2026-03-15",
  startTime: "10:00",
  endTime: null,
  durationMinutes: null,
  remarks: null,
  status: "in_progress",
};

describe("checkOutWalk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 99, role: "wandelaar", email: "jan@example.com", name: "Jan" });
    mockLogAudit.mockResolvedValue(undefined);
    mockGetWalkingClubThreshold.mockResolvedValue(10);
    // Default: walker lookup then walk lookup
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([{ ...mockWalker, walkCount: 0, isWalkingClubMember: false }]);
      if (callCount === 2) return Promise.resolve([mockActiveWalk]);
      return Promise.resolve([]);
    });
    mockUpdateReturning.mockResolvedValue([{ ...mockActiveWalk, status: "completed", endTime: "11:30", durationMinutes: 90 }]);
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await checkOutWalk(10, "Goed gedrag");
    expect(result.success).toBe(false);
  });

  it("returns error when walk not found", async () => {
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const result = await checkOutWalk(999, "");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet gevonden");
  });

  it("returns error when walk is not in_progress", async () => {
    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([mockWalker]);
      if (callCount === 2) return Promise.resolve([{ ...mockActiveWalk, status: "planned" }]);
      return Promise.resolve([]);
    });
    const result = await checkOutWalk(10, "");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("ingecheckt");
  });

  it("updates walk to completed with endTime and durationMinutes", async () => {
    await checkOutWalk(10, "Goed gedrag");

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        remarks: "Goed gedrag",
      }),
    );
  });

  it("increments walker walkCount", async () => {
    await checkOutWalk(10, "");

    // Second update call should be for walkCount increment
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("logs audit on check-out", async () => {
    await checkOutWalk(10, "Goed gedrag");

    expect(mockLogAudit).toHaveBeenCalledWith(
      "walk.checked_out",
      "walk",
      10,
      expect.objectContaining({ status: "in_progress" }),
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("revalidates paths", async () => {
    await checkOutWalk(10, "");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/wandelaar");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/wandelaars");
  });

  it("promotes walker to wandelclub when reaching threshold", async () => {
    // Walker has 9 walks, threshold is 10 → after checkout walkCount becomes 10
    const walkerNearThreshold = { ...mockWalker, walkCount: 9, isWalkingClubMember: false };
    mockGetWalkingClubThreshold.mockResolvedValue(10);

    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([walkerNearThreshold]);
      if (callCount === 2) return Promise.resolve([mockActiveWalk]);
      return Promise.resolve([]);
    });

    await checkOutWalk(10, "");

    // update #1: walk completed, #2: walkCount increment, #3: isWalkingClubMember
    expect(mockUpdate).toHaveBeenCalledTimes(3);
  });

  it("does not promote walker when below threshold", async () => {
    const walkerBelowThreshold = { ...mockWalker, walkCount: 5, isWalkingClubMember: false };
    mockGetWalkingClubThreshold.mockResolvedValue(10);

    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([walkerBelowThreshold]);
      if (callCount === 2) return Promise.resolve([mockActiveWalk]);
      return Promise.resolve([]);
    });

    await checkOutWalk(10, "");

    // Only update #1 (walk completed) and #2 (walkCount) — no #3
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("does not promote walker who is already a club member", async () => {
    const alreadyMember = { ...mockWalker, walkCount: 15, isWalkingClubMember: true };
    mockGetWalkingClubThreshold.mockResolvedValue(10);

    let callCount = 0;
    mockSelectLimit.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([alreadyMember]);
      if (callCount === 2) return Promise.resolve([mockActiveWalk]);
      return Promise.resolve([]);
    });

    await checkOutWalk(10, "");

    // Only update #1 and #2 — no promotion needed
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});
