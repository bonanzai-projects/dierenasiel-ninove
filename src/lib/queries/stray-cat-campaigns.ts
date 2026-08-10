import { db } from "@/lib/db";
import { strayCatCampaigns, strayCatCampaignInspections, strayCatCampaignInspectionCages, strayCatCampaignAttachments, strayCatCampaignPhotos, strayCatCampaignMedicalInspections, animals, users } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, isNotNull, ne, inArray } from "drizzle-orm";
import { CAMPAIGN_STATUSES } from "@/lib/constants";
import type { StrayCatCampaign, StrayCatCampaignInspection, StrayCatCampaignMedicalInspection } from "@/types";
import type { SQL } from "drizzle-orm";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(value: string): boolean {
  return DATE_REGEX.test(value) && !isNaN(Date.parse(value));
}
const MAX_PAGE_SIZE = 100;

export interface CampaignListOptions {
  municipality?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface CampaignListResult {
  campaigns: StrayCatCampaign[];
  total: number;
}

export async function getCampaignById(id: number) {
  const rows = await db
    .select()
    .from(strayCatCampaigns)
    .where(eq(strayCatCampaigns.id, id));
  return rows[0] ?? null;
}

export async function getAllCampaigns() {
  return db
    .select()
    .from(strayCatCampaigns)
    .orderBy(desc(strayCatCampaigns.requestDate));
}

export async function getCampaignsForAdmin(
  options: CampaignListOptions = {},
): Promise<CampaignListResult> {
  const { municipality, status, dateFrom, dateTo, page = 1, pageSize = 25 } = options;
  const safePageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

  const conditions: SQL[] = [];
  if (municipality) conditions.push(eq(strayCatCampaigns.municipality, municipality));
  if (status && (CAMPAIGN_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(strayCatCampaigns.status, status));
  }
  if (dateFrom && isValidDate(dateFrom)) conditions.push(gte(strayCatCampaigns.requestDate, dateFrom));
  if (dateTo && isValidDate(dateTo)) conditions.push(lte(strayCatCampaigns.requestDate, dateTo));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [results, totalResult] = await Promise.all([
      db
        .select()
        .from(strayCatCampaigns)
        .where(whereClause)
        .orderBy(desc(strayCatCampaigns.requestDate))
        .limit(safePageSize)
        .offset((page - 1) * safePageSize),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(strayCatCampaigns)
        .where(whereClause),
    ]);

    return {
      campaigns: results as StrayCatCampaign[],
      total: (totalResult as { count: number }[])[0]?.count ?? 0,
    };
  } catch (err) {
    console.error("getCampaignsForAdmin query failed:", err);
    return { campaigns: [], total: 0 };
  }
}

export async function getDistinctMunicipalities(): Promise<string[]> {
  try {
    const rows = await db
      .selectDistinct({ municipality: strayCatCampaigns.municipality })
      .from(strayCatCampaigns)
      .orderBy(strayCatCampaigns.municipality);
    return rows.map((r) => r.municipality);
  } catch (err) {
    console.error("getDistinctMunicipalities query failed:", err);
    return [];
  }
}

export interface CampaignReportFilters {
  municipality?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CampaignReportStats {
  total: number;
  completedCampaigns: number;
  fivPositive: number;
  fivTested: number;
  fivPercentage: number;
  felvPositive: number;
  felvTested: number;
  felvPercentage: number;
  outcomes: Record<string, number>;
}

export interface CampaignReportResult {
  campaigns: StrayCatCampaign[];
  stats: CampaignReportStats;
}

export async function getCampaignReport(
  filters: CampaignReportFilters = {},
): Promise<CampaignReportResult> {
  const { municipality, status, dateFrom, dateTo } = filters;

  const conditions: SQL[] = [];
  if (municipality) conditions.push(eq(strayCatCampaigns.municipality, municipality));
  if (status && (CAMPAIGN_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(strayCatCampaigns.status, status));
  }
  if (dateFrom && isValidDate(dateFrom)) conditions.push(gte(strayCatCampaigns.requestDate, dateFrom));
  if (dateTo && isValidDate(dateTo)) conditions.push(lte(strayCatCampaigns.requestDate, dateTo));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const campaigns = (await db
      .select()
      .from(strayCatCampaigns)
      .where(whereClause)
      .orderBy(desc(strayCatCampaigns.requestDate))) as StrayCatCampaign[];

    const total = campaigns.length;
    const completedCampaigns = campaigns.filter((c) => c.status === "afgerond").length;
    const fivPositive = campaigns.filter((c) => c.fivStatus === "positief").length;
    const fivTested = campaigns.filter((c) => c.fivStatus !== null).length;
    const felvPositive = campaigns.filter((c) => c.felvStatus === "positief").length;
    const felvTested = campaigns.filter((c) => c.felvStatus !== null).length;

    const outcomes: Record<string, number> = {};
    for (const c of campaigns) {
      if (c.outcome) {
        outcomes[c.outcome] = (outcomes[c.outcome] || 0) + 1;
      }
    }

    return {
      campaigns,
      stats: {
        total,
        completedCampaigns,
        fivPositive,
        fivTested,
        fivPercentage: fivTested > 0 ? Math.round((fivPositive / fivTested) * 100) : 0,
        felvPositive,
        felvTested,
        felvPercentage: felvTested > 0 ? Math.round((felvPositive / felvTested) * 100) : 0,
        outcomes,
      },
    };
  } catch (err) {
    console.error("getCampaignReport query failed:", err);
    return {
      campaigns: [],
      stats: {
        total: 0,
        completedCampaigns: 0,
        fivPositive: 0,
        fivTested: 0,
        fivPercentage: 0,
        felvPositive: 0,
        felvTested: 0,
        felvPercentage: 0,
        outcomes: {},
      },
    };
  }
}

export async function getCatsAvailableForLinking() {
  return db
    .select({ id: animals.id, name: animals.name })
    .from(animals)
    .where(
      and(
        eq(animals.species, "kat"),
        eq(animals.isInShelter, true),
      ),
    );
}


/**
 * Geeft een map {kooinummer -> campaignId} van kooinummers die momenteel in gebruik
 * zijn in een lopende campagne (status != 'afgerond'). Gebruikt door Story 10.7 om
 * het picker-UI en server-side validatie te voeden.
 */
export async function getOccupiedCageNumbers(excludeCampaignId?: number): Promise<Record<string, number>> {
  const conditions = [
    ne(strayCatCampaigns.status, 'afgerond'),
    isNotNull(strayCatCampaigns.cageNumbers),
  ];
  if (excludeCampaignId !== undefined) {
    conditions.push(ne(strayCatCampaigns.id, excludeCampaignId));
  }
  const rows = await db
    .select({ id: strayCatCampaigns.id, cageNumbers: strayCatCampaigns.cageNumbers })
    .from(strayCatCampaigns)
    .where(and(...conditions));
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (!row.cageNumbers) continue;
    for (const num of row.cageNumbers.split(',').map((s) => s.trim()).filter(Boolean)) {
      map[num] = row.id;
    }
  }
  return map;
}


/**
 * Top N actieve zwerfkat-campagnes (status != 'afgerond'), gesorteerd op
 * requestDate desc. Gebruikt door het dashboard-widget (Story 10.8).
 */
export async function getActiveStrayCatCampaigns(limit = 10): Promise<StrayCatCampaign[]> {
  try {
    const rows = await db
      .select()
      .from(strayCatCampaigns)
      .where(ne(strayCatCampaigns.status, 'afgerond'))
      .orderBy(desc(strayCatCampaigns.requestDate))
      .limit(limit);
    return rows as StrayCatCampaign[];
  } catch (err) {
    console.error('getActiveStrayCatCampaigns query failed:', err);
    return [];
  }
}


/**
 * Inspectie-log entries voor een campagne (Story 10.9), nieuwste eerst.
 */
export interface InspectionWithCages extends StrayCatCampaignInspection {
  /** Naam van wie de ronde registreerde — opgehaald, niet mee opgeslagen. */
  recordedByName: string | null;
  /** Eén rij per uitgezette kooi. Leeg bij inspecties van vóór story 10.60. */
  cages: { cageCode: string; caught: boolean }[];
}

export async function getInspectionsForCampaign(campaignId: number): Promise<InspectionWithCages[]> {
  try {
    const rows = await db
      .select({
        inspection: strayCatCampaignInspections,
        recordedByName: users.name,
      })
      .from(strayCatCampaignInspections)
      .leftJoin(users, eq(strayCatCampaignInspections.recordedBy, users.id))
      .where(eq(strayCatCampaignInspections.campaignId, campaignId))
      .orderBy(desc(strayCatCampaignInspections.inspectionDate), desc(strayCatCampaignInspections.id));

    if (rows.length === 0) return [];

    const cageRows = await db
      .select()
      .from(strayCatCampaignInspectionCages)
      .where(
        inArray(
          strayCatCampaignInspectionCages.inspectionId,
          rows.map((r) => r.inspection.id),
        ),
      )
      .orderBy(strayCatCampaignInspectionCages.id);

    const perInspection = new Map<number, { cageCode: string; caught: boolean }[]>();
    for (const cage of cageRows) {
      const list = perInspection.get(cage.inspectionId) ?? [];
      list.push({ cageCode: cage.cageCode, caught: cage.caught });
      perInspection.set(cage.inspectionId, list);
    }

    return rows.map((r) => ({
      ...r.inspection,
      recordedByName: r.recordedByName ?? null,
      cages: perInspection.get(r.inspection.id) ?? [],
    }));
  } catch (err) {
    console.error('getInspectionsForCampaign query failed:', err);
    return [];
  }
}

export interface CampaignAttachment {
  id: number;
  campaignId: number;
  blobUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: Date;
}

/**
 * .eml-attachments per campagne (Story 10.17), nieuwste eerst.
 */
export async function getCampaignAttachments(campaignId: number): Promise<CampaignAttachment[]> {
  try {
    const rows = await db
      .select()
      .from(strayCatCampaignAttachments)
      .where(eq(strayCatCampaignAttachments.campaignId, campaignId))
      .orderBy(desc(strayCatCampaignAttachments.uploadedAt));
    return rows as CampaignAttachment[];
  } catch (err) {
    console.error('getCampaignAttachments query failed:', err);
    return [];
  }
}

export interface CampaignPhoto {
  id: number;
  campaignId: number;
  blobUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: Date;
}

/**
 * Foto's per zwerfkat-campagne (meervoud), nieuwste eerst.
 */
export async function getCampaignPhotos(campaignId: number): Promise<CampaignPhoto[]> {
  try {
    const rows = await db
      .select()
      .from(strayCatCampaignPhotos)
      .where(eq(strayCatCampaignPhotos.campaignId, campaignId))
      .orderBy(desc(strayCatCampaignPhotos.uploadedAt));
    return rows as CampaignPhoto[];
  } catch (err) {
    console.error('getCampaignPhotos query failed:', err);
    return [];
  }
}

export async function getCampaignPhotoById(id: number): Promise<CampaignPhoto | null> {
  try {
    const rows = await db
      .select()
      .from(strayCatCampaignPhotos)
      .where(eq(strayCatCampaignPhotos.id, id))
      .limit(1);
    return (rows[0] as CampaignPhoto) ?? null;
  } catch (err) {
    console.error('getCampaignPhotoById query failed:', err);
    return null;
  }
}

/**
 * Medische inspecties per campagne (1 rij per kat), nieuwste eerst.
 */
export interface MedicalInspectionWithRecorder extends StrayCatCampaignMedicalInspection {
  /** Naam van wie de inspectie registreerde. */
  recordedByName: string | null;
}

export async function getMedicalInspectionsForCampaign(
  campaignId: number,
): Promise<MedicalInspectionWithRecorder[]> {
  try {
    const rows = await db
      .select({
        inspection: strayCatCampaignMedicalInspections,
        recordedByName: users.name,
      })
      .from(strayCatCampaignMedicalInspections)
      .leftJoin(users, eq(strayCatCampaignMedicalInspections.recordedBy, users.id))
      .where(eq(strayCatCampaignMedicalInspections.campaignId, campaignId))
      .orderBy(desc(strayCatCampaignMedicalInspections.inspectionDate), desc(strayCatCampaignMedicalInspections.id));
    return rows.map((r) => ({ ...r.inspection, recordedByName: r.recordedByName ?? null }));
  } catch (err) {
    console.error('getMedicalInspectionsForCampaign query failed:', err);
    return [];
  }
}

export async function getMedicalInspectionById(
  id: number,
): Promise<StrayCatCampaignMedicalInspection | null> {
  try {
    const rows = await db
      .select()
      .from(strayCatCampaignMedicalInspections)
      .where(eq(strayCatCampaignMedicalInspections.id, id))
      .limit(1);
    return (rows[0] as StrayCatCampaignMedicalInspection) ?? null;
  } catch (err) {
    console.error('getMedicalInspectionById query failed:', err);
    return null;
  }
}
