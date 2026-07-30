import { z } from "zod";
import { parseWeightInput, MAX_WEIGHT_KG } from "@/lib/animals/weight";

/** Vandaag in Belgische tijd als jjjj-mm-dd — een server in UTC mag geen dag verschillen. */
export function todayInBrussels(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const animalWeightSchema = z.object({
  animalId: z.coerce.number().int().positive(),
  date: z
    .string()
    .min(1, "Datum is verplicht")
    .refine((d) => d <= todayInBrussels(), "Een weging kan niet in de toekomst liggen"),
  weightKg: z
    .string()
    .transform((v) => parseWeightInput(v))
    .refine(
      (v): v is number => v !== null,
      `Geef het gewicht in kg, bijvoorbeeld 32,5 (maximaal ${MAX_WEIGHT_KG})`,
    ),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type AnimalWeightInput = z.infer<typeof animalWeightSchema>;
