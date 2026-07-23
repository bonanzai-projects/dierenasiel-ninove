"use server";

import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getAnimalReport, getMedicationReport, getAdoptionContractsReport, getWebsitePublicationReport, getWalkActivityReport, getWalkerAnimalPairingsReport, getWorkflowOverviewReport, type AnimalReportFilters, type AnimalReportRow, type MedicationReportFilters, type MedicationReportRow, type AdoptionContractReportFilters, type AdoptionContractReportRow, type WalkActivityReportFilters, type WalkActivityReportRow, type WalkerAnimalPairingsReportFilters, type WalkerAnimalPairingRow, type WorkflowOverviewReportFilters, type WorkflowOverviewReportRow } from "@/lib/queries/reports";
import { getCampaignReport, type CampaignReportFilters } from "@/lib/queries/stray-cat-campaigns";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_OUTCOME_LABELS, FIV_FELV_STATUS_LABELS } from "@/lib/constants";
import { speciesLabel, genderLabel, escapeCsvField } from "@/lib/utils";
import { formatDateBE, sterielLabel, vaccinDisplay, redenOpvangDisplay, jaNee, okBlank } from "@/lib/reports/animal-report-format";
import { PHASE_LABELS } from "@/lib/workflow/stepbar";
import type { ActionResult } from "@/types";
import type { Animal } from "@/types";

// R1-rapport — kolommen gealigneerd op het as-is asielrapport (Sven).
function animalToCsvRow(animal: AnimalReportRow): string {
  return [
    escapeCsvField(jaNee(animal.isAvailableForAdoption)),
    escapeCsvField(redenOpvangDisplay(animal.intakeReason, animal.intakeDate)),
    escapeCsvField(formatDateBE(animal.lastBehaviorDate)),
    escapeCsvField(animal.name),
    escapeCsvField(animal.breed ?? ""),
    escapeCsvField(genderLabel(animal.gender)),
    escapeCsvField(sterielLabel(animal.isNeutered, animal.neuteredByShelter)),
    escapeCsvField(formatDateBE(animal.dateOfBirth)),
    escapeCsvField(animal.identificationNr ?? ""),
    escapeCsvField(jaNee(animal.isNewChip)),
    escapeCsvField(animal.passportNr ?? ""),
    escapeCsvField(jaNee(animal.isNewPassport)),
    escapeCsvField(vaccinDisplay(animal.lastVaccinationDate, animal.lastVaccinationByShelter)),
    escapeCsvField(formatDateBE(animal.lastDewormingDate)),
    escapeCsvField(formatDateBE(animal.lastFleaTreatmentDate)),
    escapeCsvField(okBlank(animal.isOnWebsite)),
    escapeCsvField(okBlank(animal.isAvailableForAdoption)),
  ].join(",");
}

interface ExportFilters {
  species?: string;
  status?: string;
  kennelId?: number;
  workflowPhase?: string;
}

export async function exportAnimalReportCsv(
  filters: ExportFilters,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  // Query without pagination — get all results for export
  const queryFilters: AnimalReportFilters = {};
  if (filters.species) queryFilters.species = filters.species;
  if (filters.status) queryFilters.status = filters.status;
  if (filters.kennelId) queryFilters.kennelId = filters.kennelId;
  if (filters.workflowPhase) queryFilters.workflowPhase = filters.workflowPhase;

  const { animals } = await getAnimalReport(queryFilters);

  const header = "Ter adoptie,Reden opvang,Gedragseval.,Naam,Ras,M/V,Steriel,Geb.datum,Chip,Nwe chip,Paspoort,Nw paspoort,Vaccin,Ontworming,Vlooien,Website,Adopteer";
  const rows = animals.map(animalToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

// ==================== R5: Medication Report CSV ====================

function medicationToCsvRow(med: MedicationReportRow): string {
  return [
    escapeCsvField(med.animalName),
    escapeCsvField(speciesLabel(med.animalSpecies)),
    escapeCsvField(med.medicationName),
    escapeCsvField(med.dosage),
    med.startDate,
    med.endDate ?? "",
    med.isActive ? "Actief" : "Afgerond",
    escapeCsvField(med.notes ?? ""),
  ].join(",");
}

interface MedicationExportFilters {
  isActive?: boolean;
}

export async function exportMedicationReportCsv(
  filters: MedicationExportFilters,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const queryFilters: MedicationReportFilters = {};
  if (filters.isActive !== undefined) queryFilters.isActive = filters.isActive;

  const { medications } = await getMedicationReport(queryFilters);

  const header = "Dier,Soort,Medicatie,Dosering,Startdatum,Einddatum,Status,Opmerkingen";
  const rows = medications.map(medicationToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

// ==================== R3: Adoption Contracts CSV ====================

function contractToCsvRow(contract: AdoptionContractReportRow): string {
  return [
    escapeCsvField(contract.animalName),
    escapeCsvField(speciesLabel(contract.animalSpecies)),
    escapeCsvField(`${contract.candidateFirstName} ${contract.candidateLastName}`),
    contract.contractDate,
    contract.paymentAmount,
    escapeCsvField(contract.paymentMethod),
    contract.dogidCatidTransferred ? "Ja" : "Nee",
  ].join(",");
}

interface AdoptionContractExportFilters {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
}

export async function exportAdoptionContractsCsv(
  filters: AdoptionContractExportFilters,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const queryFilters: AdoptionContractReportFilters = {};
  if (filters.dateFrom) queryFilters.dateFrom = filters.dateFrom;
  if (filters.dateTo) queryFilters.dateTo = filters.dateTo;
  if (filters.paymentMethod) queryFilters.paymentMethod = filters.paymentMethod;

  const { contracts } = await getAdoptionContractsReport(queryFilters);

  const header = "Dier,Soort,Adoptant,Datum,Bedrag,Betaalwijze,DogID/CatID overgedragen";
  const rows = contracts.map(contractToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

// ==================== R7: Website Publication CSV ====================

function websiteAnimalToCsvRow(animal: Animal): string {
  return [
    escapeCsvField(animal.name),
    escapeCsvField(speciesLabel(animal.species)),
    escapeCsvField(animal.breed ?? ""),
    escapeCsvField(genderLabel(animal.gender)),
    escapeCsvField(animal.identificationNr ?? ""),
    escapeCsvField(animal.shortDescription ?? ""),
  ].join(",");
}

export async function exportWebsitePublicationCsv(): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const { animals } = await getWebsitePublicationReport({});

  const header = "Naam,Soort,Ras,Geslacht,Chipnr,Korte beschrijving";
  const rows = animals.map(websiteAnimalToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

// ==================== R9: Walk Activity CSV ====================

function walkActivityToCsvRow(walk: WalkActivityReportRow): string {
  return [
    escapeCsvField(walk.date),
    escapeCsvField(`${walk.walkerFirstName} ${walk.walkerLastName}`),
    escapeCsvField(walk.animalName),
    escapeCsvField(walk.startTime),
    escapeCsvField(walk.endTime ?? ""),
    walk.durationMinutes?.toString() ?? "",
    escapeCsvField(walk.remarks ?? ""),
  ].join(",");
}

export async function exportWalkActivityCsv(
  filters: Omit<WalkActivityReportFilters, "page" | "pageSize">,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "U bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const { walks } = await getWalkActivityReport({ ...filters });

  const header = "Datum,Wandelaar,Hond,Start,Einde,Duur (min),Opmerkingen";
  const rows = walks.map(walkActivityToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

// ==================== R10: Walker-Animal Pairings CSV ====================

function pairingToCsvRow(pairing: WalkerAnimalPairingRow): string {
  return [
    escapeCsvField(`${pairing.walkerFirstName} ${pairing.walkerLastName}`),
    escapeCsvField(pairing.animalName),
    pairing.walkCount.toString(),
    escapeCsvField(pairing.lastWalkDate),
  ].join(",");
}

export async function exportWalkerAnimalPairingsCsv(
  filters: WalkerAnimalPairingsReportFilters,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "U bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const { pairings } = await getWalkerAnimalPairingsReport(filters);

  const header = "Wandelaar,Hond,Aantal wandelingen,Laatste wandeling";
  const rows = pairings.map(pairingToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

// ==================== R13: Workflow Overview CSV ====================

function workflowRowToCsvRow(row: WorkflowOverviewReportRow): string {
  return [
    escapeCsvField(row.name),
    escapeCsvField(speciesLabel(row.species)),
    escapeCsvField(PHASE_LABELS[row.workflowPhase ?? ""] ?? row.workflowPhase ?? "-"),
    escapeCsvField(row.intakeDate ?? ""),
    row.daysSinceIntake?.toString() ?? "",
  ].join(",");
}

export async function exportWorkflowOverviewCsv(
  filters: Omit<WorkflowOverviewReportFilters, "page" | "pageSize">,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "U bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const { animals } = await getWorkflowOverviewReport({ ...filters });

  const header = "Naam,Soort,Fase,Intakedatum,Dagen in asiel";
  const rows = animals.map(workflowRowToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}

function campaignToCsvRow(campaign: import("@/types").StrayCatCampaign): string {
  const statusLbl = CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS] ?? campaign.status;
  const fivLabel = campaign.fivStatus ? (FIV_FELV_STATUS_LABELS[campaign.fivStatus as keyof typeof FIV_FELV_STATUS_LABELS] ?? campaign.fivStatus) : "";
  const felvLabel = campaign.felvStatus ? (FIV_FELV_STATUS_LABELS[campaign.felvStatus as keyof typeof FIV_FELV_STATUS_LABELS] ?? campaign.felvStatus) : "";
  const outcomeLabel = campaign.outcome ? (CAMPAIGN_OUTCOME_LABELS[campaign.outcome as keyof typeof CAMPAIGN_OUTCOME_LABELS] ?? campaign.outcome) : "";

  return [
    escapeCsvField(campaign.requestDate),
    escapeCsvField(campaign.municipality),
    escapeCsvField(campaign.address),
    escapeCsvField(statusLbl),
    escapeCsvField(campaign.cageDeploymentDate ?? ""),
    escapeCsvField(campaign.cageNumbers ?? ""),
    escapeCsvField(campaign.inspectionDate ?? ""),
    escapeCsvField(campaign.catDescription ?? ""),
    escapeCsvField(campaign.vetName ?? ""),
    escapeCsvField(fivLabel),
    escapeCsvField(felvLabel),
    escapeCsvField(outcomeLabel),
    escapeCsvField(campaign.remarks ?? ""),
  ].join(",");
}

export async function exportStrayCatCampaignsCsv(
  filters: CampaignReportFilters,
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "U bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "report:generate")) {
    return { success: false, error: "Onvoldoende rechten voor rapport export." };
  }

  const { campaigns } = await getCampaignReport(filters);

  const header = "Datum verzoek,Gemeente,Adres,Status,Datum kooi-uitzetting,Kooi nummers,Inspectiedatum,Kat beschrijving,Dierenarts,FIV,FeLV,Uitkomst,Opmerkingen";
  const rows = campaigns.map(campaignToCsvRow);
  const csv = [header, ...rows].join("\n");

  return { success: true, data: csv };
}
