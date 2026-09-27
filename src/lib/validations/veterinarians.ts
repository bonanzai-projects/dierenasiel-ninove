import { z } from "zod";

/**
 * Story 10.81 — één fiche in de dierenartsenlijst. Enkel de naam is verplicht:
 * Sven vult de gegevens stap voor stap aan. Adres in vier velden, zoals bij de
 * leveranciers (13.18).
 */
const leegIsNull = (v: string | undefined) => (v ? v : null);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optioneel = (max: number) =>
  z.string().trim().max(max, `Maximaal ${max} tekens`).optional().transform(leegIsNull);

export const veterinarianSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(120, "Maximaal 120 tekens"),
  practice: optioneel(120),
  street: optioneel(120),
  houseNumber: optioneel(20),
  postalCode: optioneel(10),
  city: optioneel(80),
  phone: optioneel(30),
  mobile: optioneel(30),
  email: z
    .string()
    .trim()
    .max(200, "Maximaal 200 tekens")
    .optional()
    .refine((v) => !v || EMAIL.test(v), "Geen geldig e-mailadres")
    .transform(leegIsNull),
  orderNumber: optioneel(30),
  notes: z.string().trim().optional().transform(leegIsNull),
});

export type VeterinarianInput = z.infer<typeof veterinarianSchema>;
