"use server";

import { db } from "@/lib/db";
import { shelterSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import {
  shelterSettingKeySchema,
  shelterSettingValueSchema,
} from "@/lib/validations/shelter-settings";

export async function updateShelterSetting(
  key: string,
  value: unknown,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (!hasPermission(session.role, "settings:write")) {
    return { success: false, error: "Je hebt niet de juiste rechten." };
  }

  const keyResult = shelterSettingKeySchema.safeParse(key);
  if (!keyResult.success) {
    return { success: false, error: `Onbekende instelling: ${key}` };
  }

  const valueResult = shelterSettingValueSchema(key, value);
  if (!valueResult.success) {
    return { success: false, error: valueResult.error };
  }

  try {
    // Fetch old value for audit
    const existing = await db
      .select()
      .from(shelterSettings)
      .where(eq(shelterSettings.key, key))
      .limit(1);

    const oldValue = existing.length > 0 ? { value: existing[0].value } : null;

    await db
      .insert(shelterSettings)
      .values({
        key,
        value: valueResult.data,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: shelterSettings.key,
        set: {
          value: valueResult.data,
          updatedBy: session.userId,
          updatedAt: new Date(),
        },
      });

    await logAudit(
      `settings.${key}_updated`,
      "shelter_setting",
      key,
      oldValue,
      { value: valueResult.data },
    );

    revalidatePath("/beheerder/instellingen");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  }
}

export async function updateWalkingClubThreshold(
  threshold: number,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (session.role !== "admin" && session.role !== "coordinator" && session.role !== "beheerder") {
    return { success: false, error: "Je hebt niet de juiste rechten." };
  }

  if (!Number.isInteger(threshold) || threshold <= 0) {
    return { success: false, error: "Drempel moet een positief geheel getal zijn." };
  }

  try {
    const existing = await db
      .select()
      .from(shelterSettings)
      .where(eq(shelterSettings.key, "walking_club_threshold"))
      .limit(1);

    const oldValue = existing.length > 0 ? { value: existing[0].value } : null;

    await db
      .insert(shelterSettings)
      .values({
        key: "walking_club_threshold",
        value: threshold,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: shelterSettings.key,
        set: {
          value: threshold,
          updatedBy: session.userId,
          updatedAt: new Date(),
        },
      });

    await logAudit(
      "settings.walking_club_threshold_updated",
      "shelter_setting",
      "walking_club_threshold",
      oldValue,
      { value: threshold },
    );

    revalidatePath("/beheerder/wandelaars");
    revalidatePath("/beheerder/instellingen");

    return { success: true, data: undefined, message: `Drempel bijgewerkt naar ${threshold} wandelingen.` };
  } catch {
    return { success: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  }
}

export async function updateWalkDays(days: number[]): Promise<ActionResult> {
  return updateShelterSetting("walk_days", days);
}

/**
 * Story 10.27: verzorgerslijst voor het gedragsrapport (Bijlage VIII B).
 * Lege regels worden weggefilterd vóór validatie.
 */
export async function updateCaregivers(names: string[]): Promise<ActionResult> {
  const cleaned = names.map((n) => n.trim()).filter((n) => n.length > 0);
  return updateShelterSetting("behavior_caregivers", cleaned);
}
