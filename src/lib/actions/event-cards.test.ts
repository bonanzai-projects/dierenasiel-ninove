import { describe, it, expect, vi, beforeEach } from "vitest";

// Story 13.15 — genummerde steunkaarten. Sven (12 sep 2026): nummers per verkoper, € 5,
// onverkochte nummers bij terugkomst, en de app mag trekken "enkel uit nummers die verkocht werden".

const h = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockGetSession: vi.fn(),
  mockLogAudit: vi.fn(),
  mockRevalidate: vi.fn(),
  mockInsertValues: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockDeleteWhere: vi.fn(),
  mockSeries: vi.fn(),
  mockDraws: vi.fn(),
  mockSeriesById: vi.fn(),
  mockDrawById: vi.fn(),
  mockRevenueLine: vi.fn(),
  mockRandomInt: vi.fn(),
  mockBatch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: h.mockInsertValues })),
    update: vi.fn(() => ({ set: h.mockUpdateSet })),
    delete: vi.fn(() => ({ where: h.mockDeleteWhere })),
    batch: h.mockBatch,
  },
}));
vi.mock("@/lib/db/schema", () => ({
  eventCardSeries: { id: "id" },
  eventCardDraws: { id: "id" },
  eventCosts: { id: "id" },
}));
vi.mock("@/lib/queries/event-cards", () => ({
  getEventCardSeries: h.mockSeries,
  getEventCardDraws: h.mockDraws,
  getCardSeriesById: h.mockSeriesById,
  getCardDrawById: h.mockDrawById,
  getCardRevenueLine: h.mockRevenueLine,
}));
vi.mock("node:crypto", () => ({ randomInt: h.mockRandomInt }));
vi.mock("@/lib/permissions", () => ({ requirePermission: h.mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: h.mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidate }));

import {
  createCardSeries,
  settleCardSeries,
  reopenCardSeries,
  deleteCardSeries,
  addCardDraw,
  drawCardByApp,
  deleteCardDraw,
} from "./event-cards";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const reeks = (over: Record<string, unknown> = {}) => ({
  id: 3,
  eventId: 4,
  seller: "Martine",
  numberFrom: 1,
  numberTo: 50,
  price: "5.00",
  unsoldNumbers: [] as number[],
  settledAt: null as Date | null,
  ...over,
});
const AFGEREKEND = new Date("2026-10-01T10:00:00Z");
const GEWEIGERD = { success: false as const, error: "Onvoldoende rechten" };

beforeEach(() => {
  h.mockRequirePermission.mockReset().mockResolvedValue(undefined);
  h.mockGetSession.mockReset().mockResolvedValue({ userId: 20, role: "beheerder", name: "Sven" });
  h.mockLogAudit.mockReset().mockResolvedValue(undefined);
  h.mockRevalidate.mockReset();
  h.mockInsertValues.mockReset().mockResolvedValue(undefined);
  h.mockUpdateWhere.mockReset().mockResolvedValue(undefined);
  h.mockUpdateSet.mockReset().mockReturnValue({ where: h.mockUpdateWhere });
  h.mockDeleteWhere.mockReset().mockResolvedValue(undefined);
  h.mockSeries.mockReset().mockResolvedValue([]);
  h.mockDraws.mockReset().mockResolvedValue([]);
  h.mockSeriesById.mockReset().mockResolvedValue(reeks());
  h.mockDrawById.mockReset().mockResolvedValue(null);
  h.mockRevenueLine.mockReset().mockResolvedValue(null);
  h.mockRandomInt.mockReset().mockReturnValue(0);
  h.mockBatch.mockReset().mockImplementation(async (opdrachten: unknown[]) => Promise.all(opdrachten));
});

describe("createCardSeries", () => {
  it("geeft een reeks nummers mee aan een verkoper, standaard aan € 5", async () => {
    const res = await createCardSeries(null, form({ eventId: "4", seller: " Martine ", numberFrom: "1", numberTo: "50" }));
    expect(res.success).toBe(true);
    expect(h.mockInsertValues).toHaveBeenCalledWith({
      eventId: 4,
      seller: "Martine",
      numberFrom: 1,
      numberTo: 50,
      price: "5",
      createdByUserId: 20,
    });
    expect(h.mockLogAudit).toHaveBeenCalledWith("event_card_series.created", "event", 4, null, expect.objectContaining({ seller: "Martine" }));
    expect(h.mockRevalidate).toHaveBeenCalledWith("/beheerder/evenementen/4");
  });

  it("neemt een andere prijs over", async () => {
    await createCardSeries(null, form({ eventId: "4", seller: "Jan", numberFrom: "51", numberTo: "75", price: "2,50" }));
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ price: "2.5" }));
  });

  it("weigert een reeks die overlapt met die van een andere verkoper", async () => {
    h.mockSeries.mockResolvedValue([reeks()]);
    const res = await createCardSeries(null, form({ eventId: "4", seller: "Jan", numberFrom: "40", numberTo: "60" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toContain("Martine (1–50)");
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });

  it("controleert verkoper, nummers en prijs, en geeft de waarden terug", async () => {
    const res = await createCardSeries(null, form({ eventId: "4", seller: "", numberFrom: "50", numberTo: "1", price: "abc" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.fieldErrors?.seller).toBeDefined();
      expect(res.fieldErrors?.numberTo).toBeDefined();
      expect(res.fieldErrors?.price).toBeDefined();
      expect(res.values).toMatchObject({ numberFrom: "50", price: "abc" });
    }
  });

  it("vraagt schrijfrecht op evenementen", async () => {
    h.mockRequirePermission.mockResolvedValue(GEWEIGERD);
    const res = await createCardSeries(null, form({ eventId: "4", seller: "Jan", numberFrom: "1", numberTo: "5" }));
    expect(h.mockRequirePermission).toHaveBeenCalledWith("event:write");
    expect(res.success).toBe(false);
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });
});

describe("settleCardSeries", () => {
  it("rekent af met de onverkochte nummers en zet de opbrengst bij kosten & opbrengsten", async () => {
    h.mockSeries.mockResolvedValue([reeks({ unsoldNumbers: [3, 4, 5], settledAt: AFGEREKEND })]);
    const res = await settleCardSeries(null, form({ id: "3", unsold: "3, 4-5" }));
    expect(res.success).toBe(true);
    expect(h.mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ unsoldNumbers: [3, 4, 5], settledAt: expect.any(Date), settledByUserId: 20 }),
    );
    // Geen opbrengstlijn → er komt er een bij: 47 × € 5.
    expect(h.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 4,
        kind: "opbrengst",
        category: "tombola",
        description: "Steunkaarten",
        actualAmount: "235.00",
        source: "steunkaarten",
      }),
    );
    expect(res.success && res.message).toContain("47 van 50");
  });

  it("schrijft de reeks en de opbrengstlijn samen, in een batch", async () => {
    h.mockSeries.mockResolvedValue([reeks()]);
    await settleCardSeries(null, form({ id: "3", unsold: "1-10" }));
    expect(h.mockBatch).toHaveBeenCalledTimes(1);
    expect(h.mockBatch.mock.calls[0][0]).toHaveLength(2);
    // Berekend uit de reeks na het afrekenen: 40 x 5 euro, ook al gaf de databank de oude toestand.
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ actualAmount: "200.00" }));
  });

  it("werkt een bestaande opbrengstlijn bij in plaats van een tweede te maken", async () => {
    h.mockSeries.mockResolvedValue([reeks({ settledAt: AFGEREKEND })]);
    h.mockRevenueLine.mockResolvedValue({ id: 88, actualAmount: "100.00" });
    await settleCardSeries(null, form({ id: "3", unsold: "" }));
    expect(h.mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ actualAmount: "250.00" }));
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });

  it("weigert onverkochte nummers buiten de reeks of die al getrokken werden", async () => {
    h.mockDraws.mockResolvedValue([{ id: 1, number: 7, prize: null, drawnByApp: false }]);
    const res = await settleCardSeries(null, form({ id: "3", unsold: "7, 60" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain("60 hoort niet bij deze reeks");
      expect(res.error).toContain("Nummer 7 werd al getrokken");
    }
    expect(h.mockUpdateSet).not.toHaveBeenCalled();
  });

  it("weigert een onleesbare lijst", async () => {
    const res = await settleCardSeries(null, form({ id: "3", unsold: "3, drie" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toContain('Geen nummer: "drie"');
  });

  it("weigert een onbekende reeks", async () => {
    h.mockSeriesById.mockResolvedValue(null);
    expect((await settleCardSeries(null, form({ id: "9", unsold: "" }))).success).toBe(false);
  });
});

describe("reopenCardSeries", () => {
  it("zet de reeks terug op uitgedeeld en werkt de opbrengst bij", async () => {
    h.mockSeriesById.mockResolvedValue(reeks({ settledAt: AFGEREKEND, unsoldNumbers: [3] }));
    h.mockRevenueLine.mockResolvedValue({ id: 88, actualAmount: "245.00" });
    h.mockSeries.mockResolvedValue([reeks()]);
    const res = await reopenCardSeries(null, form({ id: "3" }));
    expect(res.success).toBe(true);
    expect(h.mockUpdateSet).toHaveBeenCalledWith({ settledAt: null, settledByUserId: null, unsoldNumbers: [] });
    // Niets meer afgerekend → het werkelijke bedrag valt leeg.
    expect(h.mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ actualAmount: null }));
  });
});

describe("deleteCardSeries", () => {
  it("verwijdert een reeks en werkt de opbrengst bij", async () => {
    const res = await deleteCardSeries(null, form({ id: "3" }));
    expect(res.success).toBe(true);
    expect(h.mockDeleteWhere).toHaveBeenCalled();
    expect(h.mockLogAudit).toHaveBeenCalledWith("event_card_series.deleted", "event", 4, expect.anything(), null);
  });

  it("weigert zolang er een winnend nummer uit de reeks komt", async () => {
    h.mockDraws.mockResolvedValue([{ id: 1, number: 7, prize: "Fles wijn", drawnByApp: false }]);
    const res = await deleteCardSeries(null, form({ id: "3" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toContain("7");
    expect(h.mockDeleteWhere).not.toHaveBeenCalled();
  });
});

describe("addCardDraw", () => {
  it("bewaart een zelf getrokken winnend nummer met zijn prijs", async () => {
    h.mockSeries.mockResolvedValue([reeks({ settledAt: AFGEREKEND })]);
    const res = await addCardDraw(null, form({ eventId: "4", number: "12", prize: "Fles wijn" }));
    expect(res.success).toBe(true);
    expect(h.mockInsertValues).toHaveBeenCalledWith({
      eventId: 4,
      number: 12,
      prize: "Fles wijn",
      drawnByApp: false,
      createdByUserId: 20,
    });
  });

  it("weigert een nummer dat onverkocht terugkwam", async () => {
    h.mockSeries.mockResolvedValue([reeks({ settledAt: AFGEREKEND, unsoldNumbers: [12] })]);
    const res = await addCardDraw(null, form({ eventId: "4", number: "12", prize: "" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.number?.[0]).toBe("Nummer 12 kwam onverkocht terug");
  });
});

describe("drawCardByApp", () => {
  it("trekt willekeurig uit de verkochte nummers", async () => {
    h.mockSeries.mockResolvedValue([reeks({ numberFrom: 1, numberTo: 5, settledAt: AFGEREKEND, unsoldNumbers: [2] })]);
    h.mockDraws.mockResolvedValue([{ id: 1, number: 4, prize: null, drawnByApp: false }]);
    h.mockRandomInt.mockReturnValue(1); // [1, 3, 5] → 3
    const res = await drawCardByApp(null, form({ eventId: "4", prize: "Hoofdprijs" }));
    expect(h.mockRandomInt).toHaveBeenCalledWith(3);
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ number: 3, prize: "Hoofdprijs", drawnByApp: true }));
    expect(res.success && res.message).toContain("nummer 3");
    expect(res.success && res.message).toContain("Martine");
  });

  it("legt uit waarom er (nog) niets te trekken valt", async () => {
    h.mockSeries.mockResolvedValue([reeks()]); // niet afgerekend
    const res = await drawCardByApp(null, form({ eventId: "4", prize: "" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/afgerekend/);
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });
});

describe("deleteCardDraw", () => {
  it("haalt een winnend nummer weg", async () => {
    h.mockDrawById.mockResolvedValue({ id: 1, eventId: 4, number: 7, prize: null, drawnByApp: true });
    const res = await deleteCardDraw(null, form({ id: "1" }));
    expect(res.success).toBe(true);
    expect(h.mockDeleteWhere).toHaveBeenCalled();
  });

  it("weigert een onbekend nummer", async () => {
    expect((await deleteCardDraw(null, form({ id: "1" }))).success).toBe(false);
  });
});
