import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetSession,
  mockHasPermission,
  mockLogAudit,
  mockRevalidatePath,
  mockGetCampaignById,
  mockGetOccupiedCageNumbers,
  mockInsertValues,
  mockInsertReturning,
  mockInsert,
  mockUpdateWhere,
  mockUpdateSet,
  mockUpdate,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockHasPermission = vi.fn();
  const mockLogAudit = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockGetCampaignById = vi.fn();
  const mockGetOccupiedCageNumbers = vi.fn();

  // insert chain: db.insert().values().returning()
  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

  // update chain: db.update().set().where()
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  return {
    mockGetSession,
    mockHasPermission,
    mockLogAudit,
    mockRevalidatePath,
    mockGetCampaignById,
    mockGetOccupiedCageNumbers,
    mockInsertValues,
    mockInsertReturning,
    mockInsert,
    mockUpdateWhere,
    mockUpdateSet,
    mockUpdate,
  };
});

vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: mockHasPermission }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/queries/stray-cat-campaigns", () => ({
  getCampaignById: mockGetCampaignById,
  getOccupiedCageNumbers: mockGetOccupiedCageNumbers,
}));
vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, update: mockUpdate },
}));
vi.mock("@/lib/db/schema", () => ({
  strayCatCampaigns: Symbol("strayCatCampaigns"),
  strayCatCampaignInspections: Symbol("strayCatCampaignInspections"),
  strayCatCampaignInspectionCages: Symbol("strayCatCampaignInspectionCages"),
  strayCatCampaignMedicalInspections: Symbol("strayCatCampaignMedicalInspections"),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
}));

import {
  createCampaignAction,
  deployCagesAction,
  registerInspectionAction,
  completeCampaignAction,
  linkAnimalAction,
  addInspectionAction,
  setCampaignStatusAction,
} from "./stray-cat-campaigns";

// Default: logged in beheerder with permission
function setupAuth() {
  mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder" });
  mockHasPermission.mockReturnValue(true);
}

describe("createCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("creates a campaign with status open", async () => {
    mockInsertReturning.mockResolvedValue([{ id: 1 }]);

    const result = await createCampaignAction({
      requestDate: "2026-03-01",
      municipality: "Ninove",
      address: "Kerkstraat 1",
    });

    expect(result).toEqual({ success: true, data: { id: 1 } });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(
      "stray_cat_campaign.created",
      "stray_cat_campaign",
      1,
      null,
      expect.objectContaining({ municipality: "Ninove" }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren/zwerfkattenbeleid");
  });

  it("rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createCampaignAction({
      requestDate: "2026-03-01",
      municipality: "Ninove",
      address: "Kerkstraat 1",
    });

    expect(result).toEqual({ success: false, error: "Niet ingelogd" });
  });

  it("rejects user without permission", async () => {
    mockHasPermission.mockReturnValue(false);

    const result = await createCampaignAction({
      requestDate: "2026-03-01",
      municipality: "Ninove",
      address: "Kerkstraat 1",
    });

    expect(result).toEqual({ success: false, error: "Onvoldoende rechten" });
  });

  it("rejects invalid input", async () => {
    const result = await createCampaignAction({
      requestDate: "",
      municipality: "",
      address: "",
    });

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("deployCagesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    // Default: geen kooi bezet. Tests die uniekheid testen overschrijven dit.
    mockGetOccupiedCageNumbers.mockResolvedValue({});
  });

  it("slaat kooi-uitzetting op zonder status te wijzigen (manueel beheer)", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "open" });

    const result = await deployCagesAction({
      campaignId: 1,
      cageDeploymentDate: "2026-03-05",
      cageNumbers: "K1, K2",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdate).toHaveBeenCalled();
    const setArg = mockUpdateSet.mock.calls[0]?.[0];
    expect(setArg).toMatchObject({
      cageDeploymentDate: "2026-03-05",
      cageNumbers: "K1, K2",
    });
    // Status mag NIET automatisch gewijzigd worden — dat is nu een
    // expliciete keuze via setCampaignStatusAction.
    expect(setArg).not.toHaveProperty("status");
    expect(mockLogAudit).toHaveBeenCalled();
  });

  it("staat kooi-uitzetting toe ongeacht de huidige status", async () => {
    // Voorheen werd dit geweigerd — nu zijn alle secties altijd editable.
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "kooien_geplaatst" });

    const result = await deployCagesAction({
      campaignId: 1,
      cageDeploymentDate: "2026-03-05",
      cageNumbers: "K1",
    });

    expect(result).toEqual({ success: true, data: undefined });
  });

  it("rejects if campaign not found", async () => {
    mockGetCampaignById.mockResolvedValue(null);

    const result = await deployCagesAction({
      campaignId: 999,
      cageDeploymentDate: "2026-03-05",
      cageNumbers: "K1",
    });

    expect(result).toEqual({ success: false, error: "Campagne niet gevonden" });
  });

  it("Story 10.7: rejects als een kooi al in gebruik is in andere lopende campagne", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 5, status: "open" });
    mockGetOccupiedCageNumbers.mockResolvedValue({ K2: 3 });

    const result = await deployCagesAction({
      campaignId: 5,
      cageDeploymentDate: "2026-03-05",
      cageNumbers: "K1,K2,K3",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("K2");
      expect(result.error).toContain("#3");
    }
    // DB-update mag NIET gebeuren bij conflict
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("Story 10.7: slaagt wanneer geen enkele geselecteerde kooi bezet is", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 5, status: "open" });
    mockGetOccupiedCageNumbers.mockResolvedValue({ K7: 2 });

    const result = await deployCagesAction({
      campaignId: 5,
      cageDeploymentDate: "2026-03-05",
      cageNumbers: "K1,K2",
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("registerInspectionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("slaat inspectie op zonder status te wijzigen (manueel beheer)", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "kooien_geplaatst" });

    const result = await registerInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-03-10",
      catDescription: "Cyperse kater",
      vetName: "Dr. Nadia",
    });

    expect(result).toEqual({ success: true, data: undefined });
    const setArg = mockUpdateSet.mock.calls[0]?.[0];
    expect(setArg).toMatchObject({
      inspectionDate: "2026-03-10",
      catDescription: "Cyperse kater",
      vetName: "Dr. Nadia",
    });
    expect(setArg).not.toHaveProperty("status");
  });

  it("staat inspectie-update toe ongeacht de huidige status", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "open" });

    const result = await registerInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-03-10",
      catDescription: "Kat",
      vetName: "Dr. Nadia",
    });

    expect(result).toEqual({ success: true, data: undefined });
  });
});

describe("completeCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("slaat medische resultaten op zonder status te wijzigen (manueel beheer)", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "in_behandeling" });

    const result = await completeCampaignAction({
      campaignId: 1,
      fivStatus: "negatief",
      felvStatus: "negatief",
      outcome: "gecastreerd_uitgezet",
    });

    expect(result).toEqual({ success: true, data: undefined });
    const setArg = mockUpdateSet.mock.calls[0]?.[0];
    expect(setArg).toMatchObject({
      fivStatus: "negatief",
      felvStatus: "negatief",
      outcome: "gecastreerd_uitgezet",
    });
    expect(setArg).not.toHaveProperty("status");
  });

  it("staat completion-update toe ongeacht de huidige status", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "kooien_geplaatst" });

    const result = await completeCampaignAction({
      campaignId: 1,
      fivStatus: "negatief",
      felvStatus: "negatief",
      outcome: "gecastreerd_uitgezet",
    });

    expect(result).toEqual({ success: true, data: undefined });
  });

  it("rejects invalid fivStatus", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "in_behandeling" });

    const result = await completeCampaignAction({
      campaignId: 1,
      fivStatus: "onbekend" as never,
      felvStatus: "negatief",
      outcome: "gecastreerd_uitgezet",
    });

    expect(result.success).toBe(false);
  });
});

describe("setCampaignStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("zet de status naar de gekozen waarde", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "open" });

    const result = await setCampaignStatusAction(1, "afgerond");

    expect(result).toEqual({ success: true, data: undefined });
    const setArg = mockUpdateSet.mock.calls[0]?.[0];
    expect(setArg).toEqual({ status: "afgerond" });
    expect(mockLogAudit).toHaveBeenCalledWith(
      "stray_cat_campaign.status_changed",
      "stray_cat_campaign",
      1,
      { status: "open" },
      { status: "afgerond" },
    );
  });

  it("doet niks als status al gelijk is", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "open" });

    const result = await setCampaignStatusAction(1, "open");

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("weigert ongeldige status", async () => {
    const result = await setCampaignStatusAction(1, "ongeldig");

    expect(result).toEqual({ success: false, error: "Ongeldige status" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("weigert ongeldig campagne-ID", async () => {
    const result = await setCampaignStatusAction(0, "open");

    expect(result).toEqual({ success: false, error: "Ongeldig campagne-ID" });
  });

  it("weigert wanneer campagne niet bestaat", async () => {
    mockGetCampaignById.mockResolvedValue(null);

    const result = await setCampaignStatusAction(99, "afgerond");

    expect(result).toEqual({ success: false, error: "Campagne niet gevonden" });
  });
});

describe("linkAnimalAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("links an animal to a campaign", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "afgerond", outcome: "geadopteerd" });

    const result = await linkAnimalAction({ campaignId: 1, linkedAnimalId: 42 });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ linkedAnimalId: 42 }),
    );
    expect(mockLogAudit).toHaveBeenCalled();
  });

  it("rejects if campaign outcome is not geadopteerd", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "afgerond", outcome: "gecastreerd_uitgezet" });

    const result = await linkAnimalAction({ campaignId: 1, linkedAnimalId: 42 });

    expect(result).toEqual({ success: false, error: "Alleen campagnes met uitkomst 'geadopteerd' kunnen aan een dier gekoppeld worden" });
  });

  it("rejects invalid animalId", async () => {
    const result = await linkAnimalAction({ campaignId: 1, linkedAnimalId: 0 });

    expect(result.success).toBe(false);
  });
});

describe("addInspectionAction (Story 10.9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("slaat een succesvolle inspectie-log op en logt audit", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "kooien_geplaatst" });
    mockInsertReturning.mockResolvedValue([{
      id: 99, campaignId: 1, inspectionDate: "2026-04-21", wasSuccessful: true, notes: null,
    }]);

    const result = await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      wasSuccessful: true,
      notes: "",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 1,
        inspectionDate: "2026-04-21",
        wasSuccessful: true,
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      "stray_cat_campaign.inspection_log_added",
      "stray_cat_campaign",
      1,
      null,
      expect.objectContaining({ inspectionId: 99, wasSuccessful: true }),
    );
  });

  it("slaat een lege inspectie-log op met notes", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 2, status: "kooien_geplaatst" });
    mockInsertReturning.mockResolvedValue([{
      id: 100, campaignId: 2, inspectionDate: "2026-04-22", wasSuccessful: false, notes: "Niets in kooien",
    }]);

    const result = await addInspectionAction({
      campaignId: 2,
      inspectionDate: "2026-04-22",
      wasSuccessful: false,
      notes: "Niets in kooien",
    });

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ wasSuccessful: false, notes: "Niets in kooien" }),
    );
  });

  it("weigert wanneer campagne niet bestaat", async () => {
    mockGetCampaignById.mockResolvedValue(null);

    const result = await addInspectionAction({
      campaignId: 999,
      inspectionDate: "2026-04-21",
      wasSuccessful: false,
    });

    expect(result).toEqual({ success: false, error: "Campagne niet gevonden" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("weigert ongeldige datum", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, status: "kooien_geplaatst" });

    const result = await addInspectionAction({
      campaignId: 1,
      inspectionDate: "niet-een-datum",
      wasSuccessful: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ongeldige invoer");
  });
});

describe("addInspectionAction — vangst per kooi en invuller (Story 10.60)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockInsertReturning.mockResolvedValue([
      { id: 99, campaignId: 1, inspectionDate: "2026-04-21", wasSuccessful: true, notes: null },
    ]);
  });

  it("leidt 'er was vangst' af uit de aangevinkte kooien", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, cageNumbers: "K1,K7,K12" });

    await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      wasSuccessful: false, // het losse vinkje staat uit
      caughtCages: ["K7"],
      notes: "",
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ wasSuccessful: true }),
    );
  });

  it("bewaart één rij per uitgezette kooi, met vangst waar aangevinkt", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, cageNumbers: "K1,K7" });

    await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      caughtCages: ["K7"],
      notes: "",
    });

    expect(mockInsertValues).toHaveBeenCalledWith([
      { inspectionId: 99, cageCode: "K1", caught: false },
      { inspectionId: 99, cageCode: "K7", caught: true },
    ]);
  });

  it("negeert een kooi die niet bij deze campagne hoort", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, cageNumbers: "K1" });

    await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      caughtCages: ["K9"],
      notes: "",
    });

    expect(mockInsertValues).toHaveBeenCalledWith([
      { inspectionId: 99, cageCode: "K1", caught: false },
    ]);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ wasSuccessful: false }),
    );
  });

  it("valt terug op het losse vinkje wanneer de campagne nog geen kooien heeft", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, cageNumbers: null });

    await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      wasSuccessful: true,
      caughtCages: [],
      notes: "",
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ wasSuccessful: true }),
    );
    // geen kooirijen om te bewaren
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });

  it("bewaart wie de ronde registreerde", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, cageNumbers: "K1" });

    await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      caughtCages: [],
      notes: "",
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ recordedBy: 1 }),
    );
  });

  it("zet de kooien met vangst in het logboek", async () => {
    mockGetCampaignById.mockResolvedValue({ id: 1, cageNumbers: "K1,K7" });

    await addInspectionAction({
      campaignId: 1,
      inspectionDate: "2026-04-21",
      caughtCages: ["K7"],
      notes: "",
    });

    expect(mockLogAudit).toHaveBeenCalledWith(
      "stray_cat_campaign.inspection_log_added",
      "stray_cat_campaign",
      1,
      null,
      expect.objectContaining({ caughtCages: ["K7"] }),
    );
  });
});
