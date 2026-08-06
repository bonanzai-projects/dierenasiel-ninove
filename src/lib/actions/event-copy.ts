"use server";

import { db } from "@/lib/db";
import { events, eventTasks, eventCosts, eventShifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { buildNextEdition, standardTasksFor, type CopySource } from "@/lib/events/copy";
import type { ActionResult } from "@/types";

/**
 * Story 13.10 — de zes vaste taken van Sven (vraag 8) in één klik in een leeg
 * draaiboek zetten. Bewust alleen bruikbaar wanneer het draaiboek nog leeg is:
 * twee keer klikken mag geen dubbele lijst geven.
 */
export async function addStandardTasks(
  eventId: number,
): Promise<ActionResult<{ toegevoegd: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { success: false, error: "Ongeldig evenement" };
  }

  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return { success: false, error: "Evenement niet gevonden" };

    const bestaande = await db
      .select({ id: eventTasks.id })
      .from(eventTasks)
      .where(eq(eventTasks.eventId, eventId));
    if (bestaande.length > 0) {
      return { success: false, error: "Het draaiboek is niet meer leeg." };
    }

    const taken = standardTasksFor(event.type);
    await db.insert(eventTasks).values(
      taken.map((t) => ({
        eventId,
        phase: t.phase,
        title: t.title,
        sortOrder: t.sortOrder,
      })),
    );

    await logAudit("add_standard_tasks", "event", eventId, null, { aantal: taken.length });
    revalidatePath(`/beheerder/evenementen/${eventId}`);
    return { success: true, data: { toegevoegd: taken.length } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het klaarzetten van de taken." };
  }
}

/**
 * Story 13.10 — "volgende editie": kopieert het evenement met zijn draaiboek,
 * begroting en (optioneel) de bezetting naar een nieuwe datum.
 *
 * Faalt er iets halverwege, dan blijft het nieuwe evenement bestaan met wat er al
 * in zit; er is geen transactie over de neon-http-driver. Daarom staat het aanmaken
 * van het evenement zelf voorop: een half gevuld evenement is nog altijd bruikbaar,
 * een verweesde takenlijst niet.
 */
export async function copyEventToNextEdition(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const bronId = Number(formData.get("eventId"));
  const naam = ((formData.get("name") as string) || "").trim();
  const datum = ((formData.get("date") as string) || "").trim();

  if (!Number.isInteger(bronId) || bronId <= 0) {
    return { success: false, error: "Ongeldig evenement" };
  }
  const fieldErrors: Record<string, string[]> = {};
  if (!naam) fieldErrors.name = ["Naam is verplicht"];
  if (!datum) fieldErrors.date = ["Begindatum is verplicht"];
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors, values: { name: naam, date: datum } };
  }

  const include = {
    tasks: formData.getAll("includeTasks").includes("true"),
    costs: formData.getAll("includeCosts").includes("true"),
    shifts: formData.getAll("includeShifts").includes("true"),
  };

  try {
    const [event] = await db.select().from(events).where(eq(events.id, bronId)).limit(1);
    if (!event) return { success: false, error: "Evenement niet gevonden" };

    const [tasks, costs, shifts] = await Promise.all([
      include.tasks ? db.select().from(eventTasks).where(eq(eventTasks.eventId, bronId)) : [],
      include.costs ? db.select().from(eventCosts).where(eq(eventCosts.eventId, bronId)) : [],
      include.shifts ? db.select().from(eventShifts).where(eq(eventShifts.eventId, bronId)) : [],
    ]);

    const nieuw = buildNextEdition({ event, tasks, costs, shifts } as CopySource, {
      name: naam,
      date: datum,
      include,
    });

    const session = await getSession();
    const [record] = await db
      .insert(events)
      .values({ ...nieuw.event, createdByUserId: session?.userId ?? null })
      .returning();

    if (nieuw.tasks.length > 0) {
      await db.insert(eventTasks).values(nieuw.tasks.map((t) => ({ ...t, eventId: record.id })));
    }
    if (nieuw.costs.length > 0) {
      await db.insert(eventCosts).values(nieuw.costs.map((c) => ({ ...c, eventId: record.id })));
    }
    if (nieuw.shifts.length > 0) {
      await db.insert(eventShifts).values(nieuw.shifts.map((s) => ({ ...s, eventId: record.id })));
    }

    await logAudit("copy_event", "event", record.id, null, {
      bron: bronId,
      taken: nieuw.tasks.length,
      kostenlijnen: nieuw.costs.length,
      shiften: nieuw.shifts.length,
    });
    revalidatePath("/beheerder/evenementen");
    return { success: true, data: { id: record.id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het kopiëren van het evenement." };
  }
}
