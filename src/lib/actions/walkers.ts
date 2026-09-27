"use server";

import { db } from "@/lib/db";
import { walkers, users } from "@/lib/db/schema";
import { walkerRegistrationSchema } from "@/lib/validations/walkers";
import { walkerStatusUpdateSchema } from "@/lib/validations/walker-status";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { WALK_REGULATIONS_VERSION } from "@/lib/walkers/regulations";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/types";
import type { Walker } from "@/types";

export async function submitWalkerRegistration(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<Walker>> {
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    address: formData.get("address") as string,
    allergies: (formData.get("allergies") as string) || "",
    childrenWalkAlong: formData.get("childrenWalkAlong") === "true",
    regulationsRead: formData.get("regulationsRead") === "true",
    photoUrl: (formData.get("photoUrl") as string) || "",
  };

  const parsed = walkerRegistrationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    // Check duplicate email
    const existing = await db
      .select()
      .from(walkers)
      .where(eq(walkers.email, parsed.data.email));

    if (existing.length > 0) {
      return {
        success: false,
        error: "Er bestaat al een registratie met dit e-mailadres.",
      };
    }

    // Insert walker
    const [walker] = await db
      .insert(walkers)
      .values({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        dateOfBirth: parsed.data.dateOfBirth,
        address: parsed.data.address,
        allergies: parsed.data.allergies || null,
        childrenWalkAlong: parsed.data.childrenWalkAlong,
        // Story 10.77: bewijs van de aanvaarding — wanneer en welke versie.
        regulationsRead: true,
        regulationsAcceptedAt: new Date(),
        regulationsVersion: WALK_REGULATIONS_VERSION,
        photoUrl: raw.photoUrl || null,
        status: "pending",
        isApproved: false,
      })
      .returning();

    // Generate barcode WLK-{id}
    const barcode = `WLK-${walker.id}`;
    const [updated] = await db
      .update(walkers)
      .set({ barcode })
      .where(eq(walkers.id, walker.id))
      .returning();

    return {
      success: true,
      data: updated,
      message: "Bedankt voor je registratie! Je aanvraag wordt zo snel mogelijk behandeld door de coördinator.",
    };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis. Probeer het later opnieuw.",
    };
  }
}

export async function updateWalkerStatus(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<Walker>> {
  const permResult = await requirePermission("walker:write");
  if (permResult && !permResult.success) {
    return { success: false, error: permResult.error };
  }

  const raw = {
    status: formData.get("status") as string,
    rejectionReason: (formData.get("rejectionReason") as string) || "",
  };

  const parsed = walkerStatusUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const walkerId = Number(formData.get("walkerId"));
  if (!walkerId || isNaN(walkerId)) {
    return { success: false, error: "Ongeldig wandelaar-id." };
  }

  try {
    // Fetch existing walker
    const existing = await db
      .select()
      .from(walkers)
      .where(eq(walkers.id, walkerId))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Wandelaar niet gevonden." };
    }

    const oldWalker = existing[0];
    const newStatus = parsed.data.status;
    const isApproved = newStatus === "approved";

    const updateData: Record<string, unknown> = {
      status: newStatus,
      isApproved,
    };

    if (newStatus === "rejected") {
      updateData.rejectionReason = parsed.data.rejectionReason.trim();
    }

    // Auto-create user account on approval
    if (newStatus === "approved") {
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, oldWalker.email))
        .limit(1);

      let userId: number;

      if (existingUsers.length > 0) {
        // Reactivate existing user
        userId = existingUsers[0].id;
        await db
          .update(users)
          .set({ isActive: true })
          .where(eq(users.id, userId));
      } else {
        // Create new user with barcode as temporary password
        const passwordHash = await hashPassword(oldWalker.barcode || `WLK-${walkerId}`);
        const [newUser] = await db
          .insert(users)
          .values({
            email: oldWalker.email,
            passwordHash,
            name: `${oldWalker.firstName} ${oldWalker.lastName}`,
            role: "wandelaar",
          })
          .returning();
        userId = newUser.id;
      }

      updateData.userId = userId;
    }

    const [updated] = await db
      .update(walkers)
      .set(updateData)
      .where(eq(walkers.id, walkerId))
      .returning();

    await logAudit(
      `walker.${newStatus}`,
      "walker",
      walkerId,
      { status: oldWalker.status },
      { status: newStatus },
    );

    revalidatePath("/beheerder/wandelaars");

    return {
      success: true,
      data: updated,
      message: `Wandelaar status bijgewerkt naar ${newStatus}.`,
    };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis. Probeer het later opnieuw.",
    };
  }
}

export async function createWalkerManual(
  _prevState: ActionResult<Walker> | null,
  formData: FormData,
): Promise<ActionResult<Walker>> {
  const permResult = await requirePermission("walker:write");
  if (permResult && !permResult.success) {
    return { success: false, error: permResult.error };
  }

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const autoApprove = formData.get("autoApprove") === "true";
  // Story 10.14: expliciete keuzes uit de admin form ipv silent defaults.
  const childrenWalkAlong = formData.get("childrenWalkAlong") === "true";

  if (!firstName || !lastName) {
    return { success: false, error: "Voornaam en achternaam zijn verplicht." };
  }
  if (!email) {
    return { success: false, error: "E-mail is verplicht." };
  }
  if (!phone) {
    return { success: false, error: "Telefoonnummer is verplicht." };
  }
  if (!dateOfBirth) {
    return { success: false, error: "Geboortedatum is verplicht." };
  }
  if (!address) {
    return { success: false, error: "Adres is verplicht." };
  }
  // Story 10.77: een medewerker aanvaardt het reglement niet in naam van de wandelaar
  // (was 10.14: een vinkje). De wandelaar aanvaardt zelf in de app, vóór zijn eerste wandeling.

  try {
    const existing = await db
      .select({ id: walkers.id })
      .from(walkers)
      .where(eq(walkers.email, email))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "Er bestaat al een wandelaar met dit e-mailadres." };
    }

    const status = autoApprove ? "approved" : "pending";

    const [walker] = await db
      .insert(walkers)
      .values({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        address,
        regulationsRead: false,
        regulationsAcceptedAt: null,
        regulationsVersion: null,
        childrenWalkAlong,
        status,
        isApproved: autoApprove,
      })
      .returning();

    // Generate barcode
    const barcode = `WLK-${walker.id}`;
    await db.update(walkers).set({ barcode }).where(eq(walkers.id, walker.id));

    // Auto-create user account when approved
    if (autoApprove) {
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      let userId: number;
      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
      } else {
        const passwordHash = await hashPassword(barcode);
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            passwordHash,
            name: `${firstName} ${lastName}`,
            role: "wandelaar",
          })
          .returning();
        userId = newUser.id;
      }

      await db.update(walkers).set({ userId }).where(eq(walkers.id, walker.id));
    }

    await logAudit("walker.create_manual", "walker", walker.id, null, { firstName, lastName, email, status });
    revalidatePath("/beheerder/wandelaars");

    return {
      success: true,
      data: { ...walker, barcode },
      message: `Wandelaar ${firstName} ${lastName} aangemaakt${autoApprove ? " en goedgekeurd" : ""}.`,
    };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het aanmaken. Probeer het later opnieuw.",
    };
  }
}

/**
 * Story 10.77 (Sven, keuze Johan) — de wandelaar aanvaardt zelf de huidige versie
 * van het wandelreglement, in de wandelaar-app, vóór hij kan boeken. Datum, uur en
 * versie zijn het bewijs; de vorige versie komt in het logboek.
 */
export async function acceptWalkRegulations(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Je bent niet ingelogd." };
  if (session.role !== "wandelaar") {
    return { success: false, error: "Enkel een wandelaar kan het wandelreglement aanvaarden." };
  }

  const [walker] = await db.select().from(walkers).where(eq(walkers.userId, session.userId)).limit(1);
  if (!walker) return { success: false, error: "Wandelaar profiel niet gevonden." };

  await db
    .update(walkers)
    .set({
      regulationsRead: true,
      regulationsAcceptedAt: new Date(),
      regulationsVersion: WALK_REGULATIONS_VERSION,
    })
    .where(eq(walkers.id, walker.id));

  await logAudit(
    "walker.regulations_accepted",
    "walker",
    walker.id,
    { version: walker.regulationsVersion },
    { version: WALK_REGULATIONS_VERSION },
  );
  revalidatePath("/wandelaar");
  return { success: true, data: undefined };
}