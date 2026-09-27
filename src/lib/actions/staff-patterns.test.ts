import { describe, it, expect, vi, beforeEach } from "vitest";

// Story 14.8 — het vaste weekrooster. Sven: "ja dat herhaalt zich maar soms ook niet (verlof)".

const h = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockHasPermission: vi.fn(),
  mockLogAudit: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockInsertValues: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockDeleteWhere: vi.fn(),
  mockFindPerson: vi.fn(),
  mockRevalidate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: h.mockSelectLimit })) })),
    })),
    insert: vi.fn(() => ({ values: h.mockInsertValues })),
    update: vi.fn(() => ({ set: h.mockUpdateSet })),
    delete: vi.fn(() => ({ where: h.mockDeleteWhere })),
  },
}));
vi.mock("@/lib/db/schema", () => ({ staffPatterns: { id: "id", userId: "userId" } }));
vi.mock("@/lib/queries/staff-patterns", () => ({ findPatternPerson: h.mockFindPerson }));
vi.mock("@/lib/validations/animal-weights", () => ({ todayInBrussels: () => "2026-09-28" }));
vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: h.mockHasPermission }));
vi.mock("@/lib/audit", () => ({ logAudit: h.mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidate }));

import { createStaffPattern, stopStaffPattern } from "./staff-patterns";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const LEIDING = { userId: 20, role: "beheerder", name: "Sven" };
const MEDEWERKER = { userId: 21, role: "medewerker", name: "Katrien" };
const geldig = { weekday: "1", startTime: "08:00", endTime: "12:00", task: "Kuis honden", validFrom: "2026-09-28" };

const rij = (over: Record<string, unknown> = {}) => ({
  id: 3,
  userId: 21,
  weekday: 1,
  startTime: "08:00",
  endTime: "12:00",
  task: null,
  validFrom: "2026-09-01",
  validUntil: null,
  ...over,
});

/** Enkel lezen: staff:read, niet staff:write. */
function zonderSchrijfrecht() {
  h.mockHasPermission.mockImplementation((_role: string, perm: string) => perm === "staff:read");
}

beforeEach(() => {
  h.mockGetSession.mockReset().mockResolvedValue(MEDEWERKER);
  h.mockHasPermission.mockReset().mockReturnValue(true);
  h.mockLogAudit.mockReset().mockResolvedValue(undefined);
  h.mockSelectLimit.mockReset().mockResolvedValue([]);
  h.mockInsertValues.mockReset().mockResolvedValue(undefined);
  h.mockUpdateWhere.mockReset().mockResolvedValue(undefined);
  h.mockUpdateSet.mockReset().mockReturnValue({ where: h.mockUpdateWhere });
  h.mockDeleteWhere.mockReset().mockResolvedValue(undefined);
  h.mockFindPerson.mockReset().mockImplementation(async (id: number) =>
    id === 30 ? { userId: 30, name: "Els Wandel", group: "wandelaar" } : { userId: id, name: "Katrien", group: "team" },
  );
  h.mockRevalidate.mockReset();
});

describe("createStaffPattern", () => {
  it("zet een eigen vast moment", async () => {
    zonderSchrijfrecht();
    const res = await createStaffPattern(null, form(geldig));
    expect(res.success).toBe(true);
    expect(h.mockFindPerson).toHaveBeenCalledWith(21);
    expect(h.mockInsertValues).toHaveBeenCalledWith({
      userId: 21,
      weekday: 1,
      startTime: "08:00",
      endTime: "12:00",
      task: "Kuis honden",
      validFrom: "2026-09-28",
      validUntil: null,
      createdBy: 21,
    });
    expect(h.mockLogAudit).toHaveBeenCalledWith("staff_pattern.created", "staff_pattern", 21, null, expect.objectContaining({ weekday: 1 }));
    expect(h.mockRevalidate).toHaveBeenCalledWith("/beheerder/personeel");
  });

  it("bewaart een hele dag zonder uren en zonder taak", async () => {
    await createStaffPattern(null, form({ weekday: "7", validFrom: "2026-10-04" }));
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ weekday: 7, startTime: null, endTime: null, task: null }));
  });

  it("laat de leiding een vast moment zetten voor een wandelaar", async () => {
    h.mockGetSession.mockResolvedValue(LEIDING);
    const res = await createStaffPattern(null, form({ ...geldig, userId: "30" }));
    expect(res.success).toBe(true);
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 30, createdBy: 20 }));
    expect(res.success && res.message).toContain("Els Wandel");
  });

  it("weigert een vast moment voor iemand anders zonder schrijfrecht", async () => {
    zonderSchrijfrecht();
    const res = await createStaffPattern(null, form({ ...geldig, userId: "30" }));
    expect(res.success).toBe(false);
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });

  it("weigert wie geen actief account heeft (of geen kiesbare wandelaar is)", async () => {
    h.mockGetSession.mockResolvedValue(LEIDING);
    h.mockFindPerson.mockResolvedValue(null);
    const res = await createStaffPattern(null, form({ ...geldig, userId: "99" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.userId?.[0]).toMatch(/uit de lijst/);
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });

  it("controleert weekdag, uren en vanaf-datum, en geeft de ingevulde waarden terug", async () => {
    const res = await createStaffPattern(null, form({ weekday: "8", startTime: "12:00", endTime: "09:00", validFrom: "" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.fieldErrors?.weekday).toBeDefined();
      expect(res.fieldErrors?.endTime).toBeDefined();
      expect(res.fieldErrors?.validFrom).toBeDefined();
      expect(res.values).toMatchObject({ weekday: "8", startTime: "12:00" });
    }
  });

  it("weigert een vast moment dat botst met een bestaand van dezelfde persoon", async () => {
    h.mockSelectLimit.mockResolvedValue([rij()]);
    const res = await createStaffPattern(null, form({ ...geldig, startTime: "10:00", endTime: "13:00" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toContain("elke maandag · 08:00–12:00");
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });

  it("vraagt een login en leesrecht op het personeel", async () => {
    h.mockGetSession.mockResolvedValue(null);
    expect((await createStaffPattern(null, form(geldig))).success).toBe(false);
    h.mockGetSession.mockResolvedValue(MEDEWERKER);
    h.mockHasPermission.mockReturnValue(false);
    expect((await createStaffPattern(null, form(geldig))).success).toBe(false);
    expect(h.mockInsertValues).not.toHaveBeenCalled();
  });

  it("geeft een nette fout als bewaren mislukt", async () => {
    h.mockInsertValues.mockRejectedValue(new Error("Connection refused"));
    const res = await createStaffPattern(null, form(geldig));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/Er ging iets mis/);
  });
});

describe("stopStaffPattern", () => {
  it("laat een lopend vast moment tot en met vandaag lopen, zodat het verleden blijft", async () => {
    h.mockSelectLimit.mockResolvedValue([rij()]);
    const res = await stopStaffPattern(null, form({ id: "3" }));
    expect(res.success).toBe(true);
    expect(h.mockUpdateSet).toHaveBeenCalledWith({ validUntil: "2026-09-28" });
    expect(h.mockDeleteWhere).not.toHaveBeenCalled();
    expect(h.mockLogAudit).toHaveBeenCalledWith("staff_pattern.stopped", "staff_pattern", 3, expect.anything(), { validUntil: "2026-09-28" });
  });

  it("verwijdert een vast moment dat nog niet begonnen is", async () => {
    h.mockSelectLimit.mockResolvedValue([rij({ validFrom: "2026-10-05" })]);
    const res = await stopStaffPattern(null, form({ id: "3" }));
    expect(res.success).toBe(true);
    expect(h.mockDeleteWhere).toHaveBeenCalled();
    expect(h.mockUpdateSet).not.toHaveBeenCalled();
    expect(h.mockLogAudit).toHaveBeenCalledWith("staff_pattern.deleted", "staff_pattern", 3, expect.anything(), null);
  });

  it("doet niets met een vast moment dat al gestopt is", async () => {
    h.mockSelectLimit.mockResolvedValue([rij({ validUntil: "2026-09-20" })]);
    const res = await stopStaffPattern(null, form({ id: "3" }));
    expect(res.success).toBe(true);
    expect(h.mockUpdateSet).not.toHaveBeenCalled();
    expect(h.mockDeleteWhere).not.toHaveBeenCalled();
  });

  it("laat je enkel je eigen vaste momenten stoppen zonder schrijfrecht", async () => {
    zonderSchrijfrecht();
    h.mockSelectLimit.mockResolvedValue([rij({ userId: 30 })]);
    const res = await stopStaffPattern(null, form({ id: "3" }));
    expect(res.success).toBe(false);
    expect(h.mockUpdateSet).not.toHaveBeenCalled();
  });

  it("laat de leiding het vaste moment van iemand anders stoppen", async () => {
    h.mockGetSession.mockResolvedValue(LEIDING);
    h.mockSelectLimit.mockResolvedValue([rij({ userId: 30 })]);
    expect((await stopStaffPattern(null, form({ id: "3" }))).success).toBe(true);
    expect(h.mockUpdateSet).toHaveBeenCalled();
  });

  it("weigert een onbekend of ongeldig vast moment", async () => {
    expect((await stopStaffPattern(null, form({ id: "3" }))).success).toBe(false);
    expect((await stopStaffPattern(null, form({ id: "abc" }))).success).toBe(false);
  });
});
