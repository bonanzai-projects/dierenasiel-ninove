import { Resend } from "resend";

/**
 * Lazy singleton: de client wordt pas bij de eerste verzending gemaakt.
 * Hem bij het laden van de module aanmaken betekende dat élke import van dit
 * bestand een sleutel veronderstelde — ook op een omgeving waar er geen is.
 * Zo blijft de app gewoon draaien zolang RESEND_API_KEY nog niet gezet is, en
 * geeft alleen het verzenden zelf een nette fout.
 */
let client: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}
