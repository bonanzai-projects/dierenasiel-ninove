"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { staffAttendance } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const PATH = "/beheerder/personeel";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum");

const signUpSchema = z.object({
  date: dateString,
  note: z.string().trim().max(200, "Toelichting mag max 200 tekens zijn").optional().default(""),
});

const addPersonSchema = z.object({
  date: dateString,
  guestName: z
    .string()
    .trim()
    .min(1, "Vul een naam in")
    .max(200, "Naam mag max 200 tekens zijn"),
  note: z.string().trim().max(200, "Toelichting mag max 200 tekens zijn").optional().default(""),
});

/**
 * Jezelf inschrijven. Vraagt geen schrijfrecht: elk teamlid onderhoudt zijn
 * eigen aanwezigheid, net zoals bij de teamkalender (story 12.2).
 */
export async function signUpForDay(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };

  const parsed = signUpSchema.safeParse({
    date: formData.get("date"),
    // `get` geeft null als het veld ontbreekt, en voor zod is null iets anders
    // dan "niet meegestuurd" — zonder deze omzetting faalt een formulier zonder
    // toelichtingsveld op de validatie.
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const [bestaand] = await db
    .select({ id: staffAttendance.id })
    .from(staffAttendance)
    .where(
      and(
        eq(staffAttendance.date, parsed.data.date),
        eq(staffAttendance.userId, session.userId),
      ),
    )
    .limit(1);

  // Twee keer op dezelfde knop duwen mag geen fout geven.
  if (bestaand) {
    revalidatePath(PATH);
    return { success: true, data: undefined, message: "Je stond al ingeschreven." };
  }

  await db.insert(staffAttendance).values({
    date: parsed.data.date,
    userId: session.userId,
    note: parsed.data.note || null,
    createdBy: session.userId,
  });

  await logAudit("staff_attendance.signed_up", "staff_attendance", session.userId, null, {
    date: parsed.data.date,
  });

  revalidatePath(PATH);
  return { success: true, data: undefined, message: "Ingeschreven." };
}

/** Iemand zonder login inschrijven — enkel met schrijfrecht. */
export async function addPersonToDay(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };
  if (!hasPermission(session.role, "staff:write")) {
    return { success: false, error: "Onvoldoende rechten om iemand anders in te schrijven" };
  }

  const values = {
    date: String(formData.get("date") ?? ""),
    guestName: String(formData.get("guestName") ?? ""),
    note: String(formData.get("note") ?? ""),
  };

  const parsed = addPersonSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      values,
    };
  }

  await db.insert(staffAttendance).values({
    date: parsed.data.date,
    userId: null,
    guestName: parsed.data.guestName,
    note: parsed.data.note || null,
    createdBy: session.userId,
  });

  await logAudit("staff_attendance.person_added", "staff_attendance", session.userId, null, {
    date: parsed.data.date,
    guestName: parsed.data.guestName,
  });

  revalidatePath(PATH);
  return { success: true, data: undefined, message: `${parsed.data.guestName} is ingeschreven.` };
}

/**
 * Een inschrijving weghalen. Je eigen mag altijd; die van iemand anders enkel
 * met schrijfrecht — de controle staat hier, niet enkel in het scherm.
 */
export async function removeAttendance(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Niet ingelogd" };

  const id = Number(formData.get("id"));
  if (!id || id <= 0) return { success: false, error: "Ongeldig ID" };

  const [rij] = await db
    .select({ id: staffAttendance.id, userId: staffAttendance.userId, date: staffAttendance.date })
    .from(staffAttendance)
    .where(eq(staffAttendance.id, id))
    .limit(1);

  if (!rij) return { success: false, error: "Inschrijving niet gevonden" };

  const eigen = rij.userId === session.userId;
  if (!eigen && !hasPermission(session.role, "staff:write")) {
    return { success: false, error: "Je kan enkel je eigen inschrijving weghalen" };
  }

  await db.delete(staffAttendance).where(eq(staffAttendance.id, id));

  await logAudit("staff_attendance.removed", "staff_attendance", id, { date: rij.date }, null);

  revalidatePath(PATH);
  return { success: true, data: undefined, message: "Uitgeschreven." };
}
