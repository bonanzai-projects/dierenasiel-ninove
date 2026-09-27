"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { staffPatterns } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { timeRangeIssues } from "@/lib/staff/attendance";
import { TASK_MAX_LENGTH, normalizeTask } from "@/lib/staff/tasks";
import { describePattern, findPatternOverlap, patternPeriod, stopPlan } from "@/lib/staff/patterns";
import { findPatternPerson } from "@/lib/queries/staff-patterns";
import { todayInBrussels } from "@/lib/validations/animal-weights";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * Epic 14, story 14.8 — het vaste weekrooster.
 *
 * | Handeling                                  | Wie                     |
 * |--------------------------------------------|-------------------------|
 * | een eigen vast moment zetten / stoppen     | `staff:read`            |
 * | dat van een medewerker of wandelaar        | leiding (`staff:write`) |
 *
 * Stoppen wist niet: het vaste moment loopt tot en met vandaag, zodat vorige weken
 * blijven tonen wie er toen kwam (Sven: "ook willen zien wat voorbij is").
 */

const PATH = "/beheerder/personeel";
const KIES_PERSOON = "Kies een medewerker of wandelaar uit de lijst";

const optionalTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ongeldig uur (UU:MM)")
  .optional()
  .or(z.literal(""));

const patternSchema = z
  .object({
    userId: z
      .string()
      .optional()
      .refine((v) => !v || /^[1-9]\d{0,8}$/.test(v), KIES_PERSOON)
      .transform((v) => (v ? Number(v) : undefined)),
    weekday: z.string().regex(/^[1-7]$/, "Kies een weekdag").transform(Number),
    startTime: optionalTime,
    endTime: optionalTime,
    task: z
      .string()
      .optional()
      .transform((v) => normalizeTask(v))
      .refine((v) => v === null || v.length <= TASK_MAX_LENGTH, `Taak mag max ${TASK_MAX_LENGTH} tekens zijn`),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kies vanaf welke dag"),
  })
  .superRefine((data, ctx) => {
    for (const issue of timeRangeIssues(data.startTime, data.endTime)) {
      ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
    }
  });

/** Een vast moment instellen — voor jezelf, of als leiding voor een medewerker of wandelaar. */
export async function createStaffPattern(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };
  if (!hasPermission(session.role, "staff:read")) return { success: false, error: "Onvoldoende rechten" };

  // Teruggegeven bij een fout: React 19 leegt de velden na een Server Action.
  const values = {
    userId: String(formData.get("userId") ?? ""),
    weekday: String(formData.get("weekday") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    task: String(formData.get("task") ?? ""),
    validFrom: String(formData.get("validFrom") ?? ""),
  };

  const parsed = patternSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      values,
    };
  }

  const userId = parsed.data.userId ?? session.userId;
  const voorIemandAnders = userId !== session.userId;
  if (voorIemandAnders && !hasPermission(session.role, "staff:write")) {
    return { success: false, error: "Enkel de leiding kan een vast moment voor iemand anders zetten", values };
  }

  try {
    const persoon = await findPatternPerson(userId);
    if (!persoon) {
      return { success: false, error: "Validatie mislukt", fieldErrors: { userId: [KIES_PERSOON] }, values };
    }

    const nieuw = {
      userId,
      weekday: parsed.data.weekday,
      startTime: parsed.data.startTime || null,
      endTime: parsed.data.endTime || null,
      task: parsed.data.task,
      validFrom: parsed.data.validFrom,
      validUntil: null,
    };

    const bestaande = await db.select().from(staffPatterns).where(eq(staffPatterns.userId, userId)).limit(100);
    const botsing = findPatternOverlap(bestaande, nieuw);
    if (botsing) {
      const wie = voorIemandAnders ? `${persoon.name} heeft` : "Je hebt";
      return {
        success: false,
        error: `${wie} al een vast moment dat daarmee botst: ${describePattern(botsing)} (${patternPeriod(botsing, todayInBrussels())}). Stop dat eerst, of kies andere uren.`,
        values,
      };
    }

    await db.insert(staffPatterns).values({ ...nieuw, createdBy: session.userId });
    await logAudit("staff_pattern.created", "staff_pattern", userId, null, nieuw);
    revalidatePath(PATH);
    const wie = voorIemandAnders ? `${persoon.name} komt` : "Je komt";
    return { success: true, data: undefined, message: `Bewaard: ${wie} ${describePattern(nieuw)}.` };
  } catch {
    return { success: false, error: "Er ging iets mis bij het bewaren van het vaste moment.", values };
  }
}

/** Een vast moment stoppen: het loopt tot en met vandaag. Nog niet begonnen = weg. */
export async function stopStaffPattern(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };
  if (!hasPermission(session.role, "staff:read")) return { success: false, error: "Onvoldoende rechten" };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldig vast moment" };

  try {
    const [oud] = await db.select().from(staffPatterns).where(eq(staffPatterns.id, id)).limit(1);
    if (!oud) return { success: false, error: "Vast moment niet gevonden" };
    if (oud.userId !== session.userId && !hasPermission(session.role, "staff:write")) {
      return { success: false, error: "Enkel de leiding kan het vaste moment van iemand anders stoppen" };
    }

    const plan = stopPlan(oud, todayInBrussels());
    if (plan.kind === "already") {
      return { success: true, data: undefined, message: "Dat vaste moment was al gestopt." };
    }
    if (plan.kind === "delete") {
      await db.delete(staffPatterns).where(eq(staffPatterns.id, id));
      await logAudit("staff_pattern.deleted", "staff_pattern", id, oud, null);
      revalidatePath(PATH);
      return { success: true, data: undefined, message: "Vast moment verwijderd (het was nog niet begonnen)." };
    }

    await db.update(staffPatterns).set({ validUntil: plan.validUntil }).where(eq(staffPatterns.id, id));
    await logAudit("staff_pattern.stopped", "staff_pattern", id, oud, { validUntil: plan.validUntil });
    revalidatePath(PATH);
    return { success: true, data: undefined, message: "Vast moment gestopt; de vorige weken blijven staan." };
  } catch {
    return { success: false, error: "Er ging iets mis bij het stoppen van het vaste moment." };
  }
}
