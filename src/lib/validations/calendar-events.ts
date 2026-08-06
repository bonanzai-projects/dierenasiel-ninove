import { z } from "zod";

/**
 * Categorieën van een handmatig kalender-item (fase 2).
 *
 * "evenement" hoort hier sinds story 13.7 NIET meer bij: een evenement ontstaat in
 * de evenementenmodule (met draaiboek, kosten en vrijwilligers) en verschijnt van
 * daaruit op de kalender. Eén plek waar een evenement leeft.
 */
export const CALENDAR_EVENT_CATEGORIES = ["stage", "afstand", "afspraak"] as const;

const optionalTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ongeldig uur (UU:MM)")
  .optional()
  .or(z.literal(""));

export const calendarEventSchema = z
  .object({
    title: z.string().min(1, "Titel is verplicht"),
    category: z.enum(CALENDAR_EVENT_CATEGORIES, { message: "Kies een categorie" }),
    description: z.string().optional(),
    date: z.string().min(1, "Datum is verplicht"),
    endDate: z.string().optional().or(z.literal("")),
    startTime: optionalTime,
    endTime: optionalTime,
    location: z.string().optional(),
    animalId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.date) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Einddatum mag niet vóór de begindatum liggen",
      });
    }
    if (data.endTime && !data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Vul eerst een beginuur in",
      });
    }
    if (data.startTime && data.endTime && !data.endDate && data.endTime < data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Einduur mag niet vóór het beginuur liggen",
      });
    }
  });

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
