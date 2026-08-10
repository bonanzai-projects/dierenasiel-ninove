"use server";

import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { findUserByToken, markTokenUsed, sendAccountLink } from "@/lib/auth/account-links";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, getSession, setSessionCookie } from "@/lib/auth/session";
import { reasonMessage } from "@/lib/auth/tokens";
import { logAudit } from "@/lib/audit";
import {
  changePasswordSchema,
  requestResetSchema,
  setPasswordSchema,
} from "@/lib/validations/account";
import type { ActionResult } from "@/types";

/**
 * Eén en dezelfde boodschap, wat er ook gebeurd is. Wie hier verschillende
 * antwoorden krijgt, kan uitvissen welke adressen een account hebben — en dat
 * is precies wat een aanvaller als eerste probeert.
 */
const ZELFDE_ANTWOORD =
  "Als dit e-mailadres bij ons gekend is, sturen we binnen enkele minuten een link. Kijk zeker ook even in je map met ongewenste mail.";

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      success: false,
      error: "Vul een geldig e-mailadres in.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Hoofdletterongevoelig: e-mailadressen zijn dat in de praktijk ook, en een
  // hoofdletter bij het aanmaken mag niemand buitensluiten.
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email.toLowerCase()}`)
    .limit(1);

  if (user?.isActive) {
    const link = await sendAccountLink(
      { id: user.id, name: user.name, email: user.email },
      "reset",
    );
    await logAudit("password_reset_requested", "user", user.id, null, { sent: link.sent });
  }

  return { success: true, data: undefined, message: ZELFDE_ANTWOORD };
}

export async function setPasswordWithToken(
  _prev: ActionResult<{ role: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ role: string }>> {
  const parsed = setPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const lookup = await findUserByToken(parsed.data.token);
  if (!lookup.ok) {
    return { success: false, error: reasonMessage(lookup.reason) };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date(), lastLoginAt: new Date() })
    .where(eq(users.id, lookup.user.id));

  await markTokenUsed(lookup.tokenId);
  await logAudit("password_set", "user", lookup.user.id, null, { via: "link" });

  // Meteen inloggen: wie zonet via zijn eigen mailbox bewezen heeft dat hij het
  // is, nog eens laten inloggen met het wachtwoord dat hij twee tellen geleden
  // koos, is enkel hinder.
  const token = await createSession({
    userId: lookup.user.id,
    email: lookup.user.email,
    role: lookup.user.role,
    name: lookup.user.name,
  });
  await setSessionCookie(token);

  return {
    success: true,
    data: { role: lookup.user.role },
    message: "Je wachtwoord is ingesteld. Welkom!",
  };
}

export async function changeOwnPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return { success: false, error: "Gebruiker niet gevonden" };

  const klopt = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!klopt) {
    return {
      success: false,
      error: "Je huidige wachtwoord klopt niet.",
      fieldErrors: { currentPassword: ["Je huidige wachtwoord klopt niet."] },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logAudit("password_changed", "user", user.id, null, { via: "eigen scherm" });

  return { success: true, data: undefined, message: "Je wachtwoord is gewijzigd." };
}
