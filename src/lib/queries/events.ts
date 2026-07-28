import { db } from "@/lib/db";
import { events, eventTasks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import type { EventRow } from "@/lib/actions/events";
import type { EventTaskRow } from "@/lib/actions/event-tasks";

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
