import { db } from "@/lib/db";
import {
  animals,
  kennismakingen,
  adoptionContracts,
  postAdoptionFollowups,
  vetVisits,
  operations,
  walks,
  animalTodos,
  calendarEvents,
} from "@/lib/db/schema";
import { and, gte, lte, eq, isNotNull } from "drizzle-orm";
import type { CalendarEvent } from "@/lib/calendar/events";
import type { CalendarCategoryKey } from "@/lib/calendar/categories";

interface Range {
  /** YYYY-MM-DD, inclusief. */
  start: string;
  /** YYYY-MM-DD, inclusief. */
  end: string;
}

/** Zet een timestamptz om naar de Belgische datum (YYYY-MM-DD) + tijd (HH:MM). */
function toBelgian(d: Date): { date: string; time: string } {
  const date = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const time = d.toLocaleTimeString("nl-BE", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
}

const animalHref = (id: number | null) =>
  id ? `/beheerder/dieren/${id}` : undefined;

/**
 * Haalt alle kalender-events op binnen [start, end] uit de bestaande bronnen
 * (fase 1: adopties, medische afspraken, wandelingen, to-do's, IBN-deadlines).
 * Elke bron faalt onafhankelijk: een lege bron blokkeert de rest niet.
 */
export async function getCalendarEvents({ start, end }: Range): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // — Adopties: kennismakingen (afspraak met tijd) —
  try {
    // scheduledAt is timestamptz; ruime marge ophalen en op Belgische datum filteren.
    const lower = new Date(`${start}T00:00:00Z`);
    lower.setUTCDate(lower.getUTCDate() - 1);
    const upper = new Date(`${end}T23:59:59Z`);
    upper.setUTCDate(upper.getUTCDate() + 1);
    const rows = await db
      .select({
        id: kennismakingen.id,
        scheduledAt: kennismakingen.scheduledAt,
        status: kennismakingen.status,
        animalName: animals.name,
        animalId: kennismakingen.animalId,
      })
      .from(kennismakingen)
      .leftJoin(animals, eq(kennismakingen.animalId, animals.id))
      .where(and(gte(kennismakingen.scheduledAt, lower), lte(kennismakingen.scheduledAt, upper)));
    for (const r of rows) {
      const { date, time } = toBelgian(r.scheduledAt);
      if (date < start || date > end) continue;
      events.push({
        id: `kennismaking-${r.id}`,
        category: "adopties",
        date,
        time,
        title: r.animalName ? `Kennismaking: ${r.animalName}` : "Kennismaking",
        href: "/beheerder/adoptie",
        status: r.status,
      });
    }
  } catch (err) {
    console.error("calendar: kennismakingen failed", err);
  }

  // — Adopties: adoptiedatum + DogID/CatID-overdracht deadline —
  try {
    const rows = await db
      .select({
        id: adoptionContracts.id,
        contractDate: adoptionContracts.contractDate,
        deadline: adoptionContracts.dogidCatidTransferDeadline,
        transferred: adoptionContracts.dogidCatidTransferred,
        animalId: adoptionContracts.animalId,
        animalName: animals.name,
        snapshotName: adoptionContracts.snapshotAnimalName,
      })
      .from(adoptionContracts)
      .leftJoin(animals, eq(adoptionContracts.animalId, animals.id));
    for (const r of rows) {
      const name = r.animalName ?? r.snapshotName ?? undefined;
      if (r.contractDate >= start && r.contractDate <= end) {
        events.push({
          id: `contract-${r.id}`,
          category: "adopties",
          date: r.contractDate,
          title: name ? `Adoptie: ${name}` : "Adoptie",
          href: "/beheerder/adoptie",
        });
      }
      if (r.deadline && !r.transferred && r.deadline >= start && r.deadline <= end) {
        events.push({
          id: `transfer-${r.id}`,
          category: "adopties",
          date: r.deadline,
          title: name ? `DogID/CatID-overdracht: ${name}` : "DogID/CatID-overdracht",
          href: "/beheerder/adoptie",
        });
      }
    }
  } catch (err) {
    console.error("calendar: adoptionContracts failed", err);
  }

  // — Adopties: post-adoptie opvolgingen —
  try {
    const rows = await db
      .select({
        id: postAdoptionFollowups.id,
        date: postAdoptionFollowups.date,
        status: postAdoptionFollowups.status,
      })
      .from(postAdoptionFollowups)
      .where(and(gte(postAdoptionFollowups.date, start), lte(postAdoptionFollowups.date, end)));
    for (const r of rows) {
      events.push({
        id: `followup-${r.id}`,
        category: "adopties",
        date: r.date,
        title: "Post-adoptie opvolging",
        href: "/beheerder/adoptie",
        status: r.status,
      });
    }
  } catch (err) {
    console.error("calendar: postAdoptionFollowups failed", err);
  }

  // — Medisch: dierenarts-bezoeken —
  try {
    const rows = await db
      .select({
        id: vetVisits.id,
        date: vetVisits.date,
        isCompleted: vetVisits.isCompleted,
        animalId: vetVisits.animalId,
        animalName: animals.name,
      })
      .from(vetVisits)
      .leftJoin(animals, eq(vetVisits.animalId, animals.id))
      .where(and(gte(vetVisits.date, start), lte(vetVisits.date, end)));
    for (const r of rows) {
      events.push({
        id: `vetvisit-${r.id}`,
        category: "medisch",
        date: r.date,
        title: r.animalName ? `Dierenarts: ${r.animalName}` : "Dierenarts-bezoek",
        href: animalHref(r.animalId),
        status: r.isCompleted ? "voltooid" : "gepland",
      });
    }
  } catch (err) {
    console.error("calendar: vetVisits failed", err);
  }

  // — Medisch: geplande operaties —
  try {
    const rows = await db
      .select({
        id: operations.id,
        date: operations.date,
        type: operations.type,
        status: operations.status,
        animalId: operations.animalId,
        animalName: animals.name,
      })
      .from(operations)
      .leftJoin(animals, eq(operations.animalId, animals.id))
      .where(and(gte(operations.date, start), lte(operations.date, end)));
    for (const r of rows) {
      const who = r.animalName ? `: ${r.animalName}` : "";
      events.push({
        id: `operation-${r.id}`,
        category: "medisch",
        date: r.date,
        title: `Operatie (${r.type})${who}`,
        href: animalHref(r.animalId),
        status: r.status,
      });
    }
  } catch (err) {
    console.error("calendar: operations failed", err);
  }

  // — Wandelingen: geboekte wandelingen —
  try {
    const rows = await db
      .select({
        id: walks.id,
        date: walks.date,
        startTime: walks.startTime,
        status: walks.status,
        animalId: walks.animalId,
        animalName: animals.name,
      })
      .from(walks)
      .leftJoin(animals, eq(walks.animalId, animals.id))
      .where(and(gte(walks.date, start), lte(walks.date, end)));
    for (const r of rows) {
      events.push({
        id: `walk-${r.id}`,
        category: "wandelingen",
        date: r.date,
        time: r.startTime,
        title: r.animalName ? `Wandeling: ${r.animalName}` : "Wandeling",
        href: animalHref(r.animalId),
        status: r.status,
      });
    }
  } catch (err) {
    console.error("calendar: walks failed", err);
  }

  // — To-do's met deadline (open) —
  try {
    const rows = await db
      .select({
        id: animalTodos.id,
        dueDate: animalTodos.dueDate,
        description: animalTodos.description,
        priority: animalTodos.priority,
        animalId: animalTodos.animalId,
        animalName: animals.name,
      })
      .from(animalTodos)
      .leftJoin(animals, eq(animalTodos.animalId, animals.id))
      .where(
        and(
          eq(animalTodos.isCompleted, false),
          isNotNull(animalTodos.dueDate),
          gte(animalTodos.dueDate, start),
          lte(animalTodos.dueDate, end),
        ),
      );
    for (const r of rows) {
      const who = r.animalName ? ` (${r.animalName})` : "";
      events.push({
        id: `todo-${r.id}`,
        category: "todo",
        date: r.dueDate as string,
        title: `To-do: ${r.description}${who}`,
        href: animalHref(r.animalId),
        status: r.priority,
      });
    }
  } catch (err) {
    console.error("calendar: animalTodos failed", err);
  }

  // — IBN 60-dagen beslissingsdeadlines —
  try {
    const rows = await db
      .select({
        id: animals.id,
        deadline: animals.ibnDecisionDeadline,
        name: animals.name,
      })
      .from(animals)
      .where(
        and(
          isNotNull(animals.ibnDecisionDeadline),
          gte(animals.ibnDecisionDeadline, start),
          lte(animals.ibnDecisionDeadline, end),
        ),
      );
    for (const r of rows) {
      events.push({
        id: `ibn-${r.id}`,
        category: "ibn",
        date: r.deadline as string,
        title: `IBN-deadline: ${r.name}`,
        href: animalHref(r.id),
      });
    }
  } catch (err) {
    console.error("calendar: ibn deadlines failed", err);
  }

  // — Handmatige kalender-items (fase 2: evenement/stage/afstand/afspraak) —
  try {
    const rows = await db
      .select({
        id: calendarEvents.id,
        category: calendarEvents.category,
        date: calendarEvents.date,
        startTime: calendarEvents.startTime,
        title: calendarEvents.title,
      })
      .from(calendarEvents)
      .where(and(gte(calendarEvents.date, start), lte(calendarEvents.date, end)));
    for (const r of rows) {
      events.push({
        id: `event-${r.id}`,
        category: r.category as CalendarCategoryKey,
        date: r.date,
        time: r.startTime,
        title: r.title,
        href: `/beheerder/kalender/${r.id}`,
      });
    }
  } catch (err) {
    console.error("calendar: manual events failed", err);
  }

  return events;
}

/** Haalt één handmatig kalender-item op (voor de bewerkpagina). */
export async function getCalendarEventById(id: number) {
  const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  return row ?? null;
}
