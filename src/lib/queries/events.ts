import { db } from "@/lib/db";
import {
  events,
  eventTasks,
  eventCosts,
  eventShifts,
  eventEvaluations,
  eventMaterials,
} from "@/lib/db/schema";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { taskReminders, type Reminder } from "@/lib/events/reminders";
import type { YearOverviewInput } from "@/lib/events/yearly";
import type { EventRow } from "@/lib/actions/events";
import type { EventTaskRow } from "@/lib/actions/event-tasks";
import type { EventCostRow } from "@/lib/actions/event-costs";
import type { EventShiftRow } from "@/lib/actions/event-shifts";
import type { EventEvaluationRow } from "@/lib/actions/event-evaluations";
import type { EventMaterialRow } from "@/lib/actions/event-materials";

/** Alle evenementen, recentste datum eerst. */
export async function getEvents(): Promise<EventRow[]> {
  return db.select().from(events).orderBy(desc(events.date), desc(events.id));
}

export async function getEventById(id: number): Promise<EventRow | null> {
  const [record] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return record ?? null;
}

/**
 * De draaiboektaken van één evenement. De sortering per fase gebeurt in
 * `groupTasksByPhase` — hier volstaat een stabiele volgorde.
 */
export async function getEventTasks(eventId: number): Promise<EventTaskRow[]> {
  return db.select().from(eventTasks).where(eq(eventTasks.eventId, eventId));
}

/**
 * De kosten- en opbrengstlijnen van één evenement (story 13.5). Het splitsen en
 * optellen gebeurt in `splitCostLines` / `summarizeCosts`.
 */
export async function getEventCosts(eventId: number): Promise<EventCostRow[]> {
  return db.select().from(eventCosts).where(eq(eventCosts.eventId, eventId));
}

/**
 * Wie staat waar en wanneer (story 13.6). Het groeperen per dag en per post
 * gebeurt in `groupShiftsByDay`.
 */
export async function getEventShifts(eventId: number): Promise<EventShiftRow[]> {
  return db.select().from(eventShifts).where(eq(eventShifts.eventId, eventId));
}

/** De materiaallijst van één evenement (story 13.11). */
export async function getEventMaterials(eventId: number): Promise<EventMaterialRow[]> {
  return db.select().from(eventMaterials).where(eq(eventMaterials.eventId, eventId));
}

/**
 * Story 13.10 — wat de vorige editie ons leerde. Dit is waarom de evaluatie bestaat:
 * ze moet terugkomen wanneer je de volgende editie voorbereidt, niet in een la liggen.
 */
export async function getPreviousEditionLessons(
  copiedFromEventId: number | null,
): Promise<{ id: number; name: string; couldBeBetter: string | null; agreements: string | null } | null> {
  if (!copiedFromEventId) return null;

  const [row] = await db
    .select({
      id: events.id,
      name: events.name,
      couldBeBetter: eventEvaluations.couldBeBetter,
      agreements: eventEvaluations.agreements,
    })
    .from(events)
    .leftJoin(eventEvaluations, eq(eventEvaluations.eventId, events.id))
    .where(eq(events.id, copiedFromEventId))
    .limit(1);

  if (!row) return null;
  if (!row.couldBeBetter && !row.agreements) return null;
  return row;
}

/** De evaluatie van één evenement (story 13.9), of null zolang ze niet bestaat. */
export async function getEventEvaluation(eventId: number): Promise<EventEvaluationRow | null> {
  const [row] = await db
    .select()
    .from(eventEvaluations)
    .where(eq(eventEvaluations.eventId, eventId))
    .limit(1);
  return row ?? null;
}

/**
 * Story 13.8 — draaiboektaken die aandacht vragen: nog niet afgevinkt, met een
 * datum, en binnenkort of al voorbij. Taken van een geannuleerd evenement tellen
 * niet mee: daar valt niets meer te laat aan te komen.
 *
 * Het filteren op de horizon gebeurt in `taskReminders` — daar zit ook de sortering
 * en de labeling, en zo blijft die logica testbaar zonder databank.
 */
export async function getEventTaskReminders(today: string): Promise<Reminder[]> {
  const rows = await db
    .select({
      id: eventTasks.id,
      eventId: events.id,
      eventName: events.name,
      phase: eventTasks.phase,
      title: eventTasks.title,
      date: eventTasks.date,
      time: eventTasks.time,
      responsible: eventTasks.responsible,
      done: eventTasks.done,
    })
    .from(eventTasks)
    .innerJoin(events, eq(eventTasks.eventId, events.id))
    .where(
      and(
        eq(eventTasks.done, false),
        isNotNull(eventTasks.date),
        ne(events.status, "geannuleerd"),
      ),
    );

  return taskReminders(rows, today);
}

/**
 * Story 13.12 — alles wat het jaaroverzicht nodig heeft, in drie selects.
 * Bij zo'n veertien evenementen per jaar is optellen in code goedkoper dan drie
 * groeperende queries, en het is dezelfde optelling als op de fiche.
 */
export async function getYearOverviewData(): Promise<YearOverviewInput> {
  const [alleEvents, alleCosts, alleEvaluations] = await Promise.all([
    db
      .select({
        id: events.id,
        name: events.name,
        type: events.type,
        status: events.status,
        date: events.date,
        endDate: events.endDate,
      })
      .from(events),
    db
      .select({
        eventId: eventCosts.eventId,
        kind: eventCosts.kind,
        budgetAmount: eventCosts.budgetAmount,
        actualAmount: eventCosts.actualAmount,
      })
      .from(eventCosts),
    db
      .select({
        eventId: eventEvaluations.eventId,
        visitors: eventEvaluations.visitors,
        paidPlates: eventEvaluations.paidPlates,
      })
      .from(eventEvaluations),
  ]);

  return { events: alleEvents, costs: alleCosts, evaluations: alleEvaluations };
}
