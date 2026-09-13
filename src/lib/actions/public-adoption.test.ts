import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockReturning, mockValues, mockInsert, mockCheckBlacklist } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return { mockReturning, mockValues, mockInsert, mockCheckBlacklist: vi.fn() };
});

vi.mock("@/lib/db", () => ({ db: { insert: mockInsert, update: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ adoptionCandidates: { id: "adoption_candidates.id" } }));
vi.mock("@/lib/queries/blacklist", () => ({ checkBlacklistMatch: mockCheckBlacklist }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { submitPublicAdoptionRequest } from "./public-adoption";

const geldig = {
  species: "hond",
  requestedAnimalName: "Marie",
  firstName: "Jan",
  lastName: "Peeters",
  dateOfBirth: "1990-01-01",
  address: "Kerkstraat 1",
  postalCode: "9400 Ninove",
  phone: "0470123456",
  email: "jan@example.com",
  questionnaireAnswers: {},
};

function fd(data: unknown): FormData {
  const f = new FormData();
  f.append("json", JSON.stringify(data));
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReturning.mockResolvedValue([{ id: 1 }]);
  mockCheckBlacklist.mockResolvedValue(null);
});

// Story 10.69 — Sven: "adoptieaanvraag emailadres verplicht maken". Tot nu toe enkel bij kat,
// en de server bewaarde anders een nepadres.
describe("submitPublicAdoptionRequest — e-mailadres verplicht", () => {
  for (const species of ["hond", "kat", "andere"] as const) {
    it(`weigert een aanvraag zonder e-mailadres (${species})`, async () => {
      const res = await submitPublicAdoptionRequest(null, fd({ ...geldig, species, email: "" }));
      expect(res.success).toBe(false);
      if (!res.success) expect(res.fieldErrors?.email?.[0]).toBe("E-mailadres is verplicht");
      expect(mockInsert).not.toHaveBeenCalled();
    });
  }

  it("weigert ook enkel spaties of een ontbrekend veld", async () => {
    const zonderVeld: Record<string, unknown> = { ...geldig };
    delete zonderVeld.email;

    for (const data of [{ ...geldig, email: "   " }, zonderVeld]) {
      const res = await submitPublicAdoptionRequest(null, fd(data));
      expect(res.success).toBe(false);
      if (!res.success) expect(res.fieldErrors?.email?.[0]).toBe("E-mailadres is verplicht");
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("weigert een ongeldig e-mailadres", async () => {
    const res = await submitPublicAdoptionRequest(null, fd({ ...geldig, email: "jan@" }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.email).toContain("Ongeldig e-mailadres");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("bewaart het opgegeven adres — geen nepadres meer", async () => {
    const res = await submitPublicAdoptionRequest(null, fd({ ...geldig, email: " jan@example.com " }));
    expect(res.success).toBe(true);
    expect(mockValues.mock.calls[0][0].email).toBe("jan@example.com");
  });
});
