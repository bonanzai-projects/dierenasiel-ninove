import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSelect, mockSelectFrom, mockSelectLimit,
  mockInsert, mockInsertValues, mockInsertReturning,
  mockDelete, mockDeleteWhere, mockExecute,
  mockRequirePermission, mockGetSession, mockLogAudit, mockRevalidate,
  rijenPerTabel, bewaardeRij,
} = vi.hoisted(() => {
  const state = { rijenPerTabel: [] as unknown[], bewaardeRij: [] as unknown[] };

  const mockSelectLimit = vi.fn(() => Promise.resolve(state.bewaardeRij));
  const mockSelectFrom = vi.fn(() => {
    const p = Promise.resolve(state.rijenPerTabel) as Promise<unknown[]> & {
      where?: unknown;
      orderBy?: unknown;
    };
    p.where = () => ({ limit: mockSelectLimit });
    p.orderBy = () => Promise.resolve(state.bewaardeRij);
    return p;
  });
  const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

  const mockInsertReturning = vi.fn(() => Promise.resolve([{ id: 99 }]));
  const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

  const mockDeleteWhere = vi.fn(() => Promise.resolve(undefined));
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    mockSelect, mockSelectFrom, mockSelectLimit,
    mockInsert, mockInsertValues, mockInsertReturning,
    mockDelete, mockDeleteWhere,
    mockExecute: vi.fn(() => Promise.resolve(undefined)),
    mockRequirePermission: vi.fn(), mockGetSession: vi.fn(),
    mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
    rijenPerTabel: (rijen: unknown[]) => { state.rijenPerTabel = rijen; },
    bewaardeRij: (rijen: unknown[]) => { state.bewaardeRij = rijen; },
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    execute: mockExecute,
  },
}));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { createBackup, restoreBackup, deleteBackup } from "./database-backup";
import { buildSnapshot } from "@/lib/backup/snapshot";

const GEEN_TOEGANG = { success: false as const, error: "Geen toegang" };

/** De waarden van de n-de insert-oproep. */
function insertWaarden(n: number): Record<string, unknown> {
  return (mockInsertValues.mock.calls as unknown as Record<string, unknown>[][])[n][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 20, name: "Sven", role: "beheerder" });
  mockLogAudit.mockResolvedValue(undefined);
  rijenPerTabel([]);
  bewaardeRij([]);
});

describe("createBackup", () => {
  it("weigert wie geen instellingen mag wijzigen", async () => {
    mockRequirePermission.mockResolvedValue(GEEN_TOEGANG);

    const result = await createBackup("");

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart de rijen van elke tabel als één momentopname", async () => {
    rijenPerTabel([{ id: 1, name: "Foxy" }]);

    const result = await createBackup("Voor de import");

    expect(result.success).toBe(true);
    const bewaard = insertWaarden(0);
    expect(bewaard.label).toBe("Voor de import");
    expect(bewaard.createdByUserId).toBe(20);
    expect(bewaard.createdByName).toBe("Sven");
    expect(bewaard.rowCount).toBeGreaterThan(0);

    const snapshot = JSON.parse(bewaard.content as string);
    expect(snapshot.version).toBe(1);
    expect(snapshot.tables.animals).toEqual([{ id: 1, name: "Foxy" }]);
    // Het logboek hoort er niet in.
    expect(snapshot.tables.audit_logs).toBeUndefined();
  });

  it("geeft een naam met datum en uur wanneer je er zelf geen kiest", async () => {
    await createBackup("   ");
    const bewaard = insertWaarden(0);
    expect(bewaard.label).toMatch(/^Bewaard op \d{2}\/\d{2}\/\d{4} om \d{2}:\d{2}$/);
  });

  it("schrijft het bewaren in het logboek", async () => {
    await createBackup("Test");
    expect(mockLogAudit).toHaveBeenCalledWith(
      "create_backup",
      "database_backup",
      99,
      null,
      expect.objectContaining({ label: "Test" }),
    );
  });
});

describe("restoreBackup", () => {
  const geldigeInhoud = JSON.stringify(
    buildSnapshot("2026-07-30T19:00:00.000Z", { kennels: [{ id: 1, code: "H1" }] }),
  );

  it("weigert wie geen instellingen mag wijzigen", async () => {
    mockRequirePermission.mockResolvedValue(GEEN_TOEGANG);

    const result = await restoreBackup(1);

    expect(result.success).toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("meldt het wanneer de bewaring niet bestaat", async () => {
    bewaardeRij([]);

    const result = await restoreBackup(404);

    expect(result.success).toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("wist niets wanneer de momentopname beschadigd is", async () => {
    bewaardeRij([{ id: 1, label: "Kapot", content: "{geen json", createdAt: new Date() }]);

    const result = await restoreBackup(1);

    expect(result.success).toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("maakt eerst een veiligheidskopie en zet dan pas terug", async () => {
    bewaardeRij([{ id: 1, label: "Voor de import", content: geldigeInhoud, createdAt: new Date() }]);

    const result = await restoreBackup(1);

    expect(result.success).toBe(true);
    const veiligheidskopie = insertWaarden(0);
    expect(veiligheidskopie.isAutomatic).toBe(true);
    expect(veiligheidskopie.label).toMatch(/vóór het terugzetten/i);
    // De veiligheidskopie staat er vóór de eerste TRUNCATE.
    expect(mockInsertValues.mock.invocationCallOrder[0]).toBeLessThan(
      mockExecute.mock.invocationCallOrder[0],
    );
  });

  it("schrijft het terugzetten in het logboek en vernieuwt de pagina's", async () => {
    bewaardeRij([{ id: 1, label: "Voor de import", content: geldigeInhoud, createdAt: new Date() }]);

    await restoreBackup(1);

    expect(mockLogAudit).toHaveBeenCalledWith(
      "restore_backup",
      "database_backup",
      1,
      null,
      expect.objectContaining({ label: "Voor de import" }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith("/");
  });
});

describe("deleteBackup", () => {
  it("weigert wie geen instellingen mag wijzigen", async () => {
    mockRequirePermission.mockResolvedValue(GEEN_TOEGANG);

    const result = await deleteBackup(1);

    expect(result.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("verwijdert de bewaring en logt het", async () => {
    bewaardeRij([{ id: 5, label: "Oud", createdAt: new Date() }]);

    const result = await deleteBackup(5);

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(
      "delete_backup",
      "database_backup",
      5,
      expect.objectContaining({ label: "Oud" }),
      null,
    );
  });
});
