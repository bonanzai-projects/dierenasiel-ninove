"use server";

import { db } from "@/lib/db";
import { eventEvaluations } from "@/lib/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { eventEvaluationSchema } from "@/lib/validations/event-evaluations";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type EventEvaluationRow = InferSelectModel<typeof eventEvaluations>;

function readForm(formData: FormData) {
  return {
    eventId: (formData.get("eventId") as string) || "",
    visitors: (formData.get("visitors") as string) || "",
    ticketsUsed: (formData.get("ticketsUsed") as string) || "",
    paidPlates: (formData.get("paidPlates") as string) || "",
    wentWell: (formData.get("wentWell") as string)?.trim() || "",
    couldBeBetter: (formData.get("couldBeBetter") as string)?.trim() || "",
    agreements: (formData.get("agreements") as string)?.trim() || "",
  };
}

/**
 * Eén evaluatie per evenement: bestaat ze al, dan wordt ze bijgewerkt. Zo hoeft het
 * scherm geen onderscheid te maken tussen "aanmaken" en "bewerken" — je vult gewoon
 * aan naarmate de cijfers binnenkomen.
 */
export async function saveEventEvaluation(
  _prev: ActionResult<EventEvaluationRow> | null,
  formData: FormData,
): Promise<ActionResult<EventEvaluationRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = eventEvaluationSchema.safeParse(waarden);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: Object.fromEntries(Object.entries(waarden).map(([k, v]) => [k, String(v)])),
    };
  }

  const d = parsed.data;
  const kolommen = {
    visitors: d.visitors,
    ticketsUsed: d.ticketsUsed,
    paidPlates: d.paidPlates,
    wentWell: d.wentWell || null,
    couldBeBetter: d.couldBeBetter || null,
    agreements: d.agreements || null,
  };

  try {
    const session = await getSession();
    const [old] = await db
      .select()
      .from(eventEvaluations)
      .where(eq(eventEvaluations.eventId, d.eventId))
      .limit(1);

    let record: EventEvaluationRow;
    if (old) {
      [record] = await db
        .update(eventEvaluations)
        .set({ ...kolommen, updatedByUserId: session?.userId ?? null, updatedAt: new Date() })
        .where(eq(eventEvaluations.id, old.id))
        .returning();
    } else {
      [record] = await db
        .insert(eventEvaluations)
        .values({ eventId: d.eventId, ...kolommen, updatedByUserId: session?.userId ?? null })
        .returning();
    }

    await logAudit(
      old ? "update_event_evaluation" : "create_event_evaluation",
      "event_evaluation",
      record.id,
      old ?? null,
      record,
    );
    revalidatePath(`/beheerder/evenementen/${d.eventId}`);
    return { success: true, data: record };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van de evaluatie." };
  }
}
