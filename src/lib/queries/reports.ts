import { db } from "@/lib/db";
import { animals, behaviorRecords, vaccinations, dewormings, vetVisits, medications, vetInspectionReports, adoptionContracts, adoptionCandidates, kennels, walks, walkers, animalWorkflowHistory } from "@/lib/db/schema";
import { eq, and, asc, desc, gte, lte, isNotNull, inArray, count, sql } from "drizzle-orm";
import type { Animal, BehaviorRecord, VetInspectionReport } from "@/types";
import { latestByAnimalId, latestByAnimalIdForCategory } from "@/lib/reports/animal-report-format";

export interface AnimalReportFilters {
  species?: string;
  status?: string;
  kennelId?: number;
  workflowPhase?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Animal verrijkt met de laatste medische/gedrags-records, voor het R1-rapport
 * (gealigneerd op het as-is asielrapport). De medische velden komen uit aparte
 * tabellen (vaccinations/dewormings/behaviorRecords) en worden hier samengevoegd.
 */
export type AnimalReportRow = Animal & {
  lastBehaviorDate: string | null;
  lastVaccinationDate: string | null;
  lastVaccinationByShelter: boolean | null;
  lastDewormingDate: string | null;
  lastFleaTreatmentDate: string | null;
};

export interface AnimalReportResult {
  animals: AnimalReportRow[];
  total: number;
}

/**
 * Verrijkt een lijst dieren met hun laatste vaccinatie, ontworming en
 * gedragsevaluatie. Eén query per tabel (inArray op de dier-ids), daarna in JS
 * gereduceerd tot het meest recente record per dier.
 */
async function enrichWithMedical(rows: Animal[]): Promise<AnimalReportRow[]> {
  const ids = rows.map((a) => a.id);
  if (ids.length === 0) {
    return rows.map((a) => ({
      ...a,
      lastBehaviorDate: null,
      lastVaccinationDate: null,
      lastVaccinationByShelter: null,
      lastDewormingDate: null,
      lastFleaTreatmentDate: null,
    }));
  }

  const [vaxRows, dewRows, behRows] = await Promise.all([
    db
      .select({ animalId: vaccinations.animalId, date: vaccinations.date, givenByShelter: vaccinations.givenByShelter })
      .from(vaccinations)
      .where(inArray(vaccinations.animalId, ids)),
    db
      .select({ animalId: dewormings.animalId, date: dewormings.date, category: dewormings.category })
      .from(dewormings)
      .where(inArray(dewormings.animalId, ids)),
    db
      .select({ animalId: behaviorRecords.animalId, date: behaviorRecords.date })
      .from(behaviorRecords)
      .where(inArray(behaviorRecords.animalId, ids)),
  ]);

  const latestVax = latestByAnimalId(vaxRows);
  // Story 10.31: ontworming en vlooienbehandeling delen de tabel `dewormings`.
  const latestDew = latestByAnimalIdForCategory(dewRows, "ontworming");
  const latestFlea = latestByAnimalIdForCategory(dewRows, "vlooien");
  const latestBeh = latestByAnimalId(behRows);

  return rows.map((a) => ({
    ...a,
    lastBehaviorDate: latestBeh.get(a.id)?.date ?? null,
    lastVaccinationDate: latestVax.get(a.id)?.date ?? null,
    lastVaccinationByShelter: latestVax.get(a.id)?.givenByShelter ?? null,
    lastDewormingDate: latestDew.get(a.id)?.date ?? null,
    lastFleaTreatmentDate: latestFlea.get(a.id)?.date ?? null,
  }));
}

export async function getAnimalReport(
  filters: AnimalReportFilters,
): Promise<AnimalReportResult> {
  const { species, status, kennelId, workflowPhase, page, pageSize } = filters;

  const conditions = [];
  if (species) conditions.push(eq(animals.species, species));
  if (status) conditions.push(eq(animals.status, status));
  if (kennelId) conditions.push(eq(animals.kennelId, kennelId));
  if (workflowPhase) conditions.push(eq(animals.workflowPhase, workflowPhase));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    if (page && pageSize) {
      const results = await db
        .select()
        .from(animals)
        .where(whereClause)
        .orderBy(asc(animals.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(animals)
        .where(whereClause);

      return {
        animals: await enrichWithMedical(results as Animal[]),
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    // No pagination — return all results (used for PDF/CSV export)
    const results = await db
      .select()
      .from(animals)
      .where(whereClause)
      .orderBy(asc(animals.name));

    return {
      animals: await enrichWithMedical(results as Animal[]),
      total: results.length,
    };
  } catch (err) {
    console.error("getAnimalReport query failed:", err);
    return { animals: [], total: 0 };
  }
}

export async function getBehaviorReportByAnimalId(
  animalId: number,
): Promise<BehaviorRecord[]> {
  try {
    const results = await db
      .select()
      .from(behaviorRecords)
      .where(eq(behaviorRecords.animalId, animalId))
      .orderBy(desc(behaviorRecords.date));
    return results as BehaviorRecord[];
  } catch (err) {
    console.error("getBehaviorReportByAnimalId query failed:", err);
    return [];
  }
}

// ==================== R2: Vet Visits Report ====================

export interface VetVisitReportFilters {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  page?: number;
  pageSize?: number;
}

export interface VetVisitReportRow {
  id: number;
  animalId: number;
  animalName: string;
  animalSpecies: string;
  date: string;
  location: string;
  complaints: string | null;
  todo: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  notes: string | null;
}

export interface VetVisitReportResult {
  visits: VetVisitReportRow[];
  total: number;
}

export async function getVetVisitsReport(
  filters: VetVisitReportFilters,
): Promise<VetVisitReportResult> {
  const { dateFrom, dateTo, location, page, pageSize } = filters;

  const conditions = [];
  if (dateFrom) conditions.push(gte(vetVisits.date, dateFrom));
  if (dateTo) conditions.push(lte(vetVisits.date, dateTo));
  if (location) conditions.push(eq(vetVisits.location, location));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const selectFields = {
    id: vetVisits.id,
    animalId: vetVisits.animalId,
    animalName: animals.name,
    animalSpecies: animals.species,
    date: vetVisits.date,
    location: vetVisits.location,
    complaints: vetVisits.complaints,
    todo: vetVisits.todo,
    isCompleted: vetVisits.isCompleted,
    completedAt: vetVisits.completedAt,
    notes: vetVisits.notes,
  };

  try {
    if (page && pageSize) {
      const results = await db
        .select(selectFields)
        .from(vetVisits)
        .innerJoin(animals, eq(vetVisits.animalId, animals.id))
        .where(whereClause)
        .orderBy(desc(vetVisits.date))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vetVisits)
        .where(whereClause);

      return {
        visits: results as VetVisitReportRow[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select(selectFields)
      .from(vetVisits)
      .innerJoin(animals, eq(vetVisits.animalId, animals.id))
      .where(whereClause)
      .orderBy(desc(vetVisits.date));

    return {
      visits: results as VetVisitReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getVetVisitsReport query failed:", err);
    return { visits: [], total: 0 };
  }
}

// ==================== R5: Medication Report ====================

export interface MedicationReportFilters {
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MedicationReportRow {
  id: number;
  animalId: number;
  animalName: string;
  animalSpecies: string;
  medicationName: string;
  dosage: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface MedicationReportResult {
  medications: MedicationReportRow[];
  total: number;
}

export async function getMedicationReport(
  filters: MedicationReportFilters,
): Promise<MedicationReportResult> {
  const { isActive, page, pageSize } = filters;

  const conditions = [];
  if (isActive !== undefined) conditions.push(eq(medications.isActive, isActive));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const selectFields = {
    id: medications.id,
    animalId: medications.animalId,
    animalName: animals.name,
    animalSpecies: animals.species,
    medicationName: medications.medicationName,
    dosage: medications.dosage,
    startDate: medications.startDate,
    endDate: medications.endDate,
    isActive: medications.isActive,
    notes: medications.notes,
  };

  try {
    if (page && pageSize) {
      const results = await db
        .select(selectFields)
        .from(medications)
        .innerJoin(animals, eq(medications.animalId, animals.id))
        .where(whereClause)
        .orderBy(asc(animals.name), desc(medications.startDate))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(medications)
        .where(whereClause);

      return {
        medications: results as MedicationReportRow[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select(selectFields)
      .from(medications)
      .innerJoin(animals, eq(medications.animalId, animals.id))
      .where(whereClause)
      .orderBy(asc(animals.name), desc(medications.startDate));

    return {
      medications: results as MedicationReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getMedicationReport query failed:", err);
    return { medications: [], total: 0 };
  }
}

// ==================== R11: Vet Inspection Reports (filtered) ====================

export interface VetInspectionReportFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface VetInspectionReportResult {
  reports: VetInspectionReport[];
  total: number;
}

export async function getVetInspectionReportsFiltered(
  filters: VetInspectionReportFilters,
): Promise<VetInspectionReportResult> {
  const { dateFrom, dateTo, page, pageSize } = filters;

  const conditions = [];
  if (dateFrom) conditions.push(gte(vetInspectionReports.visitDate, dateFrom));
  if (dateTo) conditions.push(lte(vetInspectionReports.visitDate, dateTo));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    if (page && pageSize) {
      const results = await db
        .select()
        .from(vetInspectionReports)
        .where(whereClause)
        .orderBy(desc(vetInspectionReports.visitDate))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vetInspectionReports)
        .where(whereClause);

      return {
        reports: results as VetInspectionReport[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select()
      .from(vetInspectionReports)
      .where(whereClause)
      .orderBy(desc(vetInspectionReports.visitDate));

    return {
      reports: results as VetInspectionReport[],
      total: results.length,
    };
  } catch (err) {
    console.error("getVetInspectionReportsFiltered query failed:", err);
    return { reports: [], total: 0 };
  }
}

// ==================== R3: Adoption Contracts Report ====================

export interface AdoptionContractReportFilters {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  page?: number;
  pageSize?: number;
}

export interface AdoptionContractReportRow {
  id: number;
  animalName: string;
  animalSpecies: string;
  candidateFirstName: string;
  candidateLastName: string;
  contractDate: string;
  paymentAmount: string;
  paymentMethod: string;
  dogidCatidTransferred: boolean;
  notes: string | null;
}

export interface AdoptionContractReportResult {
  contracts: AdoptionContractReportRow[];
  total: number;
}

export async function getAdoptionContractsReport(
  filters: AdoptionContractReportFilters,
): Promise<AdoptionContractReportResult> {
  const { dateFrom, dateTo, paymentMethod, page, pageSize } = filters;

  const conditions = [];
  if (dateFrom) conditions.push(gte(adoptionContracts.contractDate, dateFrom));
  if (dateTo) conditions.push(lte(adoptionContracts.contractDate, dateTo));
  if (paymentMethod) conditions.push(eq(adoptionContracts.paymentMethod, paymentMethod));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const selectFields = {
    id: adoptionContracts.id,
    animalName: animals.name,
    animalSpecies: animals.species,
    candidateFirstName: adoptionCandidates.firstName,
    candidateLastName: adoptionCandidates.lastName,
    contractDate: adoptionContracts.contractDate,
    paymentAmount: adoptionContracts.paymentAmount,
    paymentMethod: adoptionContracts.paymentMethod,
    dogidCatidTransferred: adoptionContracts.dogidCatidTransferred,
    notes: adoptionContracts.notes,
  };

  try {
    if (page && pageSize) {
      const results = await db
        .select(selectFields)
        .from(adoptionContracts)
        .innerJoin(animals, eq(adoptionContracts.animalId, animals.id))
        .innerJoin(adoptionCandidates, eq(adoptionContracts.candidateId, adoptionCandidates.id))
        .where(whereClause)
        .orderBy(desc(adoptionContracts.contractDate))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(adoptionContracts)
        .innerJoin(animals, eq(adoptionContracts.animalId, animals.id))
        .innerJoin(adoptionCandidates, eq(adoptionContracts.candidateId, adoptionCandidates.id))
        .where(whereClause);

      return {
        contracts: results as AdoptionContractReportRow[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select(selectFields)
      .from(adoptionContracts)
      .innerJoin(animals, eq(adoptionContracts.animalId, animals.id))
      .innerJoin(adoptionCandidates, eq(adoptionContracts.candidateId, adoptionCandidates.id))
      .where(whereClause)
      .orderBy(desc(adoptionContracts.contractDate));

    return {
      contracts: results as AdoptionContractReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getAdoptionContractsReport query failed:", err);
    return { contracts: [], total: 0 };
  }
}

// ==================== R6: Adoptable Animals Report ====================

export interface AdoptableAnimalsReportFilters {
  species?: string;
  page?: number;
  pageSize?: number;
}

export interface AdoptableAnimalsReportResult {
  animals: Animal[];
  total: number;
}

export async function getAdoptableAnimalsReport(
  filters: AdoptableAnimalsReportFilters,
): Promise<AdoptableAnimalsReportResult> {
  const { species, page, pageSize } = filters;

  const conditions = [eq(animals.isAvailableForAdoption, true)];
  if (species) conditions.push(eq(animals.species, species));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  try {
    if (page && pageSize) {
      const results = await db
        .select()
        .from(animals)
        .where(whereClause)
        .orderBy(asc(animals.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(animals)
        .where(whereClause);

      return {
        animals: results as Animal[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select()
      .from(animals)
      .where(whereClause)
      .orderBy(asc(animals.name));

    return {
      animals: results as Animal[],
      total: results.length,
    };
  } catch (err) {
    console.error("getAdoptableAnimalsReport query failed:", err);
    return { animals: [], total: 0 };
  }
}

// ==================== R7: Website Publication Report ====================

export interface WebsitePublicationReportFilters {
  page?: number;
  pageSize?: number;
}

export interface WebsitePublicationReportResult {
  animals: Animal[];
  total: number;
}

export async function getWebsitePublicationReport(
  filters: WebsitePublicationReportFilters,
): Promise<WebsitePublicationReportResult> {
  const { page, pageSize } = filters;

  const whereClause = eq(animals.isOnWebsite, true);

  try {
    if (page && pageSize) {
      const results = await db
        .select()
        .from(animals)
        .where(whereClause)
        .orderBy(asc(animals.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(animals)
        .where(whereClause);

      return {
        animals: results as Animal[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select()
      .from(animals)
      .where(whereClause)
      .orderBy(asc(animals.name));

    return {
      animals: results as Animal[],
      total: results.length,
    };
  } catch (err) {
    console.error("getWebsitePublicationReport query failed:", err);
    return { animals: [], total: 0 };
  }
}

// ==================== R8: Kennel Occupancy Report ====================

export interface KennelOccupancyReportFilters {
  zone?: string;
}

export interface KennelOccupancyReportRow {
  kennelId: number;
  code: string;
  zone: string;
  capacity: number;
  count: number;
}

export interface KennelOccupancyReportResult {
  kennels: KennelOccupancyReportRow[];
  total: number;
}

export async function getKennelOccupancyReport(
  filters: KennelOccupancyReportFilters,
): Promise<KennelOccupancyReportResult> {
  const { zone } = filters;

  const conditions = [eq(kennels.isActive, true)];
  if (zone) conditions.push(eq(kennels.zone, zone));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  try {
    const results = await db
      .select({
        kennelId: kennels.id,
        code: kennels.code,
        zone: kennels.zone,
        capacity: kennels.capacity,
        count: count(animals.id),
      })
      .from(kennels)
      .leftJoin(
        animals,
        sql`${animals.kennelId} = ${kennels.id} AND ${animals.isInShelter} = true`,
      )
      .where(whereClause)
      .groupBy(kennels.id)
      .orderBy(asc(kennels.zone), asc(kennels.code));

    return {
      kennels: results as KennelOccupancyReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getKennelOccupancyReport query failed:", err);
    return { kennels: [], total: 0 };
  }
}

// ==================== R12: IBN Dossiers Report ====================

export interface IBNDossiersReportFilters {
  deadlineFrom?: string;
  deadlineTo?: string;
  page?: number;
  pageSize?: number;
}

export interface IBNDossierReportRow {
  id: number;
  name: string;
  species: string;
  dossierNr: string;
  pvNr: string | null;
  ibnDecisionDeadline: string | null;
  workflowPhase: string | null;
  intakeDate: string | null;
}

export interface IBNDossiersReportResult {
  dossiers: IBNDossierReportRow[];
  total: number;
}

export async function getIBNDossiersReport(
  filters: IBNDossiersReportFilters,
): Promise<IBNDossiersReportResult> {
  const { deadlineFrom, deadlineTo, page, pageSize } = filters;

  const selectFields = {
    id: animals.id,
    name: animals.name,
    species: animals.species,
    dossierNr: animals.dossierNr,
    pvNr: animals.pvNr,
    ibnDecisionDeadline: animals.ibnDecisionDeadline,
    workflowPhase: animals.workflowPhase,
    intakeDate: animals.intakeDate,
  };

  const conditions = [isNotNull(animals.dossierNr)];
  if (deadlineFrom) conditions.push(gte(animals.ibnDecisionDeadline, deadlineFrom));
  if (deadlineTo) conditions.push(lte(animals.ibnDecisionDeadline, deadlineTo));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  try {
    if (page && pageSize) {
      const results = await db
        .select(selectFields)
        .from(animals)
        .where(whereClause)
        .orderBy(asc(animals.ibnDecisionDeadline))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(animals)
        .where(whereClause);

      return {
        dossiers: results as IBNDossierReportRow[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select(selectFields)
      .from(animals)
      .where(whereClause)
      .orderBy(asc(animals.ibnDecisionDeadline));

    return {
      dossiers: results as IBNDossierReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getIBNDossiersReport query failed:", err);
    return { dossiers: [], total: 0 };
  }
}

// ==================== R9: Walk Activity Report ====================

export interface WalkActivityReportFilters {
  dateFrom?: string;
  dateTo?: string;
  walkerId?: number;
  animalId?: number;
  page?: number;
  pageSize?: number;
}

export interface WalkActivityReportRow {
  id: number;
  date: string;
  walkerFirstName: string;
  walkerLastName: string;
  animalName: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  remarks: string | null;
}

export interface WalkActivityReportResult {
  walks: WalkActivityReportRow[];
  total: number;
}

export async function getWalkActivityReport(
  filters: WalkActivityReportFilters,
): Promise<WalkActivityReportResult> {
  const { dateFrom, dateTo, walkerId, animalId, page, pageSize } = filters;

  const conditions = [eq(walks.status, "completed")];
  if (dateFrom) conditions.push(gte(walks.date, dateFrom));
  if (dateTo) conditions.push(lte(walks.date, dateTo));
  if (walkerId) conditions.push(eq(walks.walkerId, walkerId));
  if (animalId) conditions.push(eq(walks.animalId, animalId));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const selectFields = {
    id: walks.id,
    date: walks.date,
    walkerFirstName: walkers.firstName,
    walkerLastName: walkers.lastName,
    animalName: animals.name,
    startTime: walks.startTime,
    endTime: walks.endTime,
    durationMinutes: walks.durationMinutes,
    remarks: walks.remarks,
  };

  try {
    if (page && pageSize) {
      const results = await db
        .select(selectFields)
        .from(walks)
        .innerJoin(walkers, eq(walks.walkerId, walkers.id))
        .innerJoin(animals, eq(walks.animalId, animals.id))
        .where(whereClause)
        .orderBy(desc(walks.date))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(walks)
        .innerJoin(walkers, eq(walks.walkerId, walkers.id))
        .innerJoin(animals, eq(walks.animalId, animals.id))
        .where(whereClause);

      return {
        walks: results as WalkActivityReportRow[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select(selectFields)
      .from(walks)
      .innerJoin(walkers, eq(walks.walkerId, walkers.id))
      .innerJoin(animals, eq(walks.animalId, animals.id))
      .where(whereClause)
      .orderBy(desc(walks.date));

    return {
      walks: results as WalkActivityReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getWalkActivityReport query failed:", err);
    return { walks: [], total: 0 };
  }
}

// ==================== R10: Walker-Animal Pairings Report ====================

export interface WalkerAnimalPairingsReportFilters {
  walkerId?: number;
  animalId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface WalkerAnimalPairingRow {
  walkerId: number;
  walkerFirstName: string;
  walkerLastName: string;
  animalId: number;
  animalName: string;
  walkCount: number;
  lastWalkDate: string;
}

export interface WalkerAnimalPairingsReportResult {
  pairings: WalkerAnimalPairingRow[];
  total: number;
}

export async function getWalkerAnimalPairingsReport(
  filters: WalkerAnimalPairingsReportFilters,
): Promise<WalkerAnimalPairingsReportResult> {
  const { walkerId, animalId, dateFrom, dateTo } = filters;

  const conditions = [eq(walks.status, "completed")];
  if (walkerId) conditions.push(eq(walks.walkerId, walkerId));
  if (animalId) conditions.push(eq(walks.animalId, animalId));
  if (dateFrom) conditions.push(gte(walks.date, dateFrom));
  if (dateTo) conditions.push(lte(walks.date, dateTo));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const selectFields = {
    walkerId: walks.walkerId,
    walkerFirstName: walkers.firstName,
    walkerLastName: walkers.lastName,
    animalId: walks.animalId,
    animalName: animals.name,
    walkCount: count(walks.id),
    lastWalkDate: sql<string>`max(${walks.date})`,
  };

  try {
    const results = await db
      .select(selectFields)
      .from(walks)
      .innerJoin(walkers, eq(walks.walkerId, walkers.id))
      .innerJoin(animals, eq(walks.animalId, animals.id))
      .where(whereClause)
      .groupBy(walks.walkerId, walkers.firstName, walkers.lastName, walks.animalId, animals.name)
      .orderBy(desc(count(walks.id)));

    return {
      pairings: results as WalkerAnimalPairingRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getWalkerAnimalPairingsReport query failed:", err);
    return { pairings: [], total: 0 };
  }
}

// ==================== R13: Workflow Overview Report ====================

export interface WorkflowOverviewReportFilters {
  species?: string;
  workflowPhase?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface WorkflowOverviewReportRow {
  id: number;
  name: string;
  species: string;
  workflowPhase: string | null;
  intakeDate: string | null;
  daysSinceIntake: number | null;
}

export interface WorkflowOverviewReportResult {
  animals: WorkflowOverviewReportRow[];
  total: number;
}

export async function getWorkflowOverviewReport(
  filters: WorkflowOverviewReportFilters,
): Promise<WorkflowOverviewReportResult> {
  const { species, workflowPhase, dateFrom, dateTo, page, pageSize } = filters;

  const conditions = [isNotNull(animals.workflowPhase)];
  if (species) conditions.push(eq(animals.species, species));
  if (workflowPhase) conditions.push(eq(animals.workflowPhase, workflowPhase));
  if (dateFrom) conditions.push(gte(animals.intakeDate, dateFrom));
  if (dateTo) conditions.push(lte(animals.intakeDate, dateTo));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const selectFields = {
    id: animals.id,
    name: animals.name,
    species: animals.species,
    workflowPhase: animals.workflowPhase,
    intakeDate: animals.intakeDate,
    daysSinceIntake: sql<number>`EXTRACT(DAY FROM now() - ${animals.intakeDate}::timestamp)::int`,
  };

  try {
    if (page && pageSize) {
      const results = await db
        .select(selectFields)
        .from(animals)
        .where(whereClause)
        .orderBy(asc(animals.workflowPhase), asc(animals.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(animals)
        .where(whereClause);

      return {
        animals: results as WorkflowOverviewReportRow[],
        total: (totalResult as { count: number }[])[0]?.count ?? 0,
      };
    }

    const results = await db
      .select(selectFields)
      .from(animals)
      .where(whereClause)
      .orderBy(asc(animals.workflowPhase), asc(animals.name));

    return {
      animals: results as WorkflowOverviewReportRow[],
      total: results.length,
    };
  } catch (err) {
    console.error("getWorkflowOverviewReport query failed:", err);
    return { animals: [], total: 0 };
  }
}
