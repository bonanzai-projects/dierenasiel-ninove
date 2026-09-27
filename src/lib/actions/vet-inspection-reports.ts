"use server";

import { db } from "@/lib/db";
import { vetInspectionReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createVetInspectionReportSchema, signReportSchema } from "@/lib/validations/vet-inspection-reports";
import { getSession } from "@/lib/auth/session";
import { getVeterinarianById } from "@/lib/queries/veterinarians";
import { revalidatePath } from "next/cache";
import type { ActionResult, VetInspectionReport } from "@/types";

export async function createVetInspectionReport(
  _prevState: ActionResult<VetInspectionReport> | null,
  formData: FormData,
): Promise<ActionResult<VetInspectionReport>> {
  const permCheck = await requirePermission("medical:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const jsonStr = formData.get("json") as string;
  if (!jsonStr) {
    return { success: false, error: "Geen data ontvangen" };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    return { success: false, error: "Ongeldige JSON data" };
  }

  const parsed = createVetInspectionReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await getSession();

  try {
    // Story 10.81 — bij een dierenarts uit de lijst bepaalt de fiche de naam op het rapport.
    let vetName = parsed.data.vetName;
    const veterinarianId = parsed.data.veterinarianId ?? null;
    if (veterinarianId !== null) {
      const vet = await getVeterinarianById(veterinarianId);
      if (!vet) return { success: false, fieldErrors: { vetName: ["Dierenarts niet gevonden in de lijst"] } };
      vetName = vet.name;
    }

    const [record] = await db
      .insert(vetInspectionReports)
      .values({
        visitDate: parsed.data.visitDate,
        vetUserId: session?.userId ?? null,
        vetName,
        veterinarianId,
        animalsTreated: parsed.data.animalsTreated,
        animalsEuthanized: parsed.data.animalsEuthanized,
        abnormalBehavior: parsed.data.abnormalBehavior,
        recommendations: parsed.data.recommendations || null,
      })
      .returning();

    await logAudit("create_vet_inspection_report", "vet_inspection_report", record.id, null, record);
    revalidatePath("/beheerder/medisch/bezoekrapport");
    revalidatePath("/beheerder/medisch");

    return { success: true, data: record as VetInspectionReport };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}

export async function signVetInspectionReport(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const permCheck = await requirePermission("medical:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const idParsed = signReportSchema.safeParse({ id: formData.get("id") });
  if (!idParsed.success) {
    return { success: false, error: "Ongeldig rapport-ID" };
  }

  const id = idParsed.data.id;

  try {
    const [existing] = await db
      .select()
      .from(vetInspectionReports)
      .where(eq(vetInspectionReports.id, id))
      .limit(1);

    if (!existing) return { success: false, error: "Rapport niet gevonden" };
    if (existing.vetSignature) return { success: false, error: "Rapport is al ondertekend" };

    const [updated] = await db
      .update(vetInspectionReports)
      .set({ vetSignature: true, signedAt: new Date() })
      .where(eq(vetInspectionReports.id, id))
      .returning();

    await logAudit("sign_vet_inspection_report", "vet_inspection_report", id, existing, updated);
    revalidatePath("/beheerder/medisch/bezoekrapport");
    revalidatePath("/beheerder/medisch");

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het ondertekenen. Probeer het later opnieuw.",
    };
  }
}

export async function deleteVetInspectionReport(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const permCheck = await requirePermission("medical:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) {
    return { success: false, error: "Ongeldig rapport-ID" };
  }

  try {
    const [existing] = await db
      .select()
      .from(vetInspectionReports)
      .where(eq(vetInspectionReports.id, id))
      .limit(1);

    if (!existing) return { success: false, error: "Rapport niet gevonden" };
    if (existing.vetSignature) return { success: false, error: "Ondertekend rapport kan niet verwijderd worden" };

    await db.delete(vetInspectionReports).where(eq(vetInspectionReports.id, id));

    await logAudit("delete_vet_inspection_report", "vet_inspection_report", existing.id, existing, null);
    revalidatePath("/beheerder/medisch/bezoekrapport");
    revalidatePath("/beheerder/medisch");

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis bij het verwijderen. Probeer het later opnieuw.",
    };
  }
}
