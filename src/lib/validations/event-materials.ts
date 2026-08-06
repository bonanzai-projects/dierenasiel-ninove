import { z } from "zod";
import { MATERIAL_ORIGIN_KEYS } from "@/lib/events/materials";

/**
 * Story 13.11 — één regel van de materiaallijst.
 *
 * Een aantal mag ontbreken ("een frigo" telt niemand), maar als het er staat, is het
 * minstens 1: "0 tafels" is geen materiaal.
 */
export const eventMaterialSchema = z.object({
  eventId: z.coerce.number().int().positive("Ongeldig evenement"),
  name: z.string().trim().min(1, "Omschrijving is verplicht"),
  quantity: z
    .union([z.literal(""), z.coerce.number().int().positive("Ongeldig aantal")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  origin: z.string().refine((v) => MATERIAL_ORIGIN_KEYS.includes(v), "Kies waar het vandaan komt"),
  supplier: z.string().trim().optional(),
  arranged: z.boolean().optional().default(false),
  returned: z.boolean().optional().default(false),
  notes: z.string().trim().optional(),
});

export type EventMaterialInput = z.infer<typeof eventMaterialSchema>;
