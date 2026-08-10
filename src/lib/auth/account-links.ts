import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userTokens } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { accountInviteEmail } from "@/lib/email/templates/account-invite";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import {
  buildTokenUrl,
  checkToken,
  expiresAtFor,
  generateToken,
  hashToken,
  type TokenPurpose,
  type TokenRefusal,
} from "./tokens";

/**
 * Uitgeven, versturen en inwisselen van eenmalige links. Bewust géén
 * `"use server"`-bestand: dit zijn gewone helpers, geen acties die vanuit de
 * browser opgeroepen mogen worden.
 */

/**
 * Geeft een nieuwe token uit en trekt oudere, nog openstaande links van
 * hetzelfde soort in. Twee geldige uitnodigingen tegelijk laten rondslingeren
 * maakt het onmogelijk om te redeneren over wie wat nog kan.
 */
export async function issueAccountToken(
  userId: number,
  purpose: TokenPurpose,
  now: Date = new Date(),
): Promise<string> {
  await db
    .update(userTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(userTokens.userId, userId),
        eq(userTokens.purpose, purpose),
        isNull(userTokens.usedAt),
      ),
    );

  const raw = generateToken();

  await db.insert(userTokens).values({
    userId,
    tokenHash: hashToken(raw),
    purpose,
    expiresAt: expiresAtFor(purpose, now),
  });

  return raw;
}

export interface AccountLinkResult {
  /** De volledige link — ook bruikbaar om ze met de hand door te geven. */
  url: string;
  sent: boolean;
  error?: string;
}

/**
 * Maakt een link en probeert hem te mailen. De link wordt altijd aangemaakt,
 * ook als de mail faalt: de beheerder kan hem dan zelf doorgeven.
 */
export async function sendAccountLink(
  user: { id: number; name: string; email: string },
  purpose: TokenPurpose,
  invitedBy?: string,
): Promise<AccountLinkResult> {
  const raw = await issueAccountToken(user.id, purpose);
  const url = buildTokenUrl(raw);

  const mail =
    purpose === "invite"
      ? accountInviteEmail({ name: user.name, url, invitedBy })
      : passwordResetEmail({ name: user.name, url });

  const result = await sendEmail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return { url, sent: result.success, error: result.error };
}

export interface TokenUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean | null;
}

export type TokenLookup =
  | { ok: true; tokenId: number; user: TokenUser }
  | { ok: false; reason: TokenRefusal };

/**
 * Zoekt de gebruiker achter een rauwe token. Een gedeactiveerd account geeft
 * bewust "onbekend" terug: wie geen toegang meer heeft, hoeft niet te weten dat
 * zijn link op zich nog geldig was.
 */
export async function findUserByToken(
  raw: string,
  now: Date = new Date(),
): Promise<TokenLookup> {
  const [row] = await db
    .select({
      id: userTokens.id,
      userId: userTokens.userId,
      purpose: userTokens.purpose,
      expiresAt: userTokens.expiresAt,
      usedAt: userTokens.usedAt,
    })
    .from(userTokens)
    .where(eq(userTokens.tokenHash, hashToken(raw)))
    .limit(1);

  const check = checkToken(row, now);
  if (!check.ok) return check;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  if (!user || !user.isActive) return { ok: false, reason: "onbekend" };

  return { ok: true, tokenId: row.id, user };
}

export async function markTokenUsed(tokenId: number, now: Date = new Date()): Promise<void> {
  await db.update(userTokens).set({ usedAt: now }).where(eq(userTokens.id, tokenId));
}
