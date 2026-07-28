import { z } from "zod";
import { EVENT_STATUS_KEYS, EVENT_TYPE_KEYS } from "@/lib/events/types";

const optionalTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ongeldig uur (UU:MM)")
  .optional()
  .or(z.literal(""));

export const eventSchema = z
  .object({
    name: z.string().min(1, "Naam is verplicht"),
    type: z.string().refine((v) => EVENT_TYPE_KEYS.includes(v), "Kies een type"),
    status: z.string().refine((v) => EVENT_STATUS_KEYS.includes(v), "Kies een status"),
    date: z.string().min(1, "Begindatum is verplicht"),
    endDate: z.string().optional().or(z.literal("")),
    startTime: optionalTime,
    endTime: optionalTime,
    location: z.string().optional(),
    responsible: z.string().optional(),
    // Leeg mag; "0 bezoekers verwacht" heeft geen betekenis, negatief al helemaal niet.
    expectedVisitors: z
      .union([z.literal(""), z.coerce.number().int().positive("Ongeldig aantal")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    description: z.string().optional(),
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
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Vul eerst een beginuur in" });
    }
    // Enkel zinvol binnen één dag: een eetkermis van 18:00 tot 02:00 loopt door.
    if (data.startTime && data.endTime && !data.endDate && data.endTime < data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Einduur mag niet vóór het beginuur liggen",
      });
    }
  });

export type EventInput = z.infer<typeof eventSchema>;
