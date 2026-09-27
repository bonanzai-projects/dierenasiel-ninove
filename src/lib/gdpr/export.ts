import {
  getAdoptionCandidateForGdpr,
  getWalkerForGdpr,
  getKennismakingenForExport,
  getContractsForExport,
  getFollowupsForExport,
  getWalksForExport,
  getAnimalNameById,
} from "@/lib/queries/gdpr";
import { escapeCsvField } from "@/lib/utils";

// === Data collection ===

export interface CandidateExportData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  animalId: number;
  questionnaireAnswers: Record<string, unknown>;
  category: string | null;
  status: string;
  notes: string | null;
  anonymisedAt: Date | null;
  createdAt: Date;
  animalName: string | null;
  kennismakingen: Array<Record<string, unknown>>;
  contracts: Array<Record<string, unknown>>;
  followups: Array<Record<string, unknown>>;
}

export interface WalkerExportData {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  allergies: string | null;
  childrenWalkAlong: boolean;
  /** Story 10.77: welke versie van het wandelreglement, en wanneer aanvaard. */
  regulationsVersion: string | null;
  regulationsAcceptedAt: Date | null;
  barcode: string | null;
  photoUrl: string | null;
  isApproved: boolean;
  status: string;
  walkCount: number;
  isWalkingClubMember: boolean;
  anonymisedAt: Date | null;
  createdAt: Date;
  walks: Array<Record<string, unknown> & { animalName: string | null }>;
}

/**
 * Collect all data for a candidate's GDPR export.
 */
export async function getCandidateExportData(
  candidateId: number,
): Promise<CandidateExportData | null> {
  const candidate = await getAdoptionCandidateForGdpr(candidateId);
  if (!candidate) return null;

  const animalName = candidate.animalId ? await getAnimalNameById(candidate.animalId) : (candidate as Record<string, unknown>).requestedAnimalName as string || "Onbekend";
  const kennismakingen = await getKennismakingenForExport(candidateId);
  const contracts = await getContractsForExport(candidateId);

  const followups: Array<Record<string, unknown>> = [];
  for (const contract of contracts) {
    const contractFollowups = await getFollowupsForExport(contract.id);
    followups.push(...contractFollowups);
  }

  return {
    ...candidate,
    animalName,
    kennismakingen,
    contracts,
    followups,
  } as CandidateExportData;
}

/**
 * Collect all data for a walker's GDPR export.
 */
export async function getWalkerExportData(
  walkerId: number,
): Promise<WalkerExportData | null> {
  const walker = await getWalkerForGdpr(walkerId);
  if (!walker) return null;

  const rawWalks = await getWalksForExport(walkerId);

  const walks = await Promise.all(
    rawWalks.map(async (walk) => {
      const animalName = await getAnimalNameById(walk.animalId);
      return { ...walk, animalName };
    }),
  );

  return { ...walker, walks } as WalkerExportData;
}

// === JSON formatting ===

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Format candidate data as structured JSON for GDPR export.
 */
export function formatCandidateExportJson(data: CandidateExportData): string {
  const output = {
    exportDatum: new Date().toISOString(),
    type: "adoptiekandidaat",
    persoonsgegevens: {
      voornaam: data.firstName,
      achternaam: data.lastName,
      email: data.email,
      telefoon: data.phone,
      adres: data.address,
    },
    aanvraag: {
      dier: data.animalName,
      vragenlijst: data.questionnaireAnswers,
      categorie: data.category,
      status: data.status,
      opmerkingen: data.notes,
      aangemaakt: str(data.createdAt),
    },
    kennismakingen: data.kennismakingen.map((k) => ({
      datum: str(k.scheduledAt),
      locatie: k.location,
      status: k.status,
      uitkomst: k.outcome,
      opmerkingen: k.notes,
    })),
    contracten: data.contracts.map((c) => ({
      datum: str(c.contractDate),
      bedrag: c.paymentAmount,
      betaalmethode: c.paymentMethod,
      dogidCatidOvergedragen: c.dogidCatidTransferred,
      opmerkingen: c.notes,
    })),
    opvolgingen: data.followups.map((f) => ({
      type: f.followupType,
      datum: str(f.date),
      status: f.status,
      opmerkingen: f.notes,
    })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format walker data as structured JSON for GDPR export.
 */
export function formatWalkerExportJson(data: WalkerExportData): string {
  const output = {
    exportDatum: new Date().toISOString(),
    type: "wandelaar",
    persoonsgegevens: {
      voornaam: data.firstName,
      achternaam: data.lastName,
      email: data.email,
      telefoon: data.phone,
      adres: data.address,
      geboortedatum: data.dateOfBirth,
      allergieen: data.allergies,
      kinderenMee: data.childrenWalkAlong,
      fotoUrl: data.photoUrl,
    },
    profiel: {
      barcode: data.barcode,
      goedgekeurd: data.isApproved,
      status: data.status,
      aantalWandelingen: data.walkCount,
      wandelclubLid: data.isWalkingClubMember,
      aangemaakt: str(data.createdAt),
      wandelreglement: {
        versie: data.regulationsVersion,
        aanvaardOp: data.regulationsAcceptedAt ? str(data.regulationsAcceptedAt) : null,
      },
    },
    wandelingen: data.walks.map((w) => ({
      datum: str(w.date),
      startTijd: w.startTime,
      eindTijd: w.endTime,
      duurMinuten: w.durationMinutes,
      dier: w.animalName,
      opmerkingen: w.remarks,
      status: w.status,
    })),
  };

  return JSON.stringify(output, null, 2);
}

// === CSV formatting ===

function csvRow(fields: string[]): string {
  return fields.map((f) => escapeCsvField(str(f))).join(",");
}

/**
 * Format candidate data as CSV for GDPR export.
 */
export function formatCandidateExportCsv(data: CandidateExportData): string {
  const lines: string[] = [];

  lines.push("# Persoonsgegevens");
  lines.push("Veld,Waarde");
  lines.push(csvRow(["Voornaam", data.firstName]));
  lines.push(csvRow(["Achternaam", data.lastName]));
  lines.push(csvRow(["Email", data.email]));
  lines.push(csvRow(["Telefoon", data.phone]));
  lines.push(csvRow(["Adres", data.address]));

  lines.push("");
  lines.push("# Aanvraag");
  lines.push("Veld,Waarde");
  lines.push(csvRow(["Dier", data.animalName ?? ""]));
  lines.push(csvRow(["Categorie", data.category ?? ""]));
  lines.push(csvRow(["Status", data.status]));
  lines.push(csvRow(["Opmerkingen", data.notes ?? ""]));
  lines.push(csvRow(["Vragenlijst", JSON.stringify(data.questionnaireAnswers)]));
  lines.push(csvRow(["Aangemaakt", str(data.createdAt)]));

  if (data.kennismakingen.length > 0) {
    lines.push("");
    lines.push("# Kennismakingen");
    lines.push("Datum,Locatie,Status,Uitkomst,Opmerkingen");
    for (const k of data.kennismakingen) {
      lines.push(csvRow([str(k.scheduledAt), str(k.location), str(k.status), str(k.outcome), str(k.notes)]));
    }
  }

  if (data.contracts.length > 0) {
    lines.push("");
    lines.push("# Contracten");
    lines.push("Datum,Bedrag,Betaalmethode,DogID/CatID overgedragen,Opmerkingen");
    for (const c of data.contracts) {
      lines.push(csvRow([str(c.contractDate), str(c.paymentAmount), str(c.paymentMethod), str(c.dogidCatidTransferred), str(c.notes)]));
    }
  }

  if (data.followups.length > 0) {
    lines.push("");
    lines.push("# Opvolgingen");
    lines.push("Type,Datum,Status,Opmerkingen");
    for (const f of data.followups) {
      lines.push(csvRow([str(f.followupType), str(f.date), str(f.status), str(f.notes)]));
    }
  }

  return lines.join("\n");
}

/**
 * Format walker data as CSV for GDPR export.
 */
export function formatWalkerExportCsv(data: WalkerExportData): string {
  const lines: string[] = [];

  lines.push("# Persoonsgegevens");
  lines.push("Veld,Waarde");
  lines.push(csvRow(["Voornaam", data.firstName]));
  lines.push(csvRow(["Achternaam", data.lastName]));
  lines.push(csvRow(["Email", data.email]));
  lines.push(csvRow(["Telefoon", data.phone]));
  lines.push(csvRow(["Adres", data.address]));
  lines.push(csvRow(["Geboortedatum", data.dateOfBirth]));
  lines.push(csvRow(["Allergieën", data.allergies ?? ""]));
  lines.push(csvRow(["Kinderen mee", data.childrenWalkAlong ? "Ja" : "Nee"]));
  lines.push(csvRow(["Foto URL", data.photoUrl ?? ""]));

  lines.push("");
  lines.push("# Profiel");
  lines.push("Veld,Waarde");
  lines.push(csvRow(["Barcode", data.barcode ?? ""]));
  lines.push(csvRow(["Goedgekeurd", data.isApproved ? "Ja" : "Nee"]));
  lines.push(csvRow(["Status", data.status]));
  lines.push(csvRow(["Aantal wandelingen", String(data.walkCount)]));
  lines.push(csvRow(["Wandelclub lid", data.isWalkingClubMember ? "Ja" : "Nee"]));
  lines.push(csvRow(["Aangemaakt", str(data.createdAt)]));
  lines.push(csvRow(["Wandelreglement versie", str(data.regulationsVersion)]));
  lines.push(csvRow(["Wandelreglement aanvaard op", str(data.regulationsAcceptedAt)]));

  lines.push("");
  lines.push("# Wandelingen");
  lines.push("Datum,Start,Einde,Duur (min),Dier,Opmerkingen,Status");
  for (const w of data.walks) {
    lines.push(csvRow([str(w.date), str(w.startTime), str(w.endTime), str(w.durationMinutes), str(w.animalName), str(w.remarks), str(w.status)]));
  }

  return lines.join("\n");
}
