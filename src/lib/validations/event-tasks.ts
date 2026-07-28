import { z } from "zod";
import { DRAAIBOEK_PHASE_KEYS } from "@/lib/events/draaiboek";

export const eventTaskSchema = z.object({
  eventId: z.coerce.number().int().positive("Ongeldig evenement"),
  phase: z.string().refine((v) => DRAAIBOEK_PHASE_KEYS.includes(v), "Kies een fase"),
  title: z.string().trim().min(1, "Omschrijving is verplicht"),
  date: z.string().optional().or(z.literal("")),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ongeldig uur (UU:MM)")
    .optional()
    .or(z.literal("")),
  responsible: z.string().optional(),
  notes: z.string().optional(),
});

export type EventTaskInput = z.infer<typeof eventTaskSchema>;
