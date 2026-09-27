import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  return {
    mockReturning, mockValues, mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockSelectLimit, mockSelectWhere,
    mockInsert: vi.fn().mockReturnValue({ values: mockValues }),
    mockUpdate: vi.fn().mockReturnValue({ set: mockUpdateSet }),
    mockSelect: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockSelectWhere }) }),
    mockRequirePermission: vi.fn(), mockLogAudit: vi.fn(), mockRevalidatePath: vi.fn(), mockGetSession: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: h.mockInsert, update: h.mockUpdate, select: h.mockSelect } }));
vi.mock("@/lib/db/schema", () => ({
  walkers: { id: "walkers.id", email: "walkers.email", userId: "walkers.userId" },
  users: { id: "users.id", email: "users.email" },
}));
vi.mock("@/lib/auth/password", () => ({ hashPassword: vi.fn().mockResolvedValue("hash") }));
vi.mock("@/lib/permissions", () => ({ requirePermission: h.mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: h.mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));

import { submitWalkerRegistration, createWalkerManual, acceptWalkRegulations } from "./walkers";

// Story 10.77 — het wandelreglement digitaal aanvaarden, met datum en versie als bewijs (Sven, keuze Johan).

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const inschrijving = {
  firstName: "Jan", lastName: "Janssens", email: "jan@example.com", phone: "0471234567",
  dateOfBirth: "2000-01-15", address: "Kerkstraat 1, 9400 Ninove", allergies: "",
  childrenWalkAlong: "false", regulationsRead: "true", photoUrl: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.mockSelectLimit.mockReset();
  h.mockRequirePermission.mockResolvedValue(undefined);
  h.mockReturning.mockResolvedValue([{ id: 42 }]);
  h.mockUpdateReturning.mockResolvedValue([{ id: 42, barcode: "WLK-42" }]);
});

describe("submitWalkerRegistration", () => {
  it("bewaart wanneer en welke versie van het reglement aanvaard werd", async () => {
    h.mockSelectWhere.mockResolvedValueOnce([]); // geen dubbel e-mailadres
    const r = await submitWalkerRegistration(null, fd(inschrijving));
    expect(r.success).toBe(true);
    expect(h.mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        regulationsRead: true,
        regulationsAcceptedAt: expect.any(Date),
        regulationsVersion: "2026-05-05",
      }),
    );
  });
});

describe("createWalkerManual (medewerker schrijft in)", () => {
  const manueel = {
    firstName: "An", lastName: "Peeters", email: "an@example.com", phone: "0470000000",
    dateOfBirth: "1990-02-03", address: "Dorp 2, 9400 Ninove",
  };

  it("vraagt geen vinkje meer: de wandelaar aanvaardt zelf in de app", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([]); // geen dubbel e-mailadres
    const r = await createWalkerManual(null, fd(manueel));
    expect(r.success).toBe(true);
    expect(h.mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ regulationsRead: false, regulationsAcceptedAt: null, regulationsVersion: null }),
    );
  });

  it("laat een medewerker niet aanvaarden in naam van de wandelaar", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([]);
    await createWalkerManual(null, fd({ ...manueel, regulationsRead: "true" }));
    expect(h.mockValues).toHaveBeenCalledWith(expect.objectContaining({ regulationsRead: false, regulationsVersion: null }));
  });
});

describe("acceptWalkRegulations (wandelaar in de app)", () => {
  it("bewaart de aanvaarding van de huidige versie en logt ze", async () => {
    h.mockGetSession.mockResolvedValue({ userId: 7, role: "wandelaar", email: "jan@example.com", name: "Jan" });
    h.mockSelectLimit.mockResolvedValueOnce([{ id: 42, userId: 7, regulationsVersion: null }]);

    const r = await acceptWalkRegulations();

    expect(h.mockUpdateSet).toHaveBeenCalledWith({
      regulationsRead: true,
      regulationsAcceptedAt: expect.any(Date),
      regulationsVersion: "2026-05-05",
    });
    expect(h.mockLogAudit).toHaveBeenCalledWith(
      "walker.regulations_accepted", "walker", 42, { version: null }, { version: "2026-05-05" },
    );
    expect(h.mockRevalidatePath).toHaveBeenCalledWith("/wandelaar");
    expect(r).toEqual({ success: true, data: undefined });
  });

  it("weigert zonder login of voor wie geen wandelaar is", async () => {
    h.mockGetSession.mockResolvedValue(null);
    expect(await acceptWalkRegulations()).toEqual({ success: false, error: "Je bent niet ingelogd." });
    h.mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "x", name: "x" });
    expect(await acceptWalkRegulations()).toEqual({ success: false, error: "Enkel een wandelaar kan het wandelreglement aanvaarden." });
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });

  it("meldt een ontbrekend wandelaarsprofiel", async () => {
    h.mockGetSession.mockResolvedValue({ userId: 7, role: "wandelaar", email: "x", name: "x" });
    h.mockSelectLimit.mockResolvedValueOnce([]);
    expect(await acceptWalkRegulations()).toEqual({ success: false, error: "Wandelaar profiel niet gevonden." });
  });
});
