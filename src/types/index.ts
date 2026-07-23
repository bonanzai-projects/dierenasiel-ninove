import type { animals, animalTraits, animalAttachments, neglectReports, behaviorRecords, feedingPlans, vaccinations, dewormings, vetVisits, operations, medications, medicationLogs, animalTodos, vetInspectionReports, adoptionCandidates, kennismakingen, adoptionContracts, postAdoptionFollowups, kennels, newsArticles, contactSubmissions, kennelSponsors, pages, users, auditLogs, walkers, walks, shelterSettings, animalWorkflowHistory, mailingLists, mailingSends, mailingSendRecipients, strayCatCampaigns, strayCatCampaignInspections, strayCatCampaignMedicalInspections, strayCatCampaignPhotos, municipalityLogos, veterinaryDiagnoses, blacklistEntries, cages } from "@/lib/db/schema";
import type { GuardWarning } from "@/lib/workflow/guards";
import { BACKOFFICE_ROLES } from "@/lib/constants";

// Standard return type for all Server Actions
// `values`: de ingevoerde formulierwaarden, teruggegeven bij een fout zodat het
// formulier ze opnieuw kan tonen (React 19 reset uncontrolled velden na een
// action, dus zonder dit lopen ze leeg — zie IntakeForm, Sven-feedback 2026-07-24).
export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error?: string; fieldErrors?: Record<string, string[]>; warning?: string; values?: Record<string, string> };

// Backoffice roles — derived from BACKOFFICE_ROLES constant (single source of truth)
export type BackofficeRole = (typeof BACKOFFICE_ROLES)[number];

export type Animal = typeof animals.$inferSelect;
export type NewAnimal = typeof animals.$inferInsert;

export type AnimalAttachment = typeof animalAttachments.$inferSelect;
export type NewAnimalAttachment = typeof animalAttachments.$inferInsert;

export type NeglectReport = typeof neglectReports.$inferSelect;
export type NewNeglectReport = typeof neglectReports.$inferInsert;

export type BehaviorRecord = typeof behaviorRecords.$inferSelect;
export type NewBehaviorRecord = typeof behaviorRecords.$inferInsert;

export type FeedingPlan = typeof feedingPlans.$inferSelect;
export type NewFeedingPlan = typeof feedingPlans.$inferInsert;

export interface FeedingQuestionnaire {
  dieetType: string;
  merk: string;
  hoeveelheid: string;
  frequentie: string;
  allergieen: string[];
  specifiekeBehoeften: string;
}

export type Vaccination = typeof vaccinations.$inferSelect;
export type NewVaccination = typeof vaccinations.$inferInsert;

export type Deworming = typeof dewormings.$inferSelect;
export type NewDeworming = typeof dewormings.$inferInsert;

export type AnimalTraitsRecord = typeof animalTraits.$inferSelect;

export type VetVisit = typeof vetVisits.$inferSelect;
export type NewVetVisit = typeof vetVisits.$inferInsert;

export type Operation = typeof operations.$inferSelect;
export type NewOperation = typeof operations.$inferInsert;

export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type NewMedicationLog = typeof medicationLogs.$inferInsert;

export type AnimalTodo = typeof animalTodos.$inferSelect;
export type NewAnimalTodo = typeof animalTodos.$inferInsert;

export interface MedicalAlert {
  category: "vaccination" | "medication";
  animalId: number;
  animalName: string;
  label: string;
  dueDate: string;
}

export interface BehaviorChecklist {
  // Sectie 1: Gedrag tegenover de verzorgers (ja/nee/null)
  verzorgers_algemeenAgressief: boolean | null;
  verzorgers_agressiefSpeelgoed: boolean | null;
  verzorgers_agressiefVoederkom: boolean | null;
  verzorgers_agressiefMand: boolean | null;
  verzorgers_gemakkelijkWandeling: boolean | null;
  verzorgers_speeltGraag: boolean | null;
  verzorgers_andere: string | null;
  // Sectie 2: Gedrag tegenover andere honden (ja/nee/null)
  honden_algemeenAgressief: boolean | null;
  honden_agressiefSpeelgoed: boolean | null;
  honden_agressiefVoederkom: boolean | null;
  honden_agressiefMand: boolean | null;
  honden_speeltGraag: boolean | null;
  honden_andere: string | null;
}

export type Kennel = typeof kennels.$inferSelect;
export type NewKennel = typeof kennels.$inferInsert;

export type NewsArticle = typeof newsArticles.$inferSelect;
export type NewNewsArticle = typeof newsArticles.$inferInsert;

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type NewContactSubmission = typeof contactSubmissions.$inferInsert;

export type KennelSponsor = typeof kennelSponsors.$inferSelect;
export type NewKennelSponsor = typeof kennelSponsors.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type VetInspectionReport = typeof vetInspectionReports.$inferSelect;
export type NewVetInspectionReport = typeof vetInspectionReports.$inferInsert;

export interface TreatedAnimalEntry {
  animalId: number;
  animalName: string;
  species: string;
  chipNr: string | null;
  diagnosis: string;
  treatment: string;
}

export interface EuthanizedAnimalEntry {
  animalId: number;
  animalName: string;
  species: string;
  chipNr: string | null;
  reason: string;
}

export interface AbnormalBehaviorEntry {
  animalId: number;
  animalName: string;
  species: string;
  chipNr: string | null;
  description: string;
}

export type AdoptionCandidate = typeof adoptionCandidates.$inferSelect;
export type NewAdoptionCandidate = typeof adoptionCandidates.$inferInsert;

export interface QuestionnaireAnswers {
  woonsituatie: string;        // "huis_met_tuin" | "appartement" | "boerderij" | "andere"
  tuinOmheind: boolean | null; // Alleen relevant bij tuin
  eerderHuisdieren: boolean;
  huidigeHuisdieren: string;   // Vrij tekstveld
  kinderenInHuis: string;      // "geen" | "0_5" | "6_12" | "12_plus"
  werkSituatie: string;        // "voltijds_thuis" | "deeltijds" | "voltijds_buitenshuis"
  uurAlleen: string;           // Geschat aantal uur per dag alleen
  ervaring: string;            // Vrij tekstveld — ervaring met dieren
  motivatie: string;           // Vrij tekstveld — waarom dit dier
  opmerkingen: string;         // Vrij tekstveld — extra opmerkingen
}

export type Kennismaking = typeof kennismakingen.$inferSelect;
export type NewKennismaking = typeof kennismakingen.$inferInsert;

export type AdoptionContract = typeof adoptionContracts.$inferSelect;
export type NewAdoptionContract = typeof adoptionContracts.$inferInsert;

export type PostAdoptionFollowup = typeof postAdoptionFollowups.$inferSelect;
export type NewPostAdoptionFollowup = typeof postAdoptionFollowups.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type Walker = typeof walkers.$inferSelect;
export type NewWalker = typeof walkers.$inferInsert;

export type Walk = typeof walks.$inferSelect;
export type NewWalk = typeof walks.$inferInsert;

export interface ActiveWalkForAdmin {
  id: number;
  walkerId: number;
  animalId: number;
  date: string;
  startTime: string;
  status: string;
  walkerFirstName: string;
  walkerLastName: string;
  walkerPhone: string;
  animalName: string;
}

export interface WalkHistoryEntry {
  id: number;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  remarks: string | null;
  status: string;
  walkerFirstName: string;
  walkerLastName: string;
  animalName: string;
}

export interface WalkStats {
  totalWalks: number;
  avgDurationMinutes: number | null;
  topCompanion: string | null;
}

export type AnimalWorkflowHistory = typeof animalWorkflowHistory.$inferSelect;
export type NewAnimalWorkflowHistory = typeof animalWorkflowHistory.$inferInsert;

export interface WorkflowHistoryEntry {
  id: number;
  animalId: number;
  fromPhase: string | null;
  toPhase: string;
  changedBy: number;
  changeReason: string | null;
  autoActionsTriggered: unknown;
  createdAt: Date;
  changedByName: string | null;
}

export type TransitionActionResult =
  | { success: true; data: { fromPhase: string; toPhase: string; guardsOverridden?: boolean } }
  | { success: false; error: string; guardWarnings?: GuardWarning[] };

export type ShelterSetting = typeof shelterSettings.$inferSelect;
export type NewShelterSetting = typeof shelterSettings.$inferInsert;

export type MailingList = typeof mailingLists.$inferSelect;
export type NewMailingList = typeof mailingLists.$inferInsert;

export type MailingSend = typeof mailingSends.$inferSelect;
export type NewMailingSend = typeof mailingSends.$inferInsert;

export type MailingSendRecipient = typeof mailingSendRecipients.$inferSelect;
export type NewMailingSendRecipient = typeof mailingSendRecipients.$inferInsert;

export interface GdprSearchResult {
  type: "candidate" | "walker";
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  anonymisedAt: Date | null;
}

export interface MailingRecipient {
  candidateId: number;
  firstName: string;
  lastName: string;
  email: string;
  animalName: string;
  contractDate: string;
}

export type StrayCatCampaign = typeof strayCatCampaigns.$inferSelect;
export type NewStrayCatCampaign = typeof strayCatCampaigns.$inferInsert;

export type StrayCatCampaignInspection = typeof strayCatCampaignInspections.$inferSelect;
export type NewStrayCatCampaignInspection = typeof strayCatCampaignInspections.$inferInsert;

export type MunicipalityLogo = typeof municipalityLogos.$inferSelect;
export type NewMunicipalityLogo = typeof municipalityLogos.$inferInsert;

export type VeterinaryDiagnosis = typeof veterinaryDiagnoses.$inferSelect;
export type NewVeterinaryDiagnosis = typeof veterinaryDiagnoses.$inferInsert;

export type Cage = typeof cages.$inferSelect;
export type NewCage = typeof cages.$inferInsert;

export type StrayCatCampaignPhoto = typeof strayCatCampaignPhotos.$inferSelect;
export type NewStrayCatCampaignPhoto = typeof strayCatCampaignPhotos.$inferInsert;

export type StrayCatCampaignMedicalInspection = typeof strayCatCampaignMedicalInspections.$inferSelect;
export type NewStrayCatCampaignMedicalInspection = typeof strayCatCampaignMedicalInspections.$inferInsert;

export type BlacklistEntry = typeof blacklistEntries.$inferSelect;
export type NewBlacklistEntry = typeof blacklistEntries.$inferInsert;
