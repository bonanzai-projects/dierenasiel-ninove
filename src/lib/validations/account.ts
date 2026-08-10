import { z } from "zod";

/**
 * Zelfde ondergrens als het bestaande resetveld (6 tekens). Bewust geen regels
 * over hoofdletters of cijfers: die duwen mensen naar "Welkom123!" op een
 * geeltje, en dit is een asielbackoffice, geen bank.
 */
const password = z
  .string()
  .min(6, "Wachtwoord moet minstens 6 tekens zijn")
  .max(100, "Wachtwoord mag hoogstens 100 tekens zijn");

export const requestResetSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
});

export const setPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Deze link is onvolledig"),
    password,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "De twee wachtwoorden zijn niet gelijk",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vul je huidige wachtwoord in"),
    password,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "De twee wachtwoorden zijn niet gelijk",
    path: ["confirm"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "Kies een ander wachtwoord dan je huidige",
    path: ["password"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
