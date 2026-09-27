import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetCandidate,
  mockGetWalker,
  mockGetKennismakingen,
  mockGetContracts,
  mockGetFollowups,
  mockGetWalks,
  mockGetAnimalName,
} = vi.hoisted(() => ({
  mockGetCandidate: vi.fn(),
  mockGetWalker: vi.fn(),
  mockGetKennismakingen: vi.fn(),
  mockGetContracts: vi.fn(),
  mockGetFollowups: vi.fn(),
  mockGetWalks: vi.fn(),
  mockGetAnimalName: vi.fn(),
}));

vi.mock("@/lib/queries/gdpr", () => ({
  getAdoptionCandidateForGdpr: mockGetCandidate,
  getWalkerForGdpr: mockGetWalker,
  getKennismakingenForExport: mockGetKennismakingen,
  getContractsForExport: mockGetContracts,
  getFollowupsForExport: mockGetFollowups,
  getWalksForExport: mockGetWalks,
  getAnimalNameById: mockGetAnimalName,
}));

import {
  getCandidateExportData,
  getWalkerExportData,
  formatCandidateExportJson,
  formatCandidateExportCsv,
  formatWalkerExportJson,
  formatWalkerExportCsv,
} from "./export";

const mockCandidate = {
  id: 1,
  firstName: "Jan",
  lastName: "Janssens",
  email: "jan@example.com",
  phone: "0471234567",
  address: "Kerkstraat 1, 9400 Ninove",
  animalId: 3,
  questionnaireAnswers: { woonsituatie: "huis_met_tuin" },
  category: "goede_kandidaat",
  categorySetBy: "admin",
  status: "adopted",
  notes: "Goed gesprek gehad",
  anonymisedAt: null,
  createdAt: new Date("2025-06-01"),
};

const mockKennismaking = {
  id: 10,
  adoptionCandidateId: 1,
  animalId: 3,
  scheduledAt: new Date("2026-01-15"),
  location: "Asiel",
  status: "completed",
  outcome: "positief",
  notes: "Goede klik",
  createdBy: "admin",
  createdAt: new Date("2026-01-10"),
};

const mockContract = {
  id: 20,
  animalId: 3,
  candidateId: 1,
  contractDate: "2026-02-01",
  paymentAmount: "150.00",
  paymentMethod: "payconiq",
  contractPdfUrl: null,
  dogidCatidTransferDeadline: "2026-02-15",
  dogidCatidTransferred: true,
  notes: null,
  createdAt: new Date("2026-02-01"),
};

const mockFollowup = {
  id: 30,
  contractId: 20,
  followupType: "1_week",
  date: "2026-02-08",
  notes: "Alles goed",
  status: "completed",
  createdAt: new Date("2026-02-08"),
};

const mockWalkerData = {
  id: 5,
  firstName: "Marie",
  lastName: "Peeters",
  dateOfBirth: "1990-05-15",
  address: "Brusselsesteenweg 10, 9400 Ninove",
  phone: "0498765432",
  email: "marie@example.com",
  allergies: "Pollen",
  childrenWalkAlong: true,
  regulationsRead: true,
  // Story 10.77: bewijs van de aanvaarding van het wandelreglement.
  regulationsAcceptedAt: new Date("2026-09-27T12:05:00Z"),
  regulationsVersion: "2026-05-05",
  barcode: "WLK-5",
  photoUrl: "https://blob.vercel-storage.com/walkers/photos/marie.jpg",
  isApproved: true,
  walkCount: 12,
  isWalkingClubMember: false,
  status: "approved",
  rejectionReason: null,
  userId: 99,
  anonymisedAt: null,
  createdAt: new Date("2025-08-01"),
};

const mockWalk = {
  id: 40,
  walkerId: 5,
  animalId: 3,
  date: "2026-01-20",
  startTime: "10:00",
  endTime: "10:45",
  durationMinutes: 45,
  remarks: "Brave hond",
  status: "completed",
  createdAt: new Date("2026-01-20"),
};

// === Data collection tests ===

describe("getCandidateExportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCandidate.mockResolvedValue(mockCandidate);
    mockGetAnimalName.mockResolvedValue("Max");
    mockGetKennismakingen.mockResolvedValue([mockKennismaking]);
    mockGetContracts.mockResolvedValue([mockContract]);
    mockGetFollowups.mockResolvedValue([mockFollowup]);
  });

  it("returns null when candidate not found", async () => {
    mockGetCandidate.mockResolvedValue(null);

    const result = await getCandidateExportData(999);

    expect(result).toBeNull();
  });

  it("collects candidate with all related data", async () => {
    const result = await getCandidateExportData(1);

    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("Jan");
    expect(result!.animalName).toBe("Max");
    expect(result!.kennismakingen).toEqual([mockKennismaking]);
    expect(result!.contracts).toEqual([mockContract]);
    expect(result!.followups).toEqual([mockFollowup]);
  });

  it("handles empty related data", async () => {
    mockGetKennismakingen.mockResolvedValue([]);
    mockGetContracts.mockResolvedValue([]);

    const result = await getCandidateExportData(1);

    expect(result!.kennismakingen).toEqual([]);
    expect(result!.contracts).toEqual([]);
    expect(result!.followups).toEqual([]);
  });
});

describe("getWalkerExportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWalker.mockResolvedValue(mockWalkerData);
    mockGetWalks.mockResolvedValue([mockWalk]);
    mockGetAnimalName.mockResolvedValue("Max");
  });

  it("returns null when walker not found", async () => {
    mockGetWalker.mockResolvedValue(null);

    const result = await getWalkerExportData(999);

    expect(result).toBeNull();
  });

  it("collects walker with walks and animal names", async () => {
    const result = await getWalkerExportData(5);

    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("Marie");
    expect(result!.walks).toHaveLength(1);
    expect(result!.walks[0].animalName).toBe("Max");
  });

  it("handles empty walks", async () => {
    mockGetWalks.mockResolvedValue([]);

    const result = await getWalkerExportData(5);

    expect(result!.walks).toEqual([]);
  });
});

// === Formatting tests ===

describe("formatCandidateExportJson", () => {
  it("returns valid JSON with all sections", () => {
    const data = {
      ...mockCandidate,
      animalName: "Max",
      kennismakingen: [mockKennismaking],
      contracts: [mockContract],
      followups: [mockFollowup],
    };

    const json = formatCandidateExportJson(data);
    const parsed = JSON.parse(json);

    expect(parsed.persoonsgegevens.voornaam).toBe("Jan");
    expect(parsed.persoonsgegevens.achternaam).toBe("Janssens");
    expect(parsed.persoonsgegevens.email).toBe("jan@example.com");
    expect(parsed.aanvraag.dier).toBe("Max");
    expect(parsed.kennismakingen).toHaveLength(1);
    expect(parsed.contracten).toHaveLength(1);
    expect(parsed.opvolgingen).toHaveLength(1);
  });
});

describe("formatCandidateExportCsv", () => {
  it("returns CSV with header and data rows", () => {
    const data = {
      ...mockCandidate,
      animalName: "Max",
      kennismakingen: [],
      contracts: [],
      followups: [],
    };

    const csv = formatCandidateExportCsv(data);
    const lines = csv.split("\n");

    // Section header
    expect(lines[0]).toBe("# Persoonsgegevens");
    // Has data
    expect(csv).toContain("Jan");
    expect(csv).toContain("Janssens");
    expect(csv).toContain("jan@example.com");
  });

  it("escapes CSV special characters", () => {
    const data = {
      ...mockCandidate,
      address: 'Kerkstraat 1, "9400" Ninove',
      animalName: "Max",
      kennismakingen: [],
      contracts: [],
      followups: [],
    };

    const csv = formatCandidateExportCsv(data);

    // Quoted field with escaped inner quotes
    expect(csv).toContain('"Kerkstraat 1, ""9400"" Ninove"');
  });
});

describe("formatWalkerExportJson", () => {
  it("returns valid JSON with all sections", () => {
    const data = {
      ...mockWalkerData,
      walks: [{ ...mockWalk, animalName: "Max" }],
    };

    const json = formatWalkerExportJson(data);
    const parsed = JSON.parse(json);

    expect(parsed.persoonsgegevens.voornaam).toBe("Marie");
    expect(parsed.persoonsgegevens.email).toBe("marie@example.com");
    expect(parsed.persoonsgegevens.geboortedatum).toBe("1990-05-15");
    expect(parsed.persoonsgegevens.allergieen).toBe("Pollen");
    expect(parsed.profiel.barcode).toBe("WLK-5");
    expect(parsed.profiel.goedgekeurd).toBe(true);
    expect(parsed.profiel.status).toBe("approved");
    expect(parsed.profiel.aantalWandelingen).toBe(12);
    expect(parsed.wandelingen).toHaveLength(1);
    expect(parsed.wandelingen[0].dier).toBe("Max");
    // Story 10.77: welke versie van het wandelreglement, en wanneer.
    expect(parsed.profiel.wandelreglement).toEqual({ versie: "2026-05-05", aanvaardOp: "2026-09-27T12:05:00.000Z" });
  });
});

describe("formatWalkerExportCsv", () => {
  it("returns CSV with header and data rows", () => {
    const data = {
      ...mockWalkerData,
      walks: [{ ...mockWalk, animalName: "Max" }],
    };

    const csv = formatWalkerExportCsv(data);

    expect(csv).toContain("# Persoonsgegevens");
    expect(csv).toContain("Marie");
    expect(csv).toContain("marie@example.com");
    expect(csv).toContain("# Profiel");
    expect(csv).toContain("WLK-5");
    expect(csv).toContain("approved");
    expect(csv).toContain("# Wandelingen");
    expect(csv).toContain("Max");
    expect(csv).toContain("Wandelreglement versie,2026-05-05");
    expect(csv).toContain("Wandelreglement aanvaard op,2026-09-27T12:05:00.000Z");
  });

  it("handles empty walks in CSV", () => {
    const data = {
      ...mockWalkerData,
      walks: [],
    };

    const csv = formatWalkerExportCsv(data);

    expect(csv).toContain("# Profiel");
    expect(csv).toContain("# Wandelingen");
    // Only header row, no data rows for walks
    const lines = csv.split("\n");
    const walkHeaderIdx = lines.findIndex((l) => l === "# Wandelingen");
    const walkColumnsIdx = walkHeaderIdx + 1;
    // Next line after column header should be empty or next section
    expect(lines[walkColumnsIdx + 1] === "" || lines[walkColumnsIdx + 1] === undefined).toBe(true);
  });
});
