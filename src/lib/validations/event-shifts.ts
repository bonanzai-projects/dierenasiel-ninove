import { z } from "zod";

/**
 * Story 13.6 — één vrijwilliger op één post op één dag.
 *
 * De uren mogen ontbreken ("hele dag"), maar een einduur zonder beginuur zegt niets.
 * Een shift over middernacht wordt niet stilzwijgend aanvaard: dan zet je twee lijnen,
 * één per dag — anders klopt het blad van de volgende ochtend niet.
 */
const optionalTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ongeldig uur (UU:MM)")
  .optional()
  .or(z.literal(""));

export const eventShiftSchema = z
  .object({
    eventId: z.coerce.number().int().positive("Ongeldig evenement"),
    date: z.string().min(1, "Dag is verplicht"),
    startTime: optionalTime,
    endTime: optionalTime,
    post: z.string().trim().min(1, "Post is verplicht"),
    personName: z.string().trim().min(1, "Naam is verplicht"),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endTime && !data.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Vul eerst een beginuur in" });
    }
    if (data.startTime && data.endTime && data.endTime < data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Einduur mag niet vóór het beginuur liggen — zet een shift over middernacht als twee lijnen",
      });
    }
  });

export type EventShiftInput = z.infer<typeof eventShiftSchema>;
