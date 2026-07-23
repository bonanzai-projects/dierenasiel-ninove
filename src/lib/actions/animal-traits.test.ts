import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOnConflict, mockValues, mockInsert,
  mockRequirePermission, mockLogAudit, mockRevalidatePath,
  mockGetSession, mockGetAnimalById, mockGetAnimalTraits,
} = vi.hoisted(() => {
  const mockOnConflict = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return {
    mockOnConflict, mockValues, mockInsert,
    mockRequirePermission: vi.fn(),
    mockLogAudit: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockGetSession: vi.fn(),
    mockGetAnimalById: vi.fn(),
    mockGetAnimalTraits: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: mockInsert } }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/db/schema", () => ({
  animalTraits: { animalId: Symbol("animal_traits.animal_id") },
}));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/queries/animals", () => ({ getAnimalById: mockGetAnimalById }));
vi.mock("@/lib/queries/animal-traits", () => ({ getAnimalTraits: mockGetAnimalTraits }));

import { saveAnimalTraits } from "./animal-traits";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) fd.append(key, value);
  return fd;
}

const validFormData = {
  animalId: "1",
  trait_zindelijk: "ja",
  trait_katten: "nee",
};

describe("saveAnimalTraits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetAnimalById.mockResolvedValue({ id: 1, name: "Kamiel" });
    mockGetAnimalTraits.mockResolvedValue({});
    mockGetSession.mockResolvedValue({ userId: 7 });
    mockOnConflict.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflict });
  });

  it("vereist animal:write", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Geen rechten" });

    const result = await saveAnimalTraits(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart de ingevulde eigenschappen", async () => {
    const result = await saveAnimalTraits(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        animalId: 1,
        traits: { zindelijk: "ja", katten: "nee" },
        updatedBy: 7,
      }),
    );
  });

  it("bewaart 'niet gekend' niet — een ontbrekende key betekent hetzelfde", async () => {
    await saveAnimalTraits(
      null,
      makeFormData({ ...validFormData, trait_tuin_nodig: "niet_gekend" }),
    );

    const values = mockValues.mock.calls[0][0] as { traits: Record<string, string> };
    expect(values.traits).not.toHaveProperty("tuin_nodig");
    expect(values.traits).toEqual({ zindelijk: "ja", katten: "nee" });
  });

  it("upsert op animalId zodat opnieuw opslaan werkt", async () => {
    await saveAnimalTraits(null, makeFormData(validFormData));

    expect(mockOnConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ traits: { zindelijk: "ja", katten: "nee" } }),
      }),
    );
  });

  it("weigert een onbekende waarde", async () => {
    const result = await saveAnimalTraits(
      null,
      makeFormData({ animalId: "1", trait_katten: "misschien" }),
    );

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("negeert formuliervelden die geen bekende eigenschap zijn", async () => {
    await saveAnimalTraits(
      null,
      makeFormData({ ...validFormData, trait_verzonnen: "ja", zomaar: "ja" }),
    );

    const values = mockValues.mock.calls[0][0] as { traits: Record<string, string> };
    expect(values.traits).toEqual({ zindelijk: "ja", katten: "nee" });
  });

  it("geeft een fout wanneer het dier niet bestaat", async () => {
    mockGetAnimalById.mockResolvedValue(null);

    const result = await saveAnimalTraits(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("logt een audit met oude en nieuwe waarden", async () => {
    mockGetAnimalTraits.mockResolvedValue({ zindelijk: "nee" });

    await saveAnimalTraits(null, makeFormData(validFormData));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "update_animal_traits",
      "animal",
      1,
      { traits: { zindelijk: "nee" } },
      { traits: { zindelijk: "ja", katten: "nee" } },
    );
  });

  it("revalideert de dierdetailpagina", async () => {
    await saveAnimalTraits(null, makeFormData(validFormData));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren/1");
  });

  it("geeft een nette fout bij een databasefout", async () => {
    mockOnConflict.mockRejectedValue(new Error("Connection refused"));

    const result = await saveAnimalTraits(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });
});
