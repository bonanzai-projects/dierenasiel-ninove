import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
  mockRequirePermission, mockGetSession, mockLogAudit, mockRevalidate,
} = vi.hoisted(() => {
  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  return {
    mockInsertReturning, mockInsertValues, mockInsert,
    mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
    mockRequirePermission: vi.fn(), mockGetSession: vi.fn(),
    mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: mockInsert, select: mockSelect } }));
vi.mock("@/lib/db/schema", () => ({
  events: Symbol("events"),
  eventTasks: Symbol("eventTasks"),
  eventCosts: Symbol("eventCosts"),
  eventShifts: Symbol("eventShifts"),
}));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { addStandardTasks, copyEventToNextEdition } from "./event-copy";

const EVENT = {
  id: 5, name: "Eetfestijn 2026", type: "eetfestijn", status: "afgelopen",
  date: "2026-11-14", endDate: "2026-11-15", startTime: "18:00", endTime: null,
  location: "Parochiezaal", responsible: "Sven", expectedVisitors: 300, description: null,
};

const TAAK = {
  phase: "voorbereiding", title: "Sponsors zoeken", date: "2026-06-01", time: null,
  responsible: "Sven", notes: null, sortOrder: 0,
};
const KOST = {
  kind: "kost", category: "drank", description: "Drank", budgetAmount: "400",
  actualAmount: "560", supplier: "De Ryck", sortOrder: 0,
};
const SHIFT = {
  date: "2026-11-14", startTime: "16:00", endTime: "20:00", post: "Bar",
  personName: "Katrien", notes: null, sortOrder: 0,
};

function fd(data: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) {
    for (const w of Array.isArray(v) ? v : [v]) f.append(k, w);
  }
  return f;
}

/** De waarden van de n-de insert. */
function ins(n: number): unknown {
  return (mockInsertValues.mock.calls[n] as unknown[])[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  // mockReset i.p.v. clear: `mockReturnValueOnce` zet een wachtrij die
  // `clearAllMocks` niet leegmaakt, en die dan naar de volgende test lekt.
  mockSelectWhere.mockReset();
  mockSelectLimit.mockReset();
  mockInsertValues.mockReset();

  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 20, role: "beheerder" });
  mockLogAudit.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: 99 }]);
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectLimit.mockResolvedValue([EVENT]);
});

describe("addStandardTasks", () => {
  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect((await addStandardTasks(5)).success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("zet de zes taken van Sven klaar bij een eetfestijn", async () => {
    // 1e select = evenement (met .limit), 2e select = bestaande taken (zonder .limit)
    mockSelectWhere.mockReturnValueOnce({ limit: mockSelectLimit }).mockResolvedValueOnce([]);
    const res = await addStandardTasks(5);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data?.toegevoegd).toBe(6);

    const taken = ins(0) as { title: string; eventId: number }[];
    expect(taken).toHaveLength(6);
    expect(taken[0]).toMatchObject({ eventId: 5, title: "Sponsors zoeken en aanspreken" });
    expect(taken.map((t) => t.title)).toContain("Traiteur afspreken");
  });

  it("laat de traiteur weg bij een ander soort evenement", async () => {
    mockSelectLimit.mockResolvedValue([{ ...EVENT, type: "kerstmarkt" }]);
    mockSelectWhere.mockReturnValueOnce({ limit: mockSelectLimit }).mockResolvedValueOnce([]);
    await addStandardTasks(5);
    const taken = ins(0) as { title: string }[];
    expect(taken.map((t) => t.title)).not.toContain("Traiteur afspreken");
  });

  it("weigert wanneer het draaiboek al taken bevat", async () => {
    mockSelectWhere.mockReturnValueOnce({ limit: mockSelectLimit }).mockResolvedValueOnce([{ id: 1 }]);
    const res = await addStandardTasks(5);
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("copyEventToNextEdition", () => {
  const basis = {
    eventId: "5",
    name: "Eetfestijn 2027",
    date: "2027-11-13",
    includeTasks: ["false", "true"],
    includeCosts: ["false", "true"],
    includeShifts: "false",
  };

  function stelBronIn() {
    // evenement (limit) -> taken -> kosten
    mockSelectWhere
      .mockReturnValueOnce({ limit: mockSelectLimit })
      .mockResolvedValueOnce([TAAK])
      .mockResolvedValueOnce([KOST])
      .mockResolvedValueOnce([SHIFT]);
  }

  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect((await copyEventToNextEdition(null, fd(basis))).success).toBe(false);
  });

  it("eist een naam en een datum", async () => {
    const res = await copyEventToNextEdition(null, fd({ ...basis, name: "", date: "" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.fieldErrors?.name?.[0]).toBeTruthy();
      expect(res.fieldErrors?.date?.[0]).toBeTruthy();
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("maakt het nieuwe evenement als concept, met verwijzing naar de vorige editie", async () => {
    stelBronIn();
    const res = await copyEventToNextEdition(null, fd(basis));
    expect(res.success).toBe(true);
    expect(ins(0)).toMatchObject({
      name: "Eetfestijn 2027",
      status: "concept",
      date: "2027-11-13",
      copiedFromEventId: 5,
      createdByUserId: 20,
    });
  });

  it("neemt de taken mee, met de datums opgeschoven en niet afgevinkt", async () => {
    stelBronIn();
    await copyEventToNextEdition(null, fd(basis));
    const taken = ins(1) as { date: string; done: boolean; eventId: number }[];
    expect(taken[0]).toMatchObject({ eventId: 99, date: "2027-05-31", done: false });
  });

  it("maakt van het werkelijke bedrag van vorig jaar de begroting", async () => {
    stelBronIn();
    await copyEventToNextEdition(null, fd(basis));
    const kosten = ins(2) as { budgetAmount: string; actualAmount: string | null }[];
    expect(kosten[0]).toMatchObject({ budgetAmount: "560", actualAmount: null });
  });

  it("laat de shiften weg wanneer je ze niet aanvinkt", async () => {
    stelBronIn();
    await copyEventToNextEdition(null, fd(basis));
    // 3 inserts: evenement, taken, kosten — geen shiften.
    expect(mockInsertValues).toHaveBeenCalledTimes(3);
  });

  it("logt wat er gekopieerd is", async () => {
    stelBronIn();
    await copyEventToNextEdition(null, fd(basis));
    expect(mockLogAudit).toHaveBeenCalledWith(
      "copy_event", "event", 99, null,
      expect.objectContaining({ bron: 5, taken: 1, kostenlijnen: 1, shiften: 0 }),
    );
  });

  it("meldt een bron die niet bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const res = await copyEventToNextEdition(null, fd(basis));
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
