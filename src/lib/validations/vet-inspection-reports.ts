import { z } from "zod";

export const treatedAnimalSchema = z.object({
  animalId: z.coerce.number().positive("Ongeldig dier-ID"),
  animalName: z.string().min(1, "Naam is verplicht"),
  species: z.string().min(1, "Soort is verplicht"),
  chipNr: z.string().nullable(),
  diagnosis: z.string().min(1, "Diagnose is verplicht"),
  treatment: z.string().min(1, "Behandeling is verplicht"),
});

export const euthanizedAnimalSchema = z.object({
  animalId: z.coerce.number().positive("Ongeldig dier-ID"),
  animalName: z.string().min(1, "Naam is verplicht"),
  species: z.string().min(1, "Soort is verplicht"),
  chipNr: z.string().nullable(),
  reason: z.string().min(1, "Reden is verplicht"),
});

export const abnormalBehaviorSchema = z.object({
  animalId: z.coerce.number().positive("Ongeldig dier-ID"),
  animalName: z.string().min(1, "Naam is verplicht"),
  species: z.string().min(1, "Soort is verplicht"),
  chipNr: z.string().nullable(),
  description: z.string().min(1, "Beschrijving is verplicht"),
});

export const createVetInspectionReportSchema = z.object({
  visitDate: z.string().min(1, "Bezoekdatum is verplicht").regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldig datumformaat"),
  vetName: z.string().min(1, "Naam dierenarts is verplicht").max(200, "Naam mag max. 200 tekens zijn"),
  // Story 10.81 — dierenarts uit de lijst; leeg = "Andere" (enkel de naam).
  veterinarianId: z.number().int().positive("Ongeldige dierenarts").nullable().optional(),
  animalsTreated: z.array(treatedAnimalSchema).default([]),
  animalsEuthanized: z.array(euthanizedAnimalSchema).default([]),
  abnormalBehavior: z.array(abnormalBehaviorSchema).default([]),
  recommendations: z.string().max(5000, "Aanbevelingen mogen max. 5000 tekens zijn").optional(),
});

export const signReportSchema = z.object({
  id: z.coerce.number().positive("Ongeldig rapport-ID"),
});

export type CreateVetInspectionReportInput = z.infer<typeof createVetInspectionReportSchema>;
