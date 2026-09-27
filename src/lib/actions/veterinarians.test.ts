import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  return {
    mockInsertReturning, mockInsertValues, mockUpdateReturning, mockUpdateSet, mockDeleteWhere, mockSelectLimit,
    mockInsert: vi.fn().mockReturnValue({ values: mockInsertValues }),
    mockUpdate: vi.fn().mockReturnValue({ set: mockUpdateSet }),
    mockDelete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
    mockSelect: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockSelectWhere }) }),
    mockRequirePermission: vi.fn(), mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: h.mockInsert, update: h.mockUpdate, delete: h.mockDelete, select: h.mockSelect } }));
vi.mock("@/lib/db/schema", () => ({ veterinarians: { id: "veterinarians.id", name: "veterinarians.name" } }));
vi.mock("@/lib/permissions", () => ({ requirePermission: h.mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: h.mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidate }));

import { createVeterinarian, updateVeterinarian, deleteVeterinarian } from "./veterinarians";

// Story 10.81 — de dierenartsenlijst beheren (medical:write).

function fd(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
}

const fiche = { name: "Dr. Ine Wouters", practice: "Dierenkliniek De Dender", phone: "054 12 34 56", email: "ine@dedender.be" };
const rij = { id: 3, ...fiche, street: null, houseNumber: null, postalCode: null, city: null, mobile: null, orderNumber: null, notes: null };

beforeEach(() => {
  vi.clearAllMocks();
  h.mockSelectLimit.mockReset();
  h.mockRequirePermission.mockResolvedValue(undefined);
  h.mockInsertReturning.mockResolvedValue([rij]);
  h.mockUpdateReturning.mockResolvedValue([rij]);
});

describe("createVeterinarian", () => {
  it("bewaart een nieuwe fiche", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([]); // naam nog vrij
    const r = await createVeterinarian(null, fd(fiche));
    expect(h.mockRequirePermission).toHaveBeenCalledWith("medical:write");
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ name: "Dr. Ine Wouters", practice: "Dierenkliniek De Dender", mobile: null }));
    expect(h.mockLogAudit).toHaveBeenCalledWith("create_veterinarian", "veterinarian", 3, null, rij);
    expect(h.mockRevalidate).toHaveBeenCalledWith("/beheerder/medisch", "layout");
    expect(r).toEqual({ success: true, data: rij });
  });

  it("weigert een naam die al in de lijst staat", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([{ id: 9 }]);
    const r = await createVeterinarian(null, fd(fiche));
    expect(r).toMatchObject({ success: false, fieldErrors: { name: ["Er bestaat al een dierenarts met die naam"] } });
    expect(h.mockInsert).not.toHaveBeenCalled();
  });

  it("geeft veldfouten terug met de ingevulde waarden", async () => {
    const r = await createVeterinarian(null, fd({ ...fiche, name: "", email: "fout" }));
    expect(r).toMatchObject({ success: false, values: expect.objectContaining({ email: "fout" }) });
    expect(h.mockInsert).not.toHaveBeenCalled();
  });

  it("weigert zonder medical:write", async () => {
    h.mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect(await createVeterinarian(null, fd(fiche))).toEqual({ success: false, error: "Onvoldoende rechten" });
  });
});

describe("updateVeterinarian", () => {
  it("werkt een fiche bij", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([rij]); // bestaande fiche
    const r = await updateVeterinarian(null, fd({ id: "3", ...fiche, mobile: "0470 12 34 56" }));
    expect(h.mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ mobile: "0470 12 34 56", updatedAt: expect.any(Date) }));
    expect(h.mockLogAudit).toHaveBeenCalledWith("update_veterinarian", "veterinarian", 3, rij, rij);
    expect(r.success).toBe(true);
  });

  it("weigert een nieuwe naam die een andere fiche al draagt", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([rij]).mockResolvedValueOnce([{ id: 4 }]);
    const r = await updateVeterinarian(null, fd({ id: "3", ...fiche, name: "Dr. Peeters" }));
    expect(r).toMatchObject({ success: false, fieldErrors: { name: ["Er bestaat al een dierenarts met die naam"] } });
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });

  it("laat enkel andere hoofdletters toe zonder te botsen", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([rij]);
    const r = await updateVeterinarian(null, fd({ id: "3", ...fiche, name: "DR. INE WOUTERS" }));
    expect(r.success).toBe(true);
    expect(h.mockSelectLimit).toHaveBeenCalledTimes(1);
  });

  it("meldt een onbekende fiche", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([]);
    expect(await updateVeterinarian(null, fd({ id: "99", ...fiche }))).toMatchObject({ success: false, error: "Dierenarts niet gevonden" });
  });
});

describe("deleteVeterinarian", () => {
  it("verwijdert een fiche; de rapporten houden de naam", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([rij]);
    const r = await deleteVeterinarian(3);
    expect(h.mockDelete).toHaveBeenCalled();
    expect(h.mockLogAudit).toHaveBeenCalledWith("delete_veterinarian", "veterinarian", 3, rij, null);
    expect(r).toEqual({ success: true, data: { id: 3 } });
  });

  it("meldt een onbekende fiche", async () => {
    h.mockSelectLimit.mockResolvedValueOnce([]);
    expect(await deleteVeterinarian(99)).toEqual({ success: false, error: "Dierenarts niet gevonden" });
  });
});
