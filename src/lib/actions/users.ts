"use server";

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { sendAccountLink } from "@/lib/auth/account-links";
import { logAudit } from "@/lib/audit";
import { createUserSchema, updateUserSchema } from "@/lib/validations/users";
import { hashPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export interface InviteOutcome {
  sent: boolean;
  /** Enkel gevuld wanneer de mail níet vertrok — dan kan de beheerder hem zelf doorgeven. */
  inviteUrl?: string;
}

/**
 * Aanmaken en bewerken delen één formulier, dus ook één statetype. Bij het
 * bewerken hoort er geen uitnodiging bij, vandaar `undefined`.
 */
export type UserActionResult = ActionResult<InviteOutcome | undefined>;

/**
 * Een nieuw account heeft nog geen wachtwoord, maar de kolom mag niet leeg zijn.
 * We zetten er iets willekeurigs in dat niemand ooit kan intypen; het echte
 * wachtwoord komt van de gebruiker zelf, via de uitnodigingslink.
 */
async function onbruikbaarWachtwoord(): Promise<string> {
  return hashPassword(randomBytes(32).toString("hex"));
}

export async function createUser(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const permCheck = await requirePermission("user:manage");
  if (permCheck && !permCheck.success) return permCheck;

  // React 19 wist de velden van een uncontrolled form ná een server action, ook
  // bij een fout. Daarom geven we de ingevulde waarden terug.
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  };

  const parsed = createUserSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      values,
    };
  }

  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing) {
    return {
      success: false,
      error: "Er bestaat al een gebruiker met dit e-mailadres",
      values,
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email,
      passwordHash: await onbruikbaarWachtwoord(),
      role: parsed.data.role,
    })
    .returning({ id: users.id });

  const session = await getSession();
  const link = await sendAccountLink(
    { id: created.id, name: parsed.data.name, email },
    "invite",
    session?.name,
  );

  await logAudit("user_created", "user", created.id, null, {
    role: parsed.data.role,
    inviteSent: link.sent,
  });

  revalidatePath("/beheerder/gebruikers");

  return {
    success: true,
    data: { sent: link.sent, ...(link.sent ? {} : { inviteUrl: link.url }) },
    message: link.sent
      ? `Gebruiker aangemaakt. De uitnodiging is verstuurd naar ${email}.`
      : "Gebruiker aangemaakt, maar de uitnodiging kon niet verstuurd worden. Geef de link hieronder zelf door.",
  };
}

/**
 * Uitnodiging (opnieuw) versturen voor een bestaand account. Dit vervangt het
 * oude veld waarin een beheerder zelf een wachtwoord intypte: dat wachtwoord
 * moest daarna toch buiten de app om doorgegeven worden.
 */
export async function sendUserInvite(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const permCheck = await requirePermission("user:manage");
  if (permCheck && !permCheck.success) return permCheck;

  const id = Number(formData.get("id"));
  if (!id || id <= 0) return { success: false, error: "Ongeldig ID" };

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return { success: false, error: "Gebruiker niet gevonden" };
  if (!user.isActive) {
    return {
      success: false,
      error: "Dit account staat op niet-actief. Zet het eerst weer actief.",
    };
  }

  const session = await getSession();
  const link = await sendAccountLink(
    { id: user.id, name: user.name, email: user.email },
    "invite",
    session?.name,
  );

  await logAudit("user_invited", "user", user.id, null, { sent: link.sent });

  return {
    success: true,
    data: { sent: link.sent, ...(link.sent ? {} : { inviteUrl: link.url }) },
    message: link.sent
      ? `Uitnodiging verstuurd naar ${user.email}.`
      : "De uitnodiging kon niet verstuurd worden. Geef de link hieronder zelf door.",
  };
}

export async function updateUser(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const permCheck = await requirePermission("user:manage");
  if (permCheck && !permCheck.success) return permCheck;

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing && existing.id !== parsed.data.id) {
    return { success: false, error: "Er bestaat al een andere gebruiker met dit e-mailadres" };
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.id));

  await logAudit("user_updated", "user", parsed.data.id, null, {
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  });

  revalidatePath("/beheerder/gebruikers");
  return { success: true, data: undefined, message: "Gebruiker bijgewerkt." };
}
