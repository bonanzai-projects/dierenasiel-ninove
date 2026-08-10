import { createHash, randomBytes } from "node:crypto";

/**
 * Eenmalige links voor een uitnodiging of een vergeten wachtwoord.
 *
 * Waarom sha256 en niet bcrypt (zoals bij wachtwoorden)? Een wachtwoord wordt
 * door een mens gekozen en is dus te raden — daar is een traag algoritme met een
 * salt precies de bedoeling. Een token hier is 32 willekeurige bytes; die raad
 * je niet, ook niet met alle tijd van de wereld. Wél belangrijk: we moeten een
 * binnenkomende token kunnen *opzoeken*. Met bcrypt (elke rij een eigen salt)
 * zou dat betekenen: alle rijen overlopen en stuk voor stuk vergelijken. Met een
 * hash die deterministisch is, is het één indexlookup.
 */

export const TOKEN_PURPOSES = ["invite", "reset"] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

/**
 * Een uitnodiging mag gerust een week blijven liggen — mensen lezen hun mail
 * niet altijd dezelfde dag. Een herstellink is een noodgeval en hoort kort te
 * leven: hoe korter hij geldig is, hoe kleiner het venster waarin een
 * meegelezen mailbox iemand binnenlaat.
 */
export const TOKEN_TTL_SECONDS: Record<TokenPurpose, number> = {
  invite: 7 * 24 * 60 * 60,
  reset: 60 * 60,
};

/** De rauwe token — die zien we één keer en bewaren we nooit. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Wat er wél in de databank komt. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function expiresAtFor(purpose: TokenPurpose, now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_SECONDS[purpose] * 1000);
}

export interface TokenRow {
  expiresAt: Date;
  usedAt: Date | null;
}

export type TokenRefusal = "onbekend" | "vervallen" | "gebruikt";
export type TokenCheck = { ok: true } | { ok: false; reason: TokenRefusal };

/**
 * "Gebruikt" gaat voor op "vervallen": wie zijn eigen link een tweede keer
 * opent, heeft meer aan "je hebt die link al gebruikt" dan aan "hij is verlopen".
 */
export function checkToken(
  row: TokenRow | null | undefined,
  now: Date = new Date(),
): TokenCheck {
  if (!row) return { ok: false, reason: "onbekend" };
  if (row.usedAt) return { ok: false, reason: "gebruikt" };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "vervallen" };
  return { ok: true };
}

const REASON_MESSAGES: Record<TokenRefusal, string> = {
  onbekend:
    "Deze link herkennen we niet. Kijk na of je hem volledig hebt gekopieerd, of vraag een nieuwe aan.",
  vervallen:
    "Deze link is niet meer geldig. Vraag hieronder een nieuwe aan, dan sturen we je meteen een nieuwe mail.",
  gebruikt:
    "Deze link is al gebruikt. Kan je niet inloggen? Vraag dan hieronder een nieuwe aan.",
};

export function reasonMessage(reason: TokenRefusal): string {
  return REASON_MESSAGES[reason];
}

/**
 * De basis-URL voor links in een mail. In een mail kan geen relatief pad staan,
 * en op de server is er geen `window.location`. De Vercel-terugval komt uit de
 * setter-backoffice-studio: zo werkt een deployment ook als de var vergeten is.
 */
export function resolveBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const site = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/+$/, "");

  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SET_PASSWORD_PATH = "/wachtwoord-instellen";

export function buildTokenUrl(rawToken: string, baseUrl: string = resolveBaseUrl()): string {
  return `${baseUrl.replace(/\/+$/, "")}${SET_PASSWORD_PATH}/${encodeURIComponent(rawToken)}`;
}
