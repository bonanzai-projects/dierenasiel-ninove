import { describe, it, expect, vi, beforeEach } from "vitest";
import fixtureRaw from "@/lib/animalshelter/__fixtures__/animals.json";

const {
  state,
  mockSelect, mockUpdate, mockUpdateSet, mockUpdateWhere,
  mockInsert, mockInsertValues, mockOnConflict,
  mockDelete, mockDeleteWhere,
  mockGetSession, mockRequirePermission, mockLogAudit, mockRevalidate, mockFetchAll,
} = vi.hoisted(() => {
  const state: { animals: unknown[]; links: unknown[]; decisions: unknown[] } = {
    animals: [], links: [], decisions: [],
  };

  const result = (rows: unknown[]) => {
    const self: Record<string, unknown> = {
      where: () => result(rows),
      limit: () => Promise.resolve(rows),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(rows).then(res, rej),
    };
    return self;
  };

  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

  const mockOnConflict = vi.fn().mockResolvedValue(undefined);
  const mockInsertValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflict }));
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  const mockSelect = vi.fn(() => ({
    from: (table: { __name: keyof typeof state }) => result(state[table.__name]),
  }));

  return {
    state,
    mockSelect, mockUpdate, mockUpdateSet, mockUpdateWhere,
    mockInsert, mockInsertValues, mockOnConflict,
    mockDelete, mockDeleteWhere,
    mockGetSession: vi.fn(),
    mockRequirePermission: vi.fn(),
    mockLogAudit: vi.fn(),
    mockRevalidate: vi.fn(),
    mockFetchAll: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, update: mockUpdate, insert: mockInsert, delete: mockDelete },
}));
vi.mock("@/lib/db/schema", () => ({
  animals: { __name: "animals", id: "animals.id" },
  animalShelterLinks: { __name: "links", externalId: "links.externalId", animalId: "links.animalId" },
  animalShelterFieldDecisions: {
    __name: "decisions", animalId: "decisions.animalId", fieldKey: "decisions.fieldKey",
  },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), inArray: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
vi.mock("@/lib/animalshelter/client", () => ({ fetchAllAnimals: mockFetchAll }));

import {
  applyAnimalShelterFields,
  clearAnimalShelterDecisions,
  ignoreAnimalShelterAnimal,
  ignoreAnimalShelterFields,
  linkAnimalShelterAnimal,
} from "./animalshelter";
import { animalShelterAnimalSchema } from "@/lib/animalshelter/types";
import { hashFieldValue } from "@/lib/animalshelter/diff";

const rocky = animalShelterAnimalSchema.parse(fixtureRaw[0]);
const ROCKY_ID = rocky.id;

/** Onze fiche voor Rocky: ras en naam wijken af, de rest loopt gelijk. */
const lokaleFiche = {
  id: 1,
  name: "Rocco",
  species: "hond",
  breed: "Husky",
  gender: "reu",
  dateOfBirth: "2020-12-01",
  identificationNr: "967000010354571",
  isNeutered: null,
  intakeDate: "2025-08-04",
  intakeReason: "afstand",
  dossierNr: "2502157",
  websiteDescription: rocky.beschrijving_nl,
  shortDescription: null,
  imageUrl: rocky.hoofdbeeld,
  images: rocky.extra_beelden.map((b) => b.image),
  isAvailableForAdoption: true,
  isOnWebsite: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  state.animals = [lokaleFiche];
  state.links = [];
  state.decisions = [];
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 3, role: "beheerder" });
  mockLogAudit.mockResolvedValue(undefined);
  mockFetchAll.mockResolvedValue([rocky]);
});

describe("applyAnimalShelterFields", () => {
  it("weigert zonder de juiste rechten", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await applyAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(result).toEqual({ success: false, error: "Onvoldoende rechten" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("schrijft de waarde van AnimalShelter weg, niet die van het formulier", async () => {
    const result = await applyAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(result).toMatchObject({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ breed: "Canis Vulgaris" }),
    );
  });

  it("neemt meerdere velden in één keer over", async () => {
    await applyAnimalShelterFields(ROCKY_ID, 1, ["breed", "name"]);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ breed: "Canis Vulgaris", name: "Rocky" }),
    );
  });

  it("slaat een veld over dat de server niet als overneembaar ziet", async () => {
    // `isNeutered` is niet overneembaar zolang de codes 0/1/2 niet bevestigd zijn.
    const result = await applyAnimalShelterFields(ROCKY_ID, 1, ["breed", "isNeutered"]);

    expect(result).toMatchObject({
      success: true,
      data: { overgenomen: ["breed"], overgeslagen: ["isNeutered"] },
    });
    expect((mockUpdateSet.mock.calls[0] as unknown[])?.[0]).not.toHaveProperty("isNeutered");
  });

  it("negeert een veldnaam die niet in de lijst staat", async () => {
    const result = await applyAnimalShelterFields(ROCKY_ID, 1, ["workflowPhase", "kennelId"]);

    expect(result).toMatchObject({ success: false });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("doet niets wanneer de velden intussen al gelijk zijn", async () => {
    state.animals = [{ ...lokaleFiche, breed: "Canis Vulgaris" }];

    const result = await applyAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(result).toMatchObject({ success: false, error: "Er viel niets over te nemen." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("legt de overname vast en logt ze", async () => {
    await applyAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ animalId: 1, fieldKey: "breed", decision: "overgenomen", decidedBy: 3 }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      "animalshelter_field_overgenomen",
      "animal",
      1,
      { veld: "breed", waarde: "Husky" },
      { veld: "breed", waarde: "Canis Vulgaris", externalId: ROCKY_ID },
    );
  });

  it("stopt netjes wanneer AnimalShelter onbereikbaar is", async () => {
    mockFetchAll.mockRejectedValue(new Error("HTTP 503"));

    const result = await applyAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(result).toMatchObject({ success: false });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("ignoreAnimalShelterFields", () => {
  it("bindt een gewone 'negeer' aan de huidige externe waarde", async () => {
    const result = await ignoreAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "negeer_waarde",
        remoteValueHash: hashFieldValue("Canis Vulgaris"),
      }),
    );
  });

  it("bewaart bij 'altijd negeren' geen waarde-hash", async () => {
    await ignoreAnimalShelterFields(ROCKY_ID, 1, ["breed"], true);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "negeer_altijd", remoteValueHash: null }),
    );
  });

  it("negeert niets wanneer de velden al gelijk zijn", async () => {
    state.animals = [{ ...lokaleFiche, breed: "Canis Vulgaris", name: "Rocky" }];

    const result = await ignoreAnimalShelterFields(ROCKY_ID, 1, ["breed"]);

    expect(result).toMatchObject({ success: false });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("laat ook een niet-overneembaar verschil dempen", async () => {
    const result = await ignoreAnimalShelterFields(ROCKY_ID, 1, ["isNeutered"]);
    expect(result).toMatchObject({ success: true, data: { genegeerd: ["isNeutered"] } });
  });
});

describe("clearAnimalShelterDecisions", () => {
  it("verwijdert de beslissing zodat het verschil weer bovendrijft", async () => {
    const result = await clearAnimalShelterDecisions(ROCKY_ID, 1, ["breed"]);

    expect(result).toMatchObject({ success: true, data: { hersteld: ["breed"] } });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(
      "animalshelter_beslissing_teruggedraaid", "animal", 1, null,
      { velden: ["breed"], externalId: ROCKY_ID },
    );
  });

  it("doet niets zonder velden", async () => {
    const result = await clearAnimalShelterDecisions(ROCKY_ID, 1, []);
    expect(result).toMatchObject({ success: false });
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe("linkAnimalShelterAnimal", () => {
  it("koppelt handmatig en onthoudt dat een mens dat besliste", async () => {
    const result = await linkAnimalShelterAnimal(ROCKY_ID, 1);

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: ROCKY_ID, animalId: 1, matchMethod: "handmatig", status: "gekoppeld",
      }),
    );
  });

  it("weigert een lokaal dier dat al aan een ander extern dier hangt", async () => {
    state.links = [{ externalId: 999, animalId: 1, status: "gekoppeld" }];

    const result = await linkAnimalShelterAnimal(ROCKY_ID, 1);

    expect(result).toMatchObject({ success: false });
    expect(result).toHaveProperty("error", expect.stringContaining("Rocco"));
  });

  it("maakt de koppeling los bij animalId null", async () => {
    const result = await linkAnimalShelterAnimal(ROCKY_ID, null);

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ animalId: null, status: "niet_gekoppeld" }),
    );
  });

  it("weigert een dier dat niet bij AnimalShelter staat", async () => {
    const result = await linkAnimalShelterAnimal(123456, 1);
    expect(result).toMatchObject({ success: false });
  });
});

describe("ignoreAnimalShelterAnimal", () => {
  it("zet een extern dier op genegeerd", async () => {
    const result = await ignoreAnimalShelterAnimal(ROCKY_ID, true);

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "genegeerd", animalId: null }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      "animalshelter_dier_genegeerd", "animalshelter_link", ROCKY_ID, null,
      { externalId: ROCKY_ID, naam: "Rocky" },
    );
  });

  it("haalt het negeren weer weg", async () => {
    await ignoreAnimalShelterAnimal(ROCKY_ID, false);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "niet_gekoppeld" }),
    );
  });
});
