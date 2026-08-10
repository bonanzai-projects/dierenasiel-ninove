import { z } from "zod";
import { CAMPAIGN_OUTCOMES, FIV_FELV_STATUSES } from "@/lib/constants";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

const dateString = z.string()
  .min(1, "Datum is verplicht")
  .regex(dateRegex, "Ongeldige datumnotatie (verwacht JJJJ-MM-DD)")
  .refine(isValidDate, "Ongeldige datum");

export const createCampaignSchema = z.object({
  requestDate: dateString,
  municipality: z.string().trim().min(1, "Gemeente is verplicht").max(200, "Gemeente mag max 200 tekens zijn"),
  address: z.string().trim().min(1, "Adres is verplicht"),
  remarks: z.string().optional().default(""),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignBasicsSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  requestDate: dateString,
  municipality: z.string().trim().min(1, "Gemeente is verplicht").max(200, "Gemeente mag max 200 tekens zijn"),
  address: z.string().trim().min(1, "Adres is verplicht"),
  remarks: z.string().optional().default(""),
});

export type UpdateCampaignBasicsInput = z.infer<typeof updateCampaignBasicsSchema>;

// Auto-save semantiek: zowel datum als kooien-lijst zijn optioneel zodat
// elke onchange (incl. leeg laten) bewaard kan worden zonder klassieke
// 'verplicht'-validatie. Datum mag leeg of een geldig JJJJ-MM-DD zijn.
export const deployCagesSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  cageDeploymentDate: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || (dateRegex.test(v) && isValidDate(v)),
      "Ongeldige datumnotatie",
    ),
  cageNumbers: z
    .string()
    .trim()
    .max(100, "Kooiennummers mag max 100 tekens zijn")
    .optional()
    .default(""),
});

export type DeployCagesInput = z.infer<typeof deployCagesSchema>;

export const registerInspectionSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  inspectionDate: dateString,
  catDescription: z.string().trim().min(1, "Katbeschrijving is verplicht"),
  vetName: z.string().trim().min(1, "Dierenarts is verplicht").max(200, "Dierenarts mag max 200 tekens zijn"),
  cageAtVet: z.string().max(100, "Kooi bij dierenarts mag max 100 tekens zijn").optional().default(""),
});

export type RegisterInspectionInput = z.infer<typeof registerInspectionSchema>;

export const completeCampaignSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  fivStatus: z.enum(FIV_FELV_STATUSES, { message: "Ongeldige FIV-status" }),
  felvStatus: z.enum(FIV_FELV_STATUSES, { message: "Ongeldige FeLV-status" }),
  outcome: z.enum(CAMPAIGN_OUTCOMES, { message: "Ongeldige uitkomst" }),
  remarks: z.string().optional().default(""),
});

export type CompleteCampaignInput = z.infer<typeof completeCampaignSchema>;

export const linkAnimalSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  linkedAnimalId: z.coerce.number().positive("Ongeldig dier-ID"),
});

export type LinkAnimalInput = z.infer<typeof linkAnimalSchema>;

// Story 10.9: add-only log entry (geen edit/delete in schietversie).
export const addInspectionSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  inspectionDate: dateString,
  wasSuccessful: z.coerce.boolean().default(false),
  // Story 10.60: kooien waar die ronde vangst was. Leeg wanneer de campagne
  // nog geen kooien ingevuld heeft; dan telt `wasSuccessful` zoals vroeger.
  caughtCages: z.array(z.string().trim().max(20)).optional().default([]),
  notes: z.string().trim().max(1000, "Notities mag max 1000 tekens zijn").optional().default(""),
});

export type AddInspectionInput = z.infer<typeof addInspectionSchema>;

// Medische inspecties (1 per kat) — CRUD.
export const createMedicalInspectionSchema = z.object({
  campaignId: z.coerce.number().positive("Ongeldig campagne-ID"),
  inspectionDate: dateString,
  vetName: z.string().trim().max(200, "Dierenarts mag max 200 tekens zijn").optional().default(""),
  catDescription: z.string().trim().max(2000, "Katbeschrijving mag max 2000 tekens zijn").optional().default(""),
  cageAtVet: z.string().trim().max(100, "Kooi bij dierenarts mag max 100 tekens zijn").optional().default(""),
  fivStatus: z.enum(FIV_FELV_STATUSES).optional().nullable(),
  felvStatus: z.enum(FIV_FELV_STATUSES).optional().nullable(),
  outcome: z.enum(CAMPAIGN_OUTCOMES).optional().nullable(),
  notes: z.string().trim().max(2000, "Notities mag max 2000 tekens zijn").optional().default(""),
});

export type CreateMedicalInspectionInput = z.infer<typeof createMedicalInspectionSchema>;

export const updateMedicalInspectionSchema = createMedicalInspectionSchema
  .omit({ campaignId: true })
  .extend({ id: z.coerce.number().positive("Ongeldig ID") });

export type UpdateMedicalInspectionInput = z.infer<typeof updateMedicalInspectionSchema>;
