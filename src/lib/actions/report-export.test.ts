import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSession, mockGetAnimalReport, mockGetMedicationReport, mockGetAdoptionContractsReport, mockGetWebsitePublicationReport, mockGetWalkActivityReport, mockGetWalkerAnimalPairingsReport, mockGetWorkflowOverviewReport, mockGetCampaignReport } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockGetAnimalReport = vi.fn();
  const mockGetMedicationReport = vi.fn();
  const mockGetAdoptionContractsReport = vi.fn();
  const mockGetWebsitePublicationReport = vi.fn();
  const mockGetWalkActivityReport = vi.fn();
  const mockGetWalkerAnimalPairingsReport = vi.fn();
  const mockGetWorkflowOverviewReport = vi.fn();
  const mockGetCampaignReport = vi.fn();
  return { mockGetSession, mockGetAnimalReport, mockGetMedicationReport, mockGetAdoptionContractsReport, mockGetWebsitePublicationReport, mockGetWalkActivityReport, mockGetWalkerAnimalPairingsReport, mockGetWorkflowOverviewReport, mockGetCampaignReport };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: mockGetSession,
}));

vi.mock("@/lib/queries/reports", () => ({
  getAnimalReport: mockGetAnimalReport,
  getMedicationReport: mockGetMedicationReport,
  getAdoptionContractsReport: mockGetAdoptionContractsReport,
  getWebsitePublicationReport: mockGetWebsitePublicationReport,
  getWalkActivityReport: mockGetWalkActivityReport,
  getWalkerAnimalPairingsReport: mockGetWalkerAnimalPairingsReport,
  getWorkflowOverviewReport: mockGetWorkflowOverviewReport,
}));

vi.mock("@/lib/queries/stray-cat-campaigns", () => ({
  getCampaignReport: mockGetCampaignReport,
}));

import { exportAnimalReportCsv, exportMedicationReportCsv, exportAdoptionContractsCsv, exportWebsitePublicationCsv, exportWalkActivityCsv, exportWalkerAnimalPairingsCsv, exportWorkflowOverviewCsv, exportStrayCatCampaignsCsv } from "./report-export";

const mockAnimals = [
  {
    id: 1, name: "Rex", species: "hond", breed: "Labrador", gender: "reu",
    status: "beschikbaar", workflowPhase: "verblijf", intakeDate: "2025-12-01",
    intakeReason: "afstand", identificationNr: "981000000000001", kennelId: 1,
    isAvailableForAdoption: true, isNeutered: true, neuteredByShelter: true,
    isNewChip: false, passportNr: "BE03005880604", isNewPassport: false,
    isOnWebsite: true, dateOfBirth: "2020-12-01",
    lastBehaviorDate: null, lastVaccinationDate: "2026-01-09", lastVaccinationByShelter: true,
    lastDewormingDate: "2026-04-21",
  },
  {
    id: 2, name: "Mimi", species: "kat", breed: "Europees", gender: "poes",
    status: "gereserveerd", workflowPhase: "medisch", intakeDate: "2026-01-10",
    intakeReason: null, identificationNr: null, kennelId: null,
    isAvailableForAdoption: false, isNeutered: false, neuteredByShelter: null,
    isNewChip: false, passportNr: null, isNewPassport: false,
    isOnWebsite: false, dateOfBirth: null,
    lastBehaviorDate: null, lastVaccinationDate: null, lastVaccinationByShelter: null,
    lastDewormingDate: null,
  },
];

describe("exportAnimalReportCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetAnimalReport.mockResolvedValue({ animals: mockAnimals, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet ingelogd");
  });

  it("returns error when user has no report permission", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "wandelaar", email: "w@test.com", name: "W" });

    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("rechten");
  });

  it("generates CSV with correct headers", async () => {
    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      // Story 10.31: kolom "Vlooien" toegevoegd na "Ontworming".
      expect(lines[0]).toBe("Ter adoptie,Reden opvang,Gedragseval.,Naam,Ras,M/V,Steriel,Geb.datum,Chip,Nwe chip,Paspoort,Nw paspoort,Vaccin,Ontworming,Vlooien,Website,Adopteer");
    }
  });

  it("generates CSV with correct data rows", async () => {
    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3); // header + 2 data rows
      expect(lines[1]).toContain("Rex");
      expect(lines[1]).toContain("Labrador");
      // Reden opvang (label + datum), steriel "Ja (asiel)" en vaccin met '*' (door asiel)
      expect(lines[1]).toContain("Afstand door eigenaar — 01-12-2025");
      expect(lines[1]).toContain("Ja (asiel)");
      expect(lines[1]).toContain("09-01-2026 *");
      expect(lines[2]).toContain("Mimi");
    }
  });

  it("passes filters to the query without pagination", async () => {
    await exportAnimalReportCsv({ species: "hond", status: "beschikbaar" });

    expect(mockGetAnimalReport).toHaveBeenCalledWith({
      species: "hond",
      status: "beschikbaar",
    });
  });

  it("escapes commas and quotes in CSV fields", async () => {
    mockGetAnimalReport.mockResolvedValue({
      animals: [{
        ...mockAnimals[0],
        breed: 'Labrador, "Golden"',
      }],
      total: 1,
    });

    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('"Labrador, ""Golden"""');
    }
  });

  it("allows coordinator role to export", async () => {
    mockGetSession.mockResolvedValue({ userId: 2, role: "coördinator", email: "c@test.com", name: "C" });

    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(true);
  });

  it("handles empty result set", async () => {
    mockGetAnimalReport.mockResolvedValue({ animals: [], total: 0 });

    const result = await exportAnimalReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(1); // header only
    }
  });
});

// ==================== exportMedicationReportCsv ====================

const mockMedications = [
  {
    id: 1, animalId: 1, animalName: "Rex", animalSpecies: "hond",
    medicationName: "Amoxicilline", dosage: "250mg 2x/dag",
    startDate: "2026-02-01", endDate: null, isActive: true, notes: null,
  },
  {
    id: 2, animalId: 2, animalName: "Mimi", animalSpecies: "kat",
    medicationName: "Metacam", dosage: "0.5ml 1x/dag",
    startDate: "2026-01-15", endDate: "2026-02-15", isActive: false, notes: "Kuur afgerond",
  },
];

describe("exportMedicationReportCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetMedicationReport.mockResolvedValue({ medications: mockMedications, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await exportMedicationReportCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet ingelogd");
  });

  it("returns error when user has no report permission", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "wandelaar", email: "w@test.com", name: "W" });

    const result = await exportMedicationReportCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("rechten");
  });

  it("generates CSV with correct headers", async () => {
    const result = await exportMedicationReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines[0]).toBe("Dier,Soort,Medicatie,Dosering,Startdatum,Einddatum,Status,Opmerkingen");
    }
  });

  it("generates CSV with correct data rows", async () => {
    const result = await exportMedicationReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3); // header + 2 data rows
      expect(lines[1]).toContain("Rex");
      expect(lines[1]).toContain("Amoxicilline");
      expect(lines[1]).toContain("Actief");
      expect(lines[2]).toContain("Mimi");
      expect(lines[2]).toContain("Metacam");
      expect(lines[2]).toContain("Afgerond");
    }
  });

  it("passes isActive filter to the query", async () => {
    await exportMedicationReportCsv({ isActive: true });

    expect(mockGetMedicationReport).toHaveBeenCalledWith({ isActive: true });
  });

  it("handles empty result set", async () => {
    mockGetMedicationReport.mockResolvedValue({ medications: [], total: 0 });

    const result = await exportMedicationReportCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(1); // header only
    }
  });
});

// ==================== exportAdoptionContractsCsv ====================

const mockContracts = [
  {
    id: 1, animalName: "Rex", animalSpecies: "hond",
    candidateFirstName: "Jan", candidateLastName: "Janssen",
    contractDate: "2026-02-10", paymentAmount: "150.00", paymentMethod: "cash",
    dogidCatidTransferred: false,
  },
  {
    id: 2, animalName: "Mimi", animalSpecies: "kat",
    candidateFirstName: "Els", candidateLastName: "De Smet",
    contractDate: "2026-02-20", paymentAmount: "75.00", paymentMethod: "payconiq",
    dogidCatidTransferred: true,
  },
];

describe("exportAdoptionContractsCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetAdoptionContractsReport.mockResolvedValue({ contracts: mockContracts, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await exportAdoptionContractsCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet ingelogd");
  });

  it("returns error when user has no report permission", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "wandelaar", email: "w@test.com", name: "W" });

    const result = await exportAdoptionContractsCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("rechten");
  });

  it("generates CSV with correct headers", async () => {
    const result = await exportAdoptionContractsCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines[0]).toBe("Dier,Soort,Adoptant,Datum,Bedrag,Betaalwijze,DogID/CatID overgedragen");
    }
  });

  it("generates CSV with correct data rows", async () => {
    const result = await exportAdoptionContractsCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3); // header + 2 data rows
      expect(lines[1]).toContain("Rex");
      expect(lines[1]).toContain("Jan Janssen");
      expect(lines[1]).toContain("150.00");
      expect(lines[1]).toContain("Nee"); // dogidCatidTransferred = false
      expect(lines[2]).toContain("Mimi");
      expect(lines[2]).toContain("Ja"); // dogidCatidTransferred = true
    }
  });

  it("passes filters to the query without pagination", async () => {
    await exportAdoptionContractsCsv({ dateFrom: "2026-02-01", paymentMethod: "cash" });

    expect(mockGetAdoptionContractsReport).toHaveBeenCalledWith({
      dateFrom: "2026-02-01",
      paymentMethod: "cash",
    });
  });

  it("handles empty result set", async () => {
    mockGetAdoptionContractsReport.mockResolvedValue({ contracts: [], total: 0 });

    const result = await exportAdoptionContractsCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(1); // header only
    }
  });
});

// ==================== exportWebsitePublicationCsv ====================

const mockWebsiteAnimals = [
  {
    id: 1, name: "Rex", species: "hond", breed: "Labrador", gender: "reu",
    isOnWebsite: true, shortDescription: "Lieve hond",
    identificationNr: "981000000000001", status: "beschikbaar",
  },
  {
    id: 5, name: "Bella", species: "hond", breed: "Chihuahua", gender: "teef",
    isOnWebsite: true, shortDescription: "Klein en energiek",
    identificationNr: null, status: "beschikbaar",
  },
];

describe("exportWebsitePublicationCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetWebsitePublicationReport.mockResolvedValue({ animals: mockWebsiteAnimals, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await exportWebsitePublicationCsv();

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet ingelogd");
  });

  it("returns error when user has no report permission", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "wandelaar", email: "w@test.com", name: "W" });

    const result = await exportWebsitePublicationCsv();

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("rechten");
  });

  it("generates CSV with correct headers", async () => {
    const result = await exportWebsitePublicationCsv();

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines[0]).toBe("Naam,Soort,Ras,Geslacht,Chipnr,Korte beschrijving");
    }
  });

  it("generates CSV with correct data rows", async () => {
    const result = await exportWebsitePublicationCsv();

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toContain("Rex");
      expect(lines[1]).toContain("Hond");
      expect(lines[1]).toContain("Labrador");
      expect(lines[2]).toContain("Bella");
    }
  });

  it("handles empty result set", async () => {
    mockGetWebsitePublicationReport.mockResolvedValue({ animals: [], total: 0 });

    const result = await exportWebsitePublicationCsv();

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(1); // header only
    }
  });
});

// ==================== R9: Walk Activity CSV ====================

const mockWalkActivityRows = [
  { id: 1, date: "2026-02-20", walkerFirstName: "Jan", walkerLastName: "Peeters", animalName: "Rex", startTime: "10:00", endTime: "10:45", durationMinutes: 45, remarks: "Goed gelopen" },
  { id: 2, date: "2026-02-21", walkerFirstName: "Els", walkerLastName: "Janssen", animalName: "Buddy", startTime: "14:00", endTime: "14:30", durationMinutes: 30, remarks: null },
];

describe("exportWalkActivityCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetWalkActivityReport.mockResolvedValue({ walks: mockWalkActivityRows, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await exportWalkActivityCsv({});
    expect(result.success).toBe(false);
  });

  it("returns error without permission", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "wandelaar", email: "w@test.com", name: "W" });
    const result = await exportWalkActivityCsv({});
    expect(result.success).toBe(false);
  });

  it("returns CSV with correct headers", async () => {
    const result = await exportWalkActivityCsv({});
    expect(result.success).toBe(true);
    if (result.success) {
      const header = result.data.split("\n")[0];
      expect(header).toContain("Datum");
      expect(header).toContain("Wandelaar");
      expect(header).toContain("Hond");
      expect(header).toContain("Duur (min)");
    }
  });

  it("returns correct data rows", async () => {
    const result = await exportWalkActivityCsv({});
    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toContain("Jan Peeters");
      expect(lines[1]).toContain("Rex");
    }
  });

  it("passes filters to query", async () => {
    await exportWalkActivityCsv({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(mockGetWalkActivityReport).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: "2026-02-01", dateTo: "2026-02-28" }));
  });
});

// ==================== R10: Walker-Animal Pairings CSV ====================

const mockPairingExportRows = [
  { walkerId: 1, walkerFirstName: "Jan", walkerLastName: "Peeters", animalId: 1, animalName: "Rex", walkCount: 12, lastWalkDate: "2026-02-20" },
  { walkerId: 2, walkerFirstName: "Els", walkerLastName: "Janssen", animalId: 2, animalName: "Buddy", walkCount: 5, lastWalkDate: "2026-02-18" },
];

describe("exportWalkerAnimalPairingsCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetWalkerAnimalPairingsReport.mockResolvedValue({ pairings: mockPairingExportRows, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await exportWalkerAnimalPairingsCsv({});
    expect(result.success).toBe(false);
  });

  it("returns CSV with correct headers", async () => {
    const result = await exportWalkerAnimalPairingsCsv({});
    expect(result.success).toBe(true);
    if (result.success) {
      const header = result.data.split("\n")[0];
      expect(header).toContain("Wandelaar");
      expect(header).toContain("Hond");
      expect(header).toContain("Aantal wandelingen");
      expect(header).toContain("Laatste wandeling");
    }
  });

  it("returns correct data rows", async () => {
    const result = await exportWalkerAnimalPairingsCsv({});
    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain("Jan Peeters");
      expect(lines[1]).toContain("12");
    }
  });
});

// ==================== R13: Workflow Overview CSV ====================

const mockWorkflowExportRows = [
  { id: 1, name: "Rex", species: "hond", workflowPhase: "verblijf", intakeDate: "2025-12-01", daysSinceIntake: 90 },
  { id: 2, name: "Mimi", species: "kat", workflowPhase: "medisch", intakeDate: "2026-01-10", daysSinceIntake: 50 },
];

describe("exportWorkflowOverviewCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetWorkflowOverviewReport.mockResolvedValue({ animals: mockWorkflowExportRows, total: 2 });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await exportWorkflowOverviewCsv({});
    expect(result.success).toBe(false);
  });

  it("returns CSV with correct headers", async () => {
    const result = await exportWorkflowOverviewCsv({});
    expect(result.success).toBe(true);
    if (result.success) {
      const header = result.data.split("\n")[0];
      expect(header).toContain("Naam");
      expect(header).toContain("Fase");
      expect(header).toContain("Dagen in asiel");
    }
  });

  it("returns correct data rows", async () => {
    const result = await exportWorkflowOverviewCsv({});
    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain("Rex");
      expect(lines[1]).toContain("90");
    }
  });

  it("passes filters to query", async () => {
    await exportWorkflowOverviewCsv({ species: "hond" });
    expect(mockGetWorkflowOverviewReport).toHaveBeenCalledWith(expect.objectContaining({ species: "hond" }));
  });
});

// ==================== R14: Stray Cat Campaigns CSV ====================

const mockCampaignData = [
  {
    id: 1, requestDate: "2026-01-15", municipality: "Ninove", address: "Kerkstraat 1",
    status: "afgerond", cageNumbers: "K1, K2", inspectionDate: "2026-01-20",
    catDescription: "Zwarte kat", fivStatus: "negatief", felvStatus: "negatief",
    outcome: "gecastreerd_uitgezet", remarks: "Succesvol", cageDeploymentDate: null,
    cageAtVet: null, vetName: null, photoUrl: null, linkedAnimalId: null, createdAt: new Date(),
  },
  {
    id: 2, requestDate: "2026-02-01", municipality: "Geraardsbergen", address: "Markt 5",
    status: "open", cageNumbers: null, inspectionDate: null,
    catDescription: null, fivStatus: null, felvStatus: null,
    outcome: null, remarks: null, cageDeploymentDate: null,
    cageAtVet: null, vetName: null, photoUrl: null, linkedAnimalId: null, createdAt: new Date(),
  },
];

describe("exportStrayCatCampaignsCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, role: "beheerder", email: "admin@test.com", name: "Admin" });
    mockGetCampaignReport.mockResolvedValue({
      campaigns: mockCampaignData,
      stats: { total: 2, totalCatsCaught: 1, fivPositive: 0, fivPercentage: 0, felvPositive: 0, felvPercentage: 0, outcomes: { gecastreerd_uitgezet: 1 } },
    });
  });

  it("returns error when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await exportStrayCatCampaignsCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("niet ingelogd");
  });

  it("returns error without permission", async () => {
    mockGetSession.mockResolvedValue({ userId: 1, role: "wandelaar", email: "w@test.com", name: "W" });

    const result = await exportStrayCatCampaignsCsv({});

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("rechten");
  });

  it("returns CSV with correct headers and data", async () => {
    const result = await exportStrayCatCampaignsCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines[0]).toContain("Datum verzoek");
      expect(lines[0]).toContain("Gemeente");
      expect(lines[0]).toContain("FIV");
      expect(lines[0]).toContain("Uitkomst");
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toContain("Ninove");
      expect(lines[1]).toContain("Kerkstraat 1");
    }
  });

  it("handles empty result set", async () => {
    mockGetCampaignReport.mockResolvedValue({
      campaigns: [],
      stats: { total: 0, totalCatsCaught: 0, fivPositive: 0, fivPercentage: 0, felvPositive: 0, felvPercentage: 0, outcomes: {} },
    });

    const result = await exportStrayCatCampaignsCsv({});

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.split("\n");
      expect(lines).toHaveLength(1); // header only
    }
  });
});
