"use server";

import { db } from "@/lib/db";
import { walks, walkers, animals } from "@/lib/db/schema";
import { walkBookingSchema } from "@/lib/validations/walks";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getWalkingClubThreshold, getWalkDays } from "@/lib/queries/shelter-settings";
import { hasAcceptedCurrentRegulations } from "@/lib/walkers/regulations";
import type { ActionResult } from "@/types";
import type { Walk } from "@/types";

function currentTime(): string {
  return new Date().toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Story 10.77: zonder aanvaarding van de huidige versie van het reglement geen wandeling. */
const REGLEMENT_NIET_AANVAARD = "Aanvaard eerst het wandelreglement.";

function calculateDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export async function bookWalk(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<Walk>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  if (session.role !== "wandelaar") {
    return { success: false, error: "Alleen wandelaars kunnen wandelingen boeken." };
  }

  // Look up walker profile by userId
  const walkerResults = await db
    .select()
    .from(walkers)
    .where(eq(walkers.userId, session.userId))
    .limit(1);

  if (walkerResults.length === 0) {
    return { success: false, error: "Wandelaar profiel niet gevonden." };
  }

  const walker = walkerResults[0];

  if (walker.status !== "approved") {
    return { success: false, error: "Uw registratie is nog niet goedgekeurd." };
  }

  if (!hasAcceptedCurrentRegulations(walker)) {
    return { success: false, error: REGLEMENT_NIET_AANVAARD };
  }

  // Validate input
  const raw = {
    animalId: formData.get("animalId") as string,
    date: formData.get("date") as string,
    startTime: formData.get("startTime") as string,
    remarks: (formData.get("remarks") as string) || "",
  };

  const parsed = walkBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    // Verify animal: must be a dog in shelter
    const animalResults = await db
      .select()
      .from(animals)
      .where(eq(animals.id, parsed.data.animalId))
      .limit(1);

    if (animalResults.length === 0) {
      return { success: false, error: "Dier niet gevonden." };
    }

    const animal = animalResults[0];
    if (animal.species !== "hond" || !animal.isInShelter) {
      return { success: false, error: "Dit dier is geen hond in het asiel." };
    }

    // Story 10.13: enkel boeken op toegestane weekdagen.
    const allowedDays = await getWalkDays();
    const dateOnly = parsed.data.date; // YYYY-MM-DD
    const dayOfWeek = new Date(`${dateOnly}T00:00:00`).getDay();
    if (!allowedDays.includes(dayOfWeek)) {
      return {
        success: false,
        error: "Op deze dag is wandelen niet mogelijk. Kies een andere datum.",
      };
    }

    // Create walk
    const [walk] = await db
      .insert(walks)
      .values({
        walkerId: walker.id,
        animalId: parsed.data.animalId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: null,
        durationMinutes: null,
        remarks: parsed.data.remarks || null,
        status: "planned",
      })
      .returning();

    await logAudit("walk.booked", "walk", walk.id, null, walk);
    revalidatePath("/wandelaar");

    return {
      success: true,
      data: walk as Walk,
      message: "Wandeling succesvol geboekt!",
    };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis. Probeer het later opnieuw.",
    };
  }
}

export async function checkInWalk(walkId: number): Promise<ActionResult<Walk>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  try {
    // Look up walker
    const walkerResults = await db
      .select()
      .from(walkers)
      .where(eq(walkers.userId, session.userId))
      .limit(1);

    if (walkerResults.length === 0) {
      return { success: false, error: "Wandelaar profiel niet gevonden." };
    }

    const walker = walkerResults[0];

    // Story 10.77: een wandeling die vóór een nieuwe versie geboekt werd, start pas na akkoord.
    if (!hasAcceptedCurrentRegulations(walker)) {
      return { success: false, error: REGLEMENT_NIET_AANVAARD };
    }

    // Look up walk
    const walkResults = await db
      .select()
      .from(walks)
      .where(eq(walks.id, walkId))
      .limit(1);

    if (walkResults.length === 0) {
      return { success: false, error: "Wandeling niet gevonden." };
    }

    const walk = walkResults[0];

    if (walk.walkerId !== walker.id) {
      return { success: false, error: "Deze wandeling behoort niet tot uw profiel." };
    }

    if (walk.status !== "planned") {
      return { success: false, error: "Deze wandeling kan niet worden ingecheckt." };
    }

    const startTime = currentTime();

    const [updated] = await db
      .update(walks)
      .set({ status: "in_progress", startTime })
      .where(eq(walks.id, walkId))
      .returning();

    await logAudit("walk.checked_in", "walk", walkId, { status: walk.status }, { status: "in_progress", startTime });
    revalidatePath("/wandelaar");

    return {
      success: true,
      data: updated as Walk,
      message: "Inchecken geslaagd! Veel plezier met de wandeling.",
    };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis. Probeer het later opnieuw.",
    };
  }
}

export async function checkOutWalk(walkId: number, remarks: string): Promise<ActionResult<Walk>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Je bent niet ingelogd." };
  }

  try {
    // Look up walker
    const walkerResults = await db
      .select()
      .from(walkers)
      .where(eq(walkers.userId, session.userId))
      .limit(1);

    if (walkerResults.length === 0) {
      return { success: false, error: "Wandelaar profiel niet gevonden." };
    }

    const walker = walkerResults[0];

    // Look up walk
    const walkResults = await db
      .select()
      .from(walks)
      .where(eq(walks.id, walkId))
      .limit(1);

    if (walkResults.length === 0) {
      return { success: false, error: "Wandeling niet gevonden." };
    }

    const walk = walkResults[0];

    if (walk.walkerId !== walker.id) {
      return { success: false, error: "Deze wandeling behoort niet tot uw profiel." };
    }

    if (walk.status !== "in_progress") {
      return { success: false, error: "Deze wandeling is niet ingecheckt." };
    }

    const endTime = currentTime();
    const durationMinutes = calculateDuration(walk.startTime, endTime);

    const [updated] = await db
      .update(walks)
      .set({
        status: "completed",
        endTime,
        durationMinutes,
        remarks: remarks || null,
      })
      .where(eq(walks.id, walkId))
      .returning();

    // Increment walker walkCount (AC3)
    await db
      .update(walkers)
      .set({ walkCount: sql`${walkers.walkCount} + 1` })
      .where(eq(walkers.id, walker.id));

    // Auto-promote to walking club if threshold reached (Story 5.6 AC1)
    if (!walker.isWalkingClubMember) {
      const threshold = await getWalkingClubThreshold();
      const newCount = (walker.walkCount ?? 0) + 1;
      if (newCount >= threshold) {
        await db
          .update(walkers)
          .set({ isWalkingClubMember: true })
          .where(eq(walkers.id, walker.id));

        await logAudit("walker.walking_club_promoted", "walker", walker.id, { isWalkingClubMember: false }, { isWalkingClubMember: true, walkCount: newCount });
      }
    }

    await logAudit("walk.checked_out", "walk", walkId, { status: walk.status }, { status: "completed", endTime, durationMinutes });
    revalidatePath("/wandelaar");
    revalidatePath("/beheerder/wandelaars");

    return {
      success: true,
      data: updated as Walk,
      message: `Wandeling voltooid! Duur: ${durationMinutes} minuten.`,
    };
  } catch {
    return {
      success: false,
      error: "Er ging iets mis. Probeer het later opnieuw.",
    };
  }
}
