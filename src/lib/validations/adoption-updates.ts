import { z } from "zod";
import { todayInBrussels } from "./animal-weights";
import { ADOPTION_UPDATE_CHANNEL_VALUES, ADOPTION_UPDATE_MAX_FILES } from "@/lib/adoption-updates/rules";

/**
 * Story 10.74 — een bericht na adoptie. De bestanden komen daarna apart binnen
 * (upload-route); `fileCount` zegt hoeveel er volgen, zodat een bericht met
 * enkel foto's geen tekst nodig heeft.
 */

const leegIsNull = (v: string | undefined) => (v ? v : null);

export const adoptionUpdateSchema = z
  .object({
    animalId: z.number().int().positive(),
    receivedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een geldige datum.")
      .refine((d) => d <= todayInBrussels(), "De datum kan niet in de toekomst liggen."),
    channel: z.enum(ADOPTION_UPDATE_CHANNEL_VALUES, { error: "Kies een kanaal." }),
    sender: z.string().trim().max(200, "Naam is te lang (max. 200 tekens).").optional().transform(leegIsNull),
    message: z.string().trim().max(5000, "Het bericht is te lang (max. 5000 tekens).").optional().transform(leegIsNull),
    fileCount: z
      .number()
      .int()
      .min(0)
      .max(ADOPTION_UPDATE_MAX_FILES, `Hooguit ${ADOPTION_UPDATE_MAX_FILES} bestanden per bericht.`),
  })
  .refine((d) => d.message !== null || d.fileCount > 0, {
    message: "Schrijf een bericht of voeg minstens één bestand toe.",
    path: ["message"],
  });

/** Wat de browser stuurt; de server valideert het met `adoptionUpdateSchema`. */
export interface AdoptionUpdateInput {
  animalId: number;
  receivedOn: string;
  channel: string;
  sender?: string;
  message?: string;
  fileCount: number;
}
