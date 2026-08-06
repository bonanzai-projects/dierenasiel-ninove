import { z } from "zod";

/**
 * Story 13.9 — de evaluatie van één evenement.
 *
 * Alles mag leeg blijven: een evaluatie groeit. Wat ingevuld is, moet wél kloppen —
 * een negatief bezoekersaantal bestaat niet, en 0 betekent hier "niemand", niet
 * "niet gemeten"; daarvoor laat je het veld gewoon leeg.
 */
const aantal = (veld: string) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(0, `Ongeldig aantal (${veld})`)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

export const eventEvaluationSchema = z.object({
  eventId: z.coerce.number().int().positive("Ongeldig evenement"),
  visitors: aantal("bezoekers"),
  ticketsUsed: aantal("kaarten"),
  paidPlates: aantal("borden"),
  wentWell: z.string().trim().optional(),
  couldBeBetter: z.string().trim().optional(),
  agreements: z.string().trim().optional(),
});

export type EventEvaluationInput = z.infer<typeof eventEvaluationSchema>;
