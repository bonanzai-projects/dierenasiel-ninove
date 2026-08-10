import { z } from "zod";
import { BACKOFFICE_ROLES } from "@/lib/constants";

/**
 * Geen wachtwoord meer: de beheerder kiest er geen, de nieuwe gebruiker stelt
 * het zelf in via de uitnodigingslink (story 10.57).
 */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(200),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  role: z.enum(BACKOFFICE_ROLES, { error: "Selecteer een geldige rol" }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.coerce.number().positive("Ongeldig ID"),
  name: z.string().trim().min(1, "Naam is verplicht").max(200),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  role: z.enum(BACKOFFICE_ROLES, { error: "Selecteer een geldige rol" }),
  isActive: z.coerce.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
