"use server";

import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { strayCatCampaigns, strayCatCampaignInspections, strayCatCampaignMedicalInspections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCampaignById, getOccupiedCageNumbers, getMedicalInspectionById } from "@/lib/queries/stray-cat-campaigns";
import { getMunicipalityLogoByName } from "@/lib/queries/municipality-logos";
import { CAMPAIGN_STATUSES } from "@/lib/constants";
import { geocodeAddress, type GeocodeResult } from "@/lib/maps/geocode";
import {
  createCampaignSchema,
  updateCampaignBasicsSchema,
  deployCagesSchema,
  registerInspectionSchema,
  completeCampaignSchema,
  linkAnimalSchema,
  addInspectionSchema,
  createMedicalInspectionSchema,
  updateMedicalInspectionSchema,
} from "@/lib/validations/stray-cat-campaigns";
import type { ActionResult } from "@/types";

const REVALIDATE_PATH = "/beheerder/dieren/zwerfkattenbeleid";

/**
 * Story 10.56: zoek het adres één keer op en bewaar de coördinaten.
 * Vindt het register niets, dan blijven de velden leeg en valt de kaart terug
 * op de oude zoekterm — opslaan mag hier nooit op stuklopen.
 */
async function geocodeKolommen(address: string, municipality: string) {
  const treffer = await geocodeAddress(address, municipality);
  return {
    latitude: treffer ? String(treffer.lat) : null,
    longitude: treffer ? String(treffer.lng) : null,
    geocodedAddress: treffer?.formattedAddress || null,
    geocodeMatch: treffer?.matchType ?? null,
    geocodedAt: new Date(),
  };
}

/**
 * Waarschuwing voor de gebruiker wanneer het adres niet hard bevestigd is.
 * Bewust niet geëxporteerd: in een "use server"-bestand mag enkel een async
 * functie naar buiten (Next behandelt elke export als server-actie).
 */
function geocodeWaarschuwing(treffer: Pick<GeocodeResult, "matchType"> | null): string | undefined {
  if (!treffer) {
    return "Dit adres is niet teruggevonden in het Vlaamse adressenregister. Controleer of het klopt — het kaartje toont dan enkel een ruwe zoekopdracht.";
  }
  if (treffer.matchType !== "huisnummer") {
    return "Het huisnummer is niet teruggevonden; het kaartje toont de straat of de gemeente.";
  }
  return undefined;
}

async function requireAuth(): Promise<
  | { success: true; session: { userId: number; role: string } }
  | { success: false; error: string }
> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };
  if (!hasPermission(session.role, "stray_cat:write"))
    return { success: false, error: "Onvoldoende rechten" };
  return { success: true, session };
}

export async function createCampaignAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ id: number }>> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    // Story 10.18: auto-link logo waar naam (case-insensitive) overeenkomt met gemeente.
    const matchedLogo = await getMunicipalityLogoByName(parsed.data.municipality);

    const ligging = await geocodeKolommen(parsed.data.address, parsed.data.municipality);

    const rows = await db
      .insert(strayCatCampaigns)
      .values({
        requestDate: parsed.data.requestDate,
        municipality: parsed.data.municipality,
        address: parsed.data.address,
        remarks: parsed.data.remarks || null,
        status: "open",
        municipalityLogoId: matchedLogo?.id ?? null,
        ...ligging,
      })
      .returning({ id: strayCatCampaigns.id });

    const campaignId = rows[0].id;

    await logAudit(
      "stray_cat_campaign.created",
      "stray_cat_campaign",
      campaignId,
      null,
      { municipality: parsed.data.municipality, address: parsed.data.address },
    );

    revalidatePath(REVALIDATE_PATH);
    return {
      success: true,
      data: { id: campaignId },
      message: geocodeWaarschuwing(ligging.geocodeMatch ? { matchType: ligging.geocodeMatch as GeocodeResult["matchType"] } : null),
    };
  } catch (error) {
    console.error("createCampaignAction failed:", error);
    return { success: false, error: "Campagne aanmaken mislukt. Probeer opnieuw." };
  }
}

export async function updateCampaignBasicsAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = updateCampaignBasicsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await getCampaignById(parsed.data.campaignId);
    if (!existing) return { success: false, error: "Campagne niet gevonden" };

    // Auto-link logo via naam-match (consistent met createCampaignAction).
    const matchedLogo = await getMunicipalityLogoByName(parsed.data.municipality);

    // Alleen opnieuw opzoeken wanneer het adres of de gemeente wijzigde.
    const adresGewijzigd =
      existing.address !== parsed.data.address || existing.municipality !== parsed.data.municipality;
    const ligging = adresGewijzigd
      ? await geocodeKolommen(parsed.data.address, parsed.data.municipality)
      : null;

    await db
      .update(strayCatCampaigns)
      .set({
        requestDate: parsed.data.requestDate,
        municipality: parsed.data.municipality,
        address: parsed.data.address,
        remarks: parsed.data.remarks || null,
        municipalityLogoId: matchedLogo?.id ?? null,
        ...(ligging ?? {}),
      })
      .where(eq(strayCatCampaigns.id, parsed.data.campaignId));

    await logAudit(
      "stray_cat_campaign.updated",
      "stray_cat_campaign",
      parsed.data.campaignId,
      {
        requestDate: existing.requestDate,
        municipality: existing.municipality,
        address: existing.address,
        remarks: existing.remarks,
        municipalityLogoId: existing.municipalityLogoId,
      },
      {
        requestDate: parsed.data.requestDate,
        municipality: parsed.data.municipality,
        address: parsed.data.address,
        remarks: parsed.data.remarks,
        municipalityLogoId: matchedLogo?.id ?? null,
      },
    );

    revalidatePath(REVALIDATE_PATH);
    revalidatePath(`${REVALIDATE_PATH}/${parsed.data.campaignId}`);
    return {
      success: true,
      data: undefined,
      message: ligging
        ? geocodeWaarschuwing(ligging.geocodeMatch ? { matchType: ligging.geocodeMatch as GeocodeResult["matchType"] } : null)
        : undefined,
    };
  } catch (error) {
    console.error("updateCampaignBasicsAction failed:", error);
    return { success: false, error: "Verzoekgegevens bijwerken mislukt. Probeer opnieuw." };
  }
}

// Story 10.18: koppel een gemeente-logo aan een campagne (of ontkoppel met null).
export async function setCampaignLogoAction(
  campaignId: number,
  logoId: number | null,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return { success: false, error: "Ongeldig campagne-ID" };
  }
  if (logoId !== null && (!Number.isInteger(logoId) || logoId <= 0)) {
    return { success: false, error: "Ongeldig logo-ID" };
  }

  try {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };

    await db
      .update(strayCatCampaigns)
      .set({ municipalityLogoId: logoId })
      .where(eq(strayCatCampaigns.id, campaignId));

    await logAudit(
      "stray_cat_campaign.updated",
      "stray_cat_campaign",
      campaignId,
      { municipalityLogoId: campaign.municipalityLogoId },
      { municipalityLogoId: logoId },
    );

    revalidatePath(REVALIDATE_PATH);
    revalidatePath(`${REVALIDATE_PATH}/${campaignId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("setCampaignLogoAction failed:", error);
    return { success: false, error: "Logo koppelen mislukt. Probeer opnieuw." };
  }
}

export async function deployCagesAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = deployCagesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const campaign = await getCampaignById(parsed.data.campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };

    // Story 10.7: kooinummers mogen niet reeds in een andere lopende campagne gebruikt worden.
    const requestedCages = parsed.data.cageNumbers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const occupied = await getOccupiedCageNumbers(parsed.data.campaignId);
    for (const num of requestedCages) {
      if (occupied[num]) {
        return {
          success: false,
          error: `Kooi ${num} is al in gebruik in campagne #${occupied[num]}.`,
        };
      }
    }

    const nextDeploymentDate = parsed.data.cageDeploymentDate || null;
    const nextCageNumbers = parsed.data.cageNumbers || null;

    await db
      .update(strayCatCampaigns)
      .set({
        cageDeploymentDate: nextDeploymentDate,
        cageNumbers: nextCageNumbers,
      })
      .where(eq(strayCatCampaigns.id, parsed.data.campaignId));

    await logAudit(
      "stray_cat_campaign.cages_deployed",
      "stray_cat_campaign",
      parsed.data.campaignId,
      {
        cageDeploymentDate: campaign.cageDeploymentDate,
        cageNumbers: campaign.cageNumbers,
      },
      {
        cageDeploymentDate: nextDeploymentDate,
        cageNumbers: nextCageNumbers,
      },
    );

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deployCagesAction failed:", error);
    return { success: false, error: "Kooi-uitzetting registreren mislukt. Probeer opnieuw." };
  }
}

export async function registerInspectionAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = registerInspectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const campaign = await getCampaignById(parsed.data.campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };

    await db
      .update(strayCatCampaigns)
      .set({
        inspectionDate: parsed.data.inspectionDate,
        catDescription: parsed.data.catDescription,
        vetName: parsed.data.vetName,
        cageAtVet: parsed.data.cageAtVet || null,
      })
      .where(eq(strayCatCampaigns.id, parsed.data.campaignId));

    await logAudit(
      "stray_cat_campaign.inspection_registered",
      "stray_cat_campaign",
      parsed.data.campaignId,
      {
        inspectionDate: campaign.inspectionDate,
        vetName: campaign.vetName,
        catDescription: campaign.catDescription,
        cageAtVet: campaign.cageAtVet,
      },
      {
        inspectionDate: parsed.data.inspectionDate,
        vetName: parsed.data.vetName,
        catDescription: parsed.data.catDescription,
        cageAtVet: parsed.data.cageAtVet,
      },
    );

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("registerInspectionAction failed:", error);
    return { success: false, error: "Inspectie registreren mislukt. Probeer opnieuw." };
  }
}

export async function completeCampaignAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = completeCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const campaign = await getCampaignById(parsed.data.campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };

    await db
      .update(strayCatCampaigns)
      .set({
        fivStatus: parsed.data.fivStatus,
        felvStatus: parsed.data.felvStatus,
        outcome: parsed.data.outcome,
        remarks: parsed.data.remarks ?? campaign.remarks,
      })
      .where(eq(strayCatCampaigns.id, parsed.data.campaignId));

    await logAudit(
      "stray_cat_campaign.completed",
      "stray_cat_campaign",
      parsed.data.campaignId,
      {
        fivStatus: campaign.fivStatus,
        felvStatus: campaign.felvStatus,
        outcome: campaign.outcome,
      },
      {
        fivStatus: parsed.data.fivStatus,
        felvStatus: parsed.data.felvStatus,
        outcome: parsed.data.outcome,
      },
    );

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("completeCampaignAction failed:", error);
    return { success: false, error: "Medische resultaten opslaan mislukt. Probeer opnieuw." };
  }
}

export async function setCampaignStatusAction(
  campaignId: number,
  status: string,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return { success: false, error: "Ongeldig campagne-ID" };
  }
  if (!(CAMPAIGN_STATUSES as readonly string[]).includes(status)) {
    return { success: false, error: "Ongeldige status" };
  }

  try {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };
    if (campaign.status === status) {
      return { success: true, data: undefined };
    }

    await db
      .update(strayCatCampaigns)
      .set({ status })
      .where(eq(strayCatCampaigns.id, campaignId));

    await logAudit(
      "stray_cat_campaign.status_changed",
      "stray_cat_campaign",
      campaignId,
      { status: campaign.status },
      { status },
    );

    revalidatePath(REVALIDATE_PATH);
    revalidatePath(`${REVALIDATE_PATH}/${campaignId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("setCampaignStatusAction failed:", err);
    return { success: false, error: "Status wijzigen mislukt. Probeer opnieuw." };
  }
}

export async function linkAnimalAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = linkAnimalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const campaign = await getCampaignById(parsed.data.campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };
    if (campaign.outcome !== "geadopteerd")
      return { success: false, error: "Alleen campagnes met uitkomst 'geadopteerd' kunnen aan een dier gekoppeld worden" };

    await db
      .update(strayCatCampaigns)
      .set({ linkedAnimalId: parsed.data.linkedAnimalId })
      .where(eq(strayCatCampaigns.id, parsed.data.campaignId));

    await logAudit(
      "stray_cat_campaign.animal_linked",
      "stray_cat_campaign",
      parsed.data.campaignId,
      { linkedAnimalId: campaign.linkedAnimalId },
      { linkedAnimalId: parsed.data.linkedAnimalId },
    );

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("linkAnimalAction failed:", error);
    return { success: false, error: "Dier koppelen mislukt. Probeer opnieuw." };
  }
}

/**
 * Story 10.9: log-entry toevoegen voor een inspectiebezoek (kan succesvol of leeg zijn).
 * Wijzigt de campagne-status NIET — puur een audit-log.
 */
export async function addInspectionAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = addInspectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const campaign = await getCampaignById(parsed.data.campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };

    const [record] = await db
      .insert(strayCatCampaignInspections)
      .values({
        campaignId: parsed.data.campaignId,
        inspectionDate: parsed.data.inspectionDate,
        wasSuccessful: parsed.data.wasSuccessful,
        notes: parsed.data.notes || null,
      })
      .returning();

    await logAudit(
      "stray_cat_campaign.inspection_log_added",
      "stray_cat_campaign",
      parsed.data.campaignId,
      null,
      { inspectionId: record.id, inspectionDate: record.inspectionDate, wasSuccessful: record.wasSuccessful },
    );

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("addInspectionAction failed:", error);
    return { success: false, error: "Inspectie-log toevoegen mislukt. Probeer opnieuw." };
  }
}

// --- Medische inspecties (1 per kat) ---

export async function createMedicalInspectionAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ id: number }>> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = createMedicalInspectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const campaign = await getCampaignById(parsed.data.campaignId);
    if (!campaign) return { success: false, error: "Campagne niet gevonden" };

    const inserted = await db
      .insert(strayCatCampaignMedicalInspections)
      .values({
        campaignId: parsed.data.campaignId,
        inspectionDate: parsed.data.inspectionDate,
        vetName: parsed.data.vetName || null,
        catDescription: parsed.data.catDescription || null,
        cageAtVet: parsed.data.cageAtVet || null,
        fivStatus: parsed.data.fivStatus ?? null,
        felvStatus: parsed.data.felvStatus ?? null,
        outcome: parsed.data.outcome ?? null,
        notes: parsed.data.notes || null,
      })
      .returning({ id: strayCatCampaignMedicalInspections.id });

    const id = inserted[0]?.id;

    await logAudit(
      "stray_cat_campaign.medical_inspection_created",
      "stray_cat_campaign_medical_inspection",
      id,
      null,
      {
        campaignId: parsed.data.campaignId,
        inspectionDate: parsed.data.inspectionDate,
        vetName: parsed.data.vetName,
        outcome: parsed.data.outcome,
      },
    );

    revalidatePath(REVALIDATE_PATH);
    revalidatePath(`${REVALIDATE_PATH}/${parsed.data.campaignId}`);
    return { success: true, data: { id } };
  } catch (err) {
    console.error("createMedicalInspectionAction failed:", err);
    return { success: false, error: "Medische inspectie aanmaken mislukt. Probeer opnieuw." };
  }
}

export async function updateMedicalInspectionAction(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = updateMedicalInspectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Ongeldige invoer", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await getMedicalInspectionById(parsed.data.id);
    if (!existing) return { success: false, error: "Medische inspectie niet gevonden" };

    await db
      .update(strayCatCampaignMedicalInspections)
      .set({
        inspectionDate: parsed.data.inspectionDate,
        vetName: parsed.data.vetName || null,
        catDescription: parsed.data.catDescription || null,
        cageAtVet: parsed.data.cageAtVet || null,
        fivStatus: parsed.data.fivStatus ?? null,
        felvStatus: parsed.data.felvStatus ?? null,
        outcome: parsed.data.outcome ?? null,
        notes: parsed.data.notes || null,
      })
      .where(eq(strayCatCampaignMedicalInspections.id, parsed.data.id));

    await logAudit(
      "stray_cat_campaign.medical_inspection_updated",
      "stray_cat_campaign_medical_inspection",
      parsed.data.id,
      {
        inspectionDate: existing.inspectionDate,
        vetName: existing.vetName,
        outcome: existing.outcome,
      },
      {
        inspectionDate: parsed.data.inspectionDate,
        vetName: parsed.data.vetName,
        outcome: parsed.data.outcome,
      },
    );

    revalidatePath(REVALIDATE_PATH);
    revalidatePath(`${REVALIDATE_PATH}/${existing.campaignId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("updateMedicalInspectionAction failed:", err);
    return { success: false, error: "Medische inspectie bijwerken mislukt. Probeer opnieuw." };
  }
}

export async function deleteMedicalInspectionAction(
  id: number,
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: auth.error };

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: "Ongeldig ID" };
  }

  try {
    const existing = await getMedicalInspectionById(id);
    if (!existing) return { success: false, error: "Medische inspectie niet gevonden" };

    await db
      .delete(strayCatCampaignMedicalInspections)
      .where(eq(strayCatCampaignMedicalInspections.id, id));

    await logAudit(
      "stray_cat_campaign.medical_inspection_deleted",
      "stray_cat_campaign_medical_inspection",
      id,
      {
        campaignId: existing.campaignId,
        inspectionDate: existing.inspectionDate,
        vetName: existing.vetName,
      },
      null,
    );

    revalidatePath(REVALIDATE_PATH);
    revalidatePath(`${REVALIDATE_PATH}/${existing.campaignId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("deleteMedicalInspectionAction failed:", err);
    return { success: false, error: "Medische inspectie verwijderen mislukt. Probeer opnieuw." };
  }
}
