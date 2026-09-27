import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventCardDraws, eventCardSeries, eventCosts } from "@/lib/db/schema";

/**
 * Epic 13, story 13.15 — genummerde steunkaarten. Deze query's vangen bewust geen fouten
 * op: de acties controleren er overlap en trekkingen mee, en een lege lijst bij een
 * databankfout zou die controles stilletjes laten slagen.
 */

/** De reeksen van één evenement, op nummer. */
export async function getEventCardSeries(eventId: number) {
  return db
    .select()
    .from(eventCardSeries)
    .where(eq(eventCardSeries.eventId, eventId))
    .orderBy(asc(eventCardSeries.numberFrom));
}

/** De winnende nummers van één evenement, in de volgorde waarin ze getrokken werden. */
export async function getEventCardDraws(eventId: number) {
  return db
    .select()
    .from(eventCardDraws)
    .where(eq(eventCardDraws.eventId, eventId))
    .orderBy(asc(eventCardDraws.id));
}

export async function getCardSeriesById(id: number) {
  const [rij] = await db.select().from(eventCardSeries).where(eq(eventCardSeries.id, id)).limit(1);
  return rij ?? null;
}

export async function getCardDrawById(id: number) {
  const [rij] = await db.select().from(eventCardDraws).where(eq(eventCardDraws.id, id)).limit(1);
  return rij ?? null;
}

/** De opbrengstlijn die de app zelf bijhoudt uit de afgerekende steunkaarten. */
export async function getCardRevenueLine(eventId: number) {
  const [rij] = await db
    .select({ id: eventCosts.id, actualAmount: eventCosts.actualAmount })
    .from(eventCosts)
    .where(and(eq(eventCosts.eventId, eventId), eq(eventCosts.source, "steunkaarten")))
    .limit(1);
  return rij ?? null;
}
