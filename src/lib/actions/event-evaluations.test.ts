import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertReturning, mockInsertValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
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

  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  return {
    mockInsertReturning, mockInsertValues, mockInsert,
    mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
    mockSelectLimit, mockSelectWhere, mockSelectFrom, mockSelect,
    mockRequirePermission: vi.fn(), mockGetSession: vi.fn(),
    mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, update: mockUpdate, select: mockSelect },
}));
vi.mock("@/lib/db/schema", () => ({ eventEvaluations: { id: "id", eventId: "eventId" } }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { saveEventEvaluation } from "./event-evaluations";

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

function insertWaarden(): Record<string, unknown> {
  return (mockInsertValues.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
}
function updateWaarden(): Record<string, unknown> {
  return (mockUpdateSet.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
}

const geldig = {
  eventId: "12",
  visitors: "280",
  ticketsUsed: "310",
  paidPlates: "289",
  wentWell: "De frituur draaide vlot",
  couldBeBetter: "Te weinig volk aan de afwas",
  agreements: "Volgend jaar 2 extra helpers na 20u",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 20, role: "beheerder" });
  mockLogAudit.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: 1, eventId: 12 }]);
  mockUpdateReturning.mockResolvedValue([{ id: 1, eventId: 12 }]);
  mockSelectLimit.mockResolvedValue([]);
});

describe("saveEventEvaluation", () => {
  it("weigert zonder schrijfrecht", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await saveEventEvaluation(null, fd(geldig));
    expect(res.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("maakt een evaluatie aan wanneer er nog geen is", async () => {
    const res = await saveEventEvaluation(null, fd(geldig));
    expect(res.success).toBe(true);
    expect(insertWaarden()).toMatchObject({
      eventId: 12,
      visitors: 280,
      ticketsUsed: 310,
      paidPlates: 289,
      wentWell: "De frituur draaide vlot",
      updatedByUserId: 20,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("werkt de bestaande evaluatie bij in plaats van een tweede aan te maken", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 1, eventId: 12, visitors: 100 }]);
    const res = await saveEventEvaluation(null, fd({ ...geldig, visitors: "300" }));
    expect(res.success).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(updateWaarden()).toMatchObject({ visitors: 300 });
  });

  it("bewaart lege velden als leeg, niet als nul", async () => {
    await saveEventEvaluation(
      null,
      fd({ eventId: "12", visitors: "", ticketsUsed: "", paidPlates: "", wentWell: "", couldBeBetter: "", agreements: "" }),
    );
    expect(insertWaarden()).toMatchObject({
      visitors: null,
      ticketsUsed: null,
      paidPlates: null,
      wentWell: null,
    });
  });

  it("weigert een negatief aantal", async () => {
    const res = await saveEventEvaluation(null, fd({ ...geldig, visitors: "-3" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.visitors?.[0]).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("logt en ververst de fiche", async () => {
    await saveEventEvaluation(null, fd(geldig));
    expect(mockLogAudit).toHaveBeenCalledWith(
      "create_event_evaluation", "event_evaluation", 1, null, expect.anything(),
    );
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/evenementen/12");
  });
});
