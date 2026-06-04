import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit, mockOffset, setMockData, mockEq, mockAnd, mockGte, mockLte, mockInnerJoin, mockIsNotNull, mockLeftJoin, mockGroupBy } = vi.hoisted(() => {
  let mockData: unknown[] = [];
  const setMockData = (data: unknown[]) => { mockData = data; };

  // Drizzle queries are thenable — make each step awaitable
  const mockOffset = vi.fn(async () => mockData);
  const mockLimit = vi.fn(() => ({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockData).then(res) }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockData).then(res) }));
  const mockGroupBy = vi.fn(() => ({ orderBy: mockOrderBy, then: (res: (v: unknown) => void) => Promise.resolve(mockData).then(res) }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockData).then(res) }));
  const mockLeftJoin = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, groupBy: mockGroupBy, leftJoin: mockLeftJoin as ReturnType<typeof vi.fn> }));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin as ReturnType<typeof vi.fn>, groupBy: mockGroupBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockDb = { select: mockSelect };
  const mockEq = vi.fn((...args: unknown[]) => ({ type: "eq", args }));
  const mockAnd = vi.fn((...args: unknown[]) => ({ type: "and", args }));
  const mockGte = vi.fn((...args: unknown[]) => ({ type: "gte", args }));
  const mockLte = vi.fn((...args: unknown[]) => ({ type: "lte", args }));
  const mockIsNotNull = vi.fn((col: unknown) => ({ type: "isNotNull", col }));
  return { mockDb, mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit, mockOffset, setMockData, mockEq, mockAnd, mockGte, mockLte, mockInnerJoin, mockIsNotNull, mockLeftJoin, mockGroupBy };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/db/schema", () => ({
  animals: {
    id: "animals.id",
    name: "animals.name",
    species: "animals.species",
    breed: "animals.breed",
    gender: "animals.gender",
    status: "animals.status",
    kennelId: "animals.kennel_id",
    workflowPhase: "animals.workflow_phase",
    intakeDate: "animals.intake_date",
    isInShelter: "animals.is_in_shelter",
    identificationNr: "animals.identification_nr",
    isAvailableForAdoption: "animals.is_available_for_adoption",
    isOnWebsite: "animals.is_on_website",
    dossierNr: "animals.dossier_nr",
    pvNr: "animals.pv_nr",
    ibnDecisionDeadline: "animals.ibn_decision_deadline",
    createdAt: "animals.created_at",
  },
  kennels: {
    id: "kennels.id",
    code: "kennels.code",
    zone: "kennels.zone",
    capacity: "kennels.capacity",
    isActive: "kennels.is_active",
    notes: "kennels.notes",
  },
  behaviorRecords: {
    id: "behavior_records.id",
    animalId: "behavior_records.animal_id",
    date: "behavior_records.date",
    checklist: "behavior_records.checklist",
    notes: "behavior_records.notes",
    createdAt: "behavior_records.created_at",
  },
  vaccinations: {
    id: "vaccinations.id",
    animalId: "vaccinations.animal_id",
    date: "vaccinations.date",
    givenByShelter: "vaccinations.given_by_shelter",
  },
  dewormings: {
    id: "dewormings.id",
    animalId: "dewormings.animal_id",
    date: "dewormings.date",
  },
  vetVisits: {
    id: "vet_visits.id",
    animalId: "vet_visits.animal_id",
    date: "vet_visits.date",
    location: "vet_visits.location",
    complaints: "vet_visits.complaints",
    todo: "vet_visits.todo",
    isCompleted: "vet_visits.is_completed",
    completedAt: "vet_visits.completed_at",
    notes: "vet_visits.notes",
    createdAt: "vet_visits.created_at",
  },
  medications: {
    id: "medications.id",
    animalId: "medications.animal_id",
    medicationName: "medications.medication_name",
    dosage: "medications.dosage",
    startDate: "medications.start_date",
    endDate: "medications.end_date",
    isActive: "medications.is_active",
    notes: "medications.notes",
    createdAt: "medications.created_at",
  },
  medicationLogs: {
    id: "medication_logs.id",
    medicationId: "medication_logs.medication_id",
    administeredAt: "medication_logs.administered_at",
    administeredBy: "medication_logs.administered_by",
  },
  vetInspectionReports: {
    id: "vet_inspection_reports.id",
    visitDate: "vet_inspection_reports.visit_date",
    vetName: "vet_inspection_reports.vet_name",
    vetSignature: "vet_inspection_reports.vet_signature",
    animalsTreated: "vet_inspection_reports.animals_treated",
    animalsEuthanized: "vet_inspection_reports.animals_euthanized",
    abnormalBehavior: "vet_inspection_reports.abnormal_behavior",
    recommendations: "vet_inspection_reports.recommendations",
    createdAt: "vet_inspection_reports.created_at",
  },
  adoptionContracts: {
    id: "adoption_contracts.id",
    animalId: "adoption_contracts.animal_id",
    candidateId: "adoption_contracts.candidate_id",
    contractDate: "adoption_contracts.contract_date",
    paymentAmount: "adoption_contracts.payment_amount",
    paymentMethod: "adoption_contracts.payment_method",
    contractPdfUrl: "adoption_contracts.contract_pdf_url",
    dogidCatidTransferDeadline: "adoption_contracts.dogid_catid_transfer_deadline",
    dogidCatidTransferred: "adoption_contracts.dogid_catid_transferred",
    notes: "adoption_contracts.notes",
    createdAt: "adoption_contracts.created_at",
  },
  adoptionCandidates: {
    id: "adoption_candidates.id",
    firstName: "adoption_candidates.first_name",
    lastName: "adoption_candidates.last_name",
    email: "adoption_candidates.email",
    phone: "adoption_candidates.phone",
    address: "adoption_candidates.address",
    animalId: "adoption_candidates.animal_id",
    status: "adoption_candidates.status",
    createdAt: "adoption_candidates.created_at",
  },
  walks: {
    id: "walks.id",
    walkerId: "walks.walker_id",
    animalId: "walks.animal_id",
    date: "walks.date",
    startTime: "walks.start_time",
    endTime: "walks.end_time",
    durationMinutes: "walks.duration_minutes",
    remarks: "walks.remarks",
    status: "walks.status",
    createdAt: "walks.created_at",
  },
  walkers: {
    id: "walkers.id",
    firstName: "walkers.first_name",
    lastName: "walkers.last_name",
    email: "walkers.email",
    isApproved: "walkers.is_approved",
  },
  animalWorkflowHistory: {
    id: "animal_workflow_history.id",
    animalId: "animal_workflow_history.animal_id",
    fromPhase: "animal_workflow_history.from_phase",
    toPhase: "animal_workflow_history.to_phase",
    changedBy: "animal_workflow_history.changed_by",
    createdAt: "animal_workflow_history.created_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: mockEq,
  and: mockAnd,
  gte: mockGte,
  lte: mockLte,
  isNotNull: mockIsNotNull,
  inArray: vi.fn((col: unknown, vals: unknown) => ({ type: "inArray", col, vals })),
  count: vi.fn((col: unknown) => ({ type: "count", col })),
  asc: vi.fn((col: unknown) => ({ type: "asc", col })),
  desc: vi.fn((col: unknown) => ({ type: "desc", col })),
  sql: vi.fn(),
}));

import { getAnimalReport, getBehaviorReportByAnimalId, getVetVisitsReport, getMedicationReport, getVetInspectionReportsFiltered, getAdoptionContractsReport, getAdoptableAnimalsReport, getWebsitePublicationReport, getKennelOccupancyReport, getIBNDossiersReport, getWalkActivityReport, getWalkerAnimalPairingsReport, getWorkflowOverviewReport } from "./reports";

const mockAnimals = [
  { id: 1, name: "Rex", species: "hond", breed: "Labrador", gender: "reu", status: "beschikbaar", kennelId: 1, workflowPhase: "verblijf", intakeDate: "2025-12-01" },
  { id: 2, name: "Mimi", species: "kat", breed: "Europees", gender: "poes", status: "beschikbaar", kennelId: 2, workflowPhase: "medisch", intakeDate: "2026-01-10" },
  { id: 3, name: "Buddy", species: "hond", breed: "Herder", gender: "reu", status: "gereserveerd", kennelId: 1, workflowPhase: "adoptie", intakeDate: "2025-11-15" },
];

// getAnimalReport verrijkt elk dier met de laatste medische/gedrags-records (R1).
// In deze gedeelde mock resolven die queries niet naar echte vaccinatie-/ontwormingsrijen,
// dus de medische velden zijn null — dit is de verwachte verrijkte vorm.
const withNullMedical = (rows: typeof mockAnimals) =>
  rows.map((a) => ({
    ...a,
    lastBehaviorDate: null,
    lastVaccinationDate: null,
    lastVaccinationByShelter: null,
    lastDewormingDate: null,
  }));

describe("getAnimalReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockAnimals);
    mockOffset.mockImplementation(async () => mockAnimals);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockAnimals).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockAnimals).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockAnimals).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all animals with no filters and default pagination", async () => {
    const result = await getAnimalReport({});

    expect(result.animals).toEqual(withNullMedical(mockAnimals));
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
  });

  it("applies species filter", async () => {
    await getAnimalReport({ species: "hond" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.species", "hond");
  });

  it("applies status filter", async () => {
    await getAnimalReport({ status: "beschikbaar" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.status", "beschikbaar");
  });

  it("applies kennelId filter", async () => {
    await getAnimalReport({ kennelId: 1 });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.kennel_id", 1);
  });

  it("applies workflowPhase filter", async () => {
    await getAnimalReport({ workflowPhase: "verblijf" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.workflow_phase", "verblijf");
  });

  it("applies multiple filters simultaneously", async () => {
    await getAnimalReport({ species: "hond", status: "beschikbaar", workflowPhase: "verblijf" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.species", "hond");
    expect(mockEq).toHaveBeenCalledWith("animals.status", "beschikbaar");
    expect(mockEq).toHaveBeenCalledWith("animals.workflow_phase", "verblijf");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getAnimalReport({ page: 2, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(50); // (page-1) * pageSize
  });

  it("returns all results when no pagination is provided (for export)", async () => {
    const result = await getAnimalReport({});

    expect(result.animals).toEqual(withNullMedical(mockAnimals));
    expect(result.total).toBe(mockAnimals.length);
    // No limit/offset called when no pagination
    expect(mockLimit).not.toHaveBeenCalled();
    expect(mockOffset).not.toHaveBeenCalled();
  });

  it("returns empty array on database error", async () => {
    // Non-paginated path awaits orderBy directly (thenable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getAnimalReport({});

    expect(result.animals).toEqual([]);
    expect(result.total).toBe(0);
  });
});

const mockBehaviorRecords = [
  { id: 1, animalId: 1, date: "2026-01-15", checklist: { verzorgers_algemeenAgressief: false }, notes: "Rustige hond", createdAt: new Date() },
  { id: 2, animalId: 1, date: "2026-02-01", checklist: { verzorgers_algemeenAgressief: true }, notes: null, createdAt: new Date() },
];

describe("getBehaviorReportByAnimalId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ then: (res: (v: unknown) => void) => Promise.resolve(mockBehaviorRecords).then(res) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockWhere.mockReturnValue({ orderBy: mockOrderBy } as any);
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns behavior records for a given animal", async () => {
    const result = await getBehaviorReportByAnimalId(1);

    expect(result).toEqual(mockBehaviorRecords);
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej) } as any);

    const result = await getBehaviorReportByAnimalId(1);

    expect(result).toEqual([]);
  });
});

// ==================== R2: Vet Visits Report ====================

const mockVetVisitRows = [
  { id: 1, animalId: 1, animalName: "Rex", animalSpecies: "hond", date: "2026-02-10", location: "in_asiel", complaints: null, todo: "Vaccinatie", isCompleted: false, completedAt: null, notes: null },
  { id: 2, animalId: 2, animalName: "Mimi", animalSpecies: "kat", date: "2026-02-15", location: "in_praktijk", complaints: "Kreupel", todo: "Röntgen", isCompleted: true, completedAt: new Date(), notes: "OK" },
];

describe("getVetVisitsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockVetVisitRows);
    mockOffset.mockImplementation(async () => mockVetVisitRows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockVetVisitRows).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockVetVisitRows).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockVetVisitRows).then(res) });
    mockInnerJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, groupBy: mockGroupBy });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all vet visits with no filters", async () => {
    const result = await getVetVisitsReport({});

    expect(result.visits).toEqual(mockVetVisitRows);
    expect(result.total).toBe(mockVetVisitRows.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockInnerJoin).toHaveBeenCalled();
  });

  it("applies dateFrom filter", async () => {
    await getVetVisitsReport({ dateFrom: "2026-02-01" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockGte).toHaveBeenCalledWith("vet_visits.date", "2026-02-01");
  });

  it("applies dateTo filter", async () => {
    await getVetVisitsReport({ dateTo: "2026-02-28" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockLte).toHaveBeenCalledWith("vet_visits.date", "2026-02-28");
  });

  it("applies location filter", async () => {
    await getVetVisitsReport({ location: "in_asiel" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("vet_visits.location", "in_asiel");
  });

  it("applies multiple filters simultaneously", async () => {
    await getVetVisitsReport({ dateFrom: "2026-02-01", dateTo: "2026-02-28", location: "in_praktijk" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockGte).toHaveBeenCalledWith("vet_visits.date", "2026-02-01");
    expect(mockLte).toHaveBeenCalledWith("vet_visits.date", "2026-02-28");
    expect(mockEq).toHaveBeenCalledWith("vet_visits.location", "in_praktijk");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getVetVisitsReport({ page: 2, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(50);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getVetVisitsReport({});

    expect(result.visits).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R5: Medication Report ====================

const mockMedicationRows = [
  { id: 1, animalId: 1, animalName: "Rex", animalSpecies: "hond", medicationName: "Amoxicilline", dosage: "250mg 2x/dag", startDate: "2026-02-01", endDate: null, isActive: true, notes: null },
  { id: 2, animalId: 2, animalName: "Mimi", animalSpecies: "kat", medicationName: "Metacam", dosage: "0.5ml 1x/dag", startDate: "2026-01-15", endDate: "2026-02-15", isActive: false, notes: "Afgerond" },
];

describe("getMedicationReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockMedicationRows);
    mockOffset.mockImplementation(async () => mockMedicationRows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockMedicationRows).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockMedicationRows).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockMedicationRows).then(res) });
    mockInnerJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, groupBy: mockGroupBy });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all medications with no filters", async () => {
    const result = await getMedicationReport({});

    expect(result.medications).toEqual(mockMedicationRows);
    expect(result.total).toBe(mockMedicationRows.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockInnerJoin).toHaveBeenCalled();
  });

  it("filters by isActive = true (actief)", async () => {
    await getMedicationReport({ isActive: true });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("medications.is_active", true);
  });

  it("filters by isActive = false (afgerond)", async () => {
    await getMedicationReport({ isActive: false });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("medications.is_active", false);
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getMedicationReport({ page: 1, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(0);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getMedicationReport({});

    expect(result.medications).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R11: Vet Inspection Reports (filtered) ====================

const mockInspectionReports = [
  { id: 1, visitDate: "2026-02-07", vetName: "Dr. Janssen", vetSignature: true, animalsTreated: [], animalsEuthanized: [], abnormalBehavior: [], recommendations: "Alles OK", createdAt: new Date() },
  { id: 2, visitDate: "2026-02-14", vetName: "Dr. Janssen", vetSignature: true, animalsTreated: [{ animalName: "Rex" }], animalsEuthanized: [], abnormalBehavior: [], recommendations: null, createdAt: new Date() },
];

describe("getVetInspectionReportsFiltered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockInspectionReports);
    mockOffset.mockImplementation(async () => mockInspectionReports);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockInspectionReports).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockInspectionReports).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockInspectionReports).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all reports with no filters", async () => {
    const result = await getVetInspectionReportsFiltered({});

    expect(result.reports).toEqual(mockInspectionReports);
    expect(result.total).toBe(mockInspectionReports.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
  });

  it("applies dateFrom filter", async () => {
    await getVetInspectionReportsFiltered({ dateFrom: "2026-01-01" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockGte).toHaveBeenCalledWith("vet_inspection_reports.visit_date", "2026-01-01");
  });

  it("applies dateTo filter", async () => {
    await getVetInspectionReportsFiltered({ dateTo: "2026-02-28" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockLte).toHaveBeenCalledWith("vet_inspection_reports.visit_date", "2026-02-28");
  });

  it("applies both date filters simultaneously", async () => {
    await getVetInspectionReportsFiltered({ dateFrom: "2024-03-01", dateTo: "2026-02-28" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockGte).toHaveBeenCalledWith("vet_inspection_reports.visit_date", "2024-03-01");
    expect(mockLte).toHaveBeenCalledWith("vet_inspection_reports.visit_date", "2026-02-28");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getVetInspectionReportsFiltered({ page: 3, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(100); // (3-1) * 50
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getVetInspectionReportsFiltered({});

    expect(result.reports).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R3: Adoption Contracts Report ====================

const mockContractRows = [
  { id: 1, animalName: "Rex", animalSpecies: "hond", candidateFirstName: "Jan", candidateLastName: "Janssen", contractDate: "2026-02-10", paymentAmount: "150.00", paymentMethod: "cash", dogidCatidTransferred: false },
  { id: 2, animalName: "Mimi", animalSpecies: "kat", candidateFirstName: "Els", candidateLastName: "De Smet", contractDate: "2026-02-20", paymentAmount: "75.00", paymentMethod: "payconiq", dogidCatidTransferred: true },
];

describe("getAdoptionContractsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockContractRows);
    mockOffset.mockImplementation(async () => mockContractRows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockContractRows).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockContractRows).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockContractRows).then(res) });
    mockInnerJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, groupBy: mockGroupBy });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all contracts with no filters", async () => {
    const result = await getAdoptionContractsReport({});

    expect(result.contracts).toEqual(mockContractRows);
    expect(result.total).toBe(mockContractRows.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockInnerJoin).toHaveBeenCalled();
  });

  it("applies dateFrom filter on contractDate", async () => {
    await getAdoptionContractsReport({ dateFrom: "2026-02-01" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockGte).toHaveBeenCalledWith("adoption_contracts.contract_date", "2026-02-01");
  });

  it("applies dateTo filter on contractDate", async () => {
    await getAdoptionContractsReport({ dateTo: "2026-02-28" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockLte).toHaveBeenCalledWith("adoption_contracts.contract_date", "2026-02-28");
  });

  it("applies paymentMethod filter", async () => {
    await getAdoptionContractsReport({ paymentMethod: "cash" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("adoption_contracts.payment_method", "cash");
  });

  it("applies multiple filters simultaneously", async () => {
    await getAdoptionContractsReport({ dateFrom: "2026-02-01", dateTo: "2026-02-28", paymentMethod: "payconiq" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockGte).toHaveBeenCalledWith("adoption_contracts.contract_date", "2026-02-01");
    expect(mockLte).toHaveBeenCalledWith("adoption_contracts.contract_date", "2026-02-28");
    expect(mockEq).toHaveBeenCalledWith("adoption_contracts.payment_method", "payconiq");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getAdoptionContractsReport({ page: 2, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(50);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getAdoptionContractsReport({});

    expect(result.contracts).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R6: Adoptable Animals Report ====================

const mockAdoptableAnimals = [
  { id: 1, name: "Rex", species: "hond", breed: "Labrador", gender: "reu", isAvailableForAdoption: true },
  { id: 4, name: "Luna", species: "kat", breed: "Siamees", gender: "poes", isAvailableForAdoption: true },
];

describe("getAdoptableAnimalsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockAdoptableAnimals);
    mockOffset.mockImplementation(async () => mockAdoptableAnimals);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockAdoptableAnimals).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockAdoptableAnimals).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockAdoptableAnimals).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all adoptable animals with no species filter", async () => {
    const result = await getAdoptableAnimalsReport({});

    expect(result.animals).toEqual(mockAdoptableAnimals);
    expect(result.total).toBe(mockAdoptableAnimals.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.is_available_for_adoption", true);
  });

  it("applies species filter in addition to isAvailableForAdoption", async () => {
    await getAdoptableAnimalsReport({ species: "hond" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.is_available_for_adoption", true);
    expect(mockEq).toHaveBeenCalledWith("animals.species", "hond");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getAdoptableAnimalsReport({ page: 1, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(0);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getAdoptableAnimalsReport({});

    expect(result.animals).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R7: Website Publication Report ====================

const mockWebsiteAnimals = [
  { id: 1, name: "Rex", species: "hond", breed: "Labrador", gender: "reu", isOnWebsite: true, shortDescription: "Lieve hond" },
  { id: 5, name: "Bella", species: "hond", breed: "Chihuahua", gender: "teef", isOnWebsite: true, shortDescription: "Klein en energiek" },
];

describe("getWebsitePublicationReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockWebsiteAnimals);
    mockOffset.mockImplementation(async () => mockWebsiteAnimals);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockWebsiteAnimals).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockWebsiteAnimals).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockWebsiteAnimals).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all animals with isOnWebsite = true", async () => {
    const result = await getWebsitePublicationReport({});

    expect(result.animals).toEqual(mockWebsiteAnimals);
    expect(result.total).toBe(mockWebsiteAnimals.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("animals.is_on_website", true);
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getWebsitePublicationReport({ page: 2, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(50);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getWebsitePublicationReport({});

    expect(result.animals).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R8: Kennel Occupancy Report ====================

const mockKennelOccupancy = [
  { kennelId: 1, code: "H1", zone: "honden", capacity: 2, count: 1 },
  { kennelId: 2, code: "H2", zone: "honden", capacity: 2, count: 2 },
  { kennelId: 3, code: "K1", zone: "katten", capacity: 4, count: 3 },
];

describe("getKennelOccupancyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockKennelOccupancy);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ then: (res: (v: unknown) => void) => Promise.resolve(mockKennelOccupancy).then(res) } as any);
    mockGroupBy.mockReturnValue({ orderBy: mockOrderBy, then: (res: (v: unknown) => void) => Promise.resolve(mockKennelOccupancy).then(res) });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockKennelOccupancy).then(res) });
    mockLeftJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, groupBy: mockGroupBy, leftJoin: mockLeftJoin });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all kennel occupancy data with no zone filter", async () => {
    const result = await getKennelOccupancyReport({});

    expect(result.kennels).toEqual(mockKennelOccupancy);
    expect(result.total).toBe(mockKennelOccupancy.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockLeftJoin).toHaveBeenCalled();
    expect(mockGroupBy).toHaveBeenCalled();
  });

  it("applies zone filter", async () => {
    await getKennelOccupancyReport({ zone: "honden" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("kennels.zone", "honden");
  });

  it("always filters on isActive = true", async () => {
    await getKennelOccupancyReport({});

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("kennels.is_active", true);
  });

  it("applies zone and isActive filters simultaneously", async () => {
    await getKennelOccupancyReport({ zone: "katten" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("kennels.is_active", true);
    expect(mockEq).toHaveBeenCalledWith("kennels.zone", "katten");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getKennelOccupancyReport({});

    expect(result.kennels).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R12: IBN Dossiers Report ====================

const mockIBNDossiers = [
  { id: 1, name: "Max", species: "hond", dossierNr: "IBN-2026-001", pvNr: "PV-001", ibnDecisionDeadline: "2026-03-15", workflowPhase: "ibn_opvang", intakeDate: "2026-01-15" },
  { id: 2, name: "Oscar", species: "kat", dossierNr: "IBN-2026-002", pvNr: "PV-002", ibnDecisionDeadline: "2026-02-20", workflowPhase: "ibn_opvang", intakeDate: "2026-01-20" },
];

describe("getIBNDossiersReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockIBNDossiers);
    mockOffset.mockImplementation(async () => mockIBNDossiers);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockIBNDossiers).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockIBNDossiers).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockIBNDossiers).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns all IBN dossiers (dossierNr IS NOT NULL)", async () => {
    const result = await getIBNDossiersReport({});

    expect(result.dossiers).toEqual(mockIBNDossiers);
    expect(result.total).toBe(mockIBNDossiers.length);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockIsNotNull).toHaveBeenCalledWith("animals.dossier_nr");
  });

  it("applies deadlineFrom filter", async () => {
    await getIBNDossiersReport({ deadlineFrom: "2026-03-01" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockIsNotNull).toHaveBeenCalledWith("animals.dossier_nr");
    expect(mockGte).toHaveBeenCalledWith("animals.ibn_decision_deadline", "2026-03-01");
  });

  it("applies deadlineTo filter", async () => {
    await getIBNDossiersReport({ deadlineTo: "2026-03-31" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockIsNotNull).toHaveBeenCalledWith("animals.dossier_nr");
    expect(mockLte).toHaveBeenCalledWith("animals.ibn_decision_deadline", "2026-03-31");
  });

  it("applies multiple filters simultaneously", async () => {
    await getIBNDossiersReport({ deadlineFrom: "2026-03-01", deadlineTo: "2026-03-31" });

    expect(mockWhere).toHaveBeenCalled();
    expect(mockIsNotNull).toHaveBeenCalledWith("animals.dossier_nr");
    expect(mockGte).toHaveBeenCalledWith("animals.ibn_decision_deadline", "2026-03-01");
    expect(mockLte).toHaveBeenCalledWith("animals.ibn_decision_deadline", "2026-03-31");
    expect(mockAnd).toHaveBeenCalled();
  });

  it("uses pagination when page and pageSize are provided", async () => {
    await getIBNDossiersReport({ page: 2, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockOffset).toHaveBeenCalledWith(50);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getIBNDossiersReport({});

    expect(result.dossiers).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R9: Walk Activity Report ====================

const mockWalkRows = [
  { id: 1, date: "2026-02-20", walkerFirstName: "Jan", walkerLastName: "Peeters", animalName: "Rex", startTime: "10:00", endTime: "10:45", durationMinutes: 45, remarks: "Goed gelopen" },
  { id: 2, date: "2026-02-21", walkerFirstName: "Els", walkerLastName: "Janssen", animalName: "Buddy", startTime: "14:00", endTime: "14:30", durationMinutes: 30, remarks: null },
];

describe("getWalkActivityReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockWalkRows);
    mockOffset.mockImplementation(async () => mockWalkRows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockWalkRows).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockWalkRows).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockWalkRows).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockInnerJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, groupBy: mockGroupBy });
  });

  it("returns walk activity without filters", async () => {
    const result = await getWalkActivityReport({});

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(result.walks).toEqual(mockWalkRows);
    expect(result.total).toBe(2);
  });

  it("applies date range filters", async () => {
    await getWalkActivityReport({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });

    expect(mockGte).toHaveBeenCalled();
    expect(mockLte).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("applies walkerId filter", async () => {
    await getWalkActivityReport({ walkerId: 5 });

    expect(mockEq).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("applies animalId filter", async () => {
    await getWalkActivityReport({ animalId: 3 });

    expect(mockEq).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("supports pagination", async () => {
    setMockData([{ count: 42 }]);
    mockWhere.mockReturnValue({
      orderBy: mockOrderBy,
      groupBy: mockGroupBy,
      limit: mockLimit,
      then: (res: (v: unknown) => void) => Promise.resolve([{ count: 42 }]).then(res),
    });

    const result = await getWalkActivityReport({ page: 2, pageSize: 10 });

    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(mockOffset).toHaveBeenCalledWith(10);
    expect(result.total).toBeDefined();
  });

  it("joins walks with walkers and animals", async () => {
    await getWalkActivityReport({});

    expect(mockInnerJoin).toHaveBeenCalledTimes(2);
  });

  it("filters only completed walks", async () => {
    await getWalkActivityReport({});

    expect(mockEq).toHaveBeenCalled();
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getWalkActivityReport({});

    expect(result.walks).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R10: Walker-Animal Pairings Report ====================

const mockPairingRows = [
  { walkerId: 1, walkerFirstName: "Jan", walkerLastName: "Peeters", animalId: 1, animalName: "Rex", walkCount: 12, lastWalkDate: "2026-02-20" },
  { walkerId: 2, walkerFirstName: "Els", walkerLastName: "Janssen", animalId: 2, animalName: "Buddy", walkCount: 5, lastWalkDate: "2026-02-18" },
];

describe("getWalkerAnimalPairingsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockPairingRows);
    mockOffset.mockImplementation(async () => mockPairingRows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockPairingRows).then(res) } as any);
    mockGroupBy.mockReturnValue({ orderBy: mockOrderBy, then: (res: (v: unknown) => void) => Promise.resolve(mockPairingRows).then(res) });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockPairingRows).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
    mockInnerJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, groupBy: mockGroupBy });
  });

  it("returns pairings without filters", async () => {
    const result = await getWalkerAnimalPairingsReport({});

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(result.pairings).toEqual(mockPairingRows);
    expect(result.total).toBe(2);
  });

  it("applies walkerId filter", async () => {
    await getWalkerAnimalPairingsReport({ walkerId: 1 });

    expect(mockEq).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("applies animalId filter", async () => {
    await getWalkerAnimalPairingsReport({ animalId: 3 });

    expect(mockEq).toHaveBeenCalled();
  });

  it("applies date range filters", async () => {
    await getWalkerAnimalPairingsReport({ dateFrom: "2026-01-01", dateTo: "2026-02-28" });

    expect(mockGte).toHaveBeenCalled();
    expect(mockLte).toHaveBeenCalled();
  });

  it("uses GROUP BY for aggregation", async () => {
    await getWalkerAnimalPairingsReport({});

    expect(mockGroupBy).toHaveBeenCalled();
  });

  it("joins walks with walkers and animals", async () => {
    await getWalkerAnimalPairingsReport({});

    expect(mockInnerJoin).toHaveBeenCalledTimes(2);
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getWalkerAnimalPairingsReport({});

    expect(result.pairings).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== R13: Workflow Overview Report ====================

const mockWorkflowRows = [
  { id: 1, name: "Rex", species: "hond", workflowPhase: "verblijf", intakeDate: "2025-12-01", daysSinceIntake: 90 },
  { id: 2, name: "Mimi", species: "kat", workflowPhase: "medisch", intakeDate: "2026-01-10", daysSinceIntake: 50 },
  { id: 3, name: "Buddy", species: "hond", workflowPhase: "adoptie", intakeDate: "2025-11-15", daysSinceIntake: 106 },
];

describe("getWorkflowOverviewReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockData(mockWorkflowRows);
    mockOffset.mockImplementation(async () => mockWorkflowRows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockWorkflowRows).then(res) } as any);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit, then: (res: (v: unknown) => void) => Promise.resolve(mockWorkflowRows).then(res) });
    mockLimit.mockReturnValue({ offset: mockOffset, then: (res: (v: unknown) => void) => Promise.resolve(mockWorkflowRows).then(res) });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin, leftJoin: mockLeftJoin });
  });

  it("returns workflow overview without filters", async () => {
    const result = await getWorkflowOverviewReport({});

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(result.animals).toEqual(mockWorkflowRows);
    expect(result.total).toBe(3);
  });

  it("applies species filter", async () => {
    await getWorkflowOverviewReport({ species: "hond" });

    expect(mockEq).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("applies workflowPhase filter", async () => {
    await getWorkflowOverviewReport({ workflowPhase: "medisch" });

    expect(mockEq).toHaveBeenCalled();
  });

  it("applies date range filters on intakeDate", async () => {
    await getWorkflowOverviewReport({ dateFrom: "2025-11-01", dateTo: "2026-01-31" });

    expect(mockGte).toHaveBeenCalled();
    expect(mockLte).toHaveBeenCalled();
  });

  it("supports pagination", async () => {
    setMockData([{ count: 100 }]);
    mockWhere.mockReturnValue({
      orderBy: mockOrderBy,
      groupBy: mockGroupBy,
      limit: mockLimit,
      then: (res: (v: unknown) => void) => Promise.resolve([{ count: 100 }]).then(res),
    });

    const result = await getWorkflowOverviewReport({ page: 1, pageSize: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result.total).toBeDefined();
  });

  it("only includes animals with a workflowPhase", async () => {
    await getWorkflowOverviewReport({});

    expect(mockIsNotNull).toHaveBeenCalled();
  });

  it("returns empty array on database error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      then: (_res: unknown, rej: (e: Error) => void) => Promise.reject(new Error("DB error")).catch(rej),
    } as any);

    const result = await getWorkflowOverviewReport({});

    expect(result.animals).toEqual([]);
    expect(result.total).toBe(0);
  });
});
