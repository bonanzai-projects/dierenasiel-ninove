/**
 * Epic 13, story 13.7 — zet handmatige kalenderitems met categorie "evenement" om
 * naar een echt evenement in de evenementenmodule.
 *
 * Sinds 13.7 kan die categorie niet meer aangemaakt worden; wat er al stond, hoort
 * thuis in de module (met draaiboek, kosten en vrijwilligers eronder).
 *
 * Draaien:  npm run db:migrate-kalender-evenementen
 * Idempotent: items die al een evenement met dezelfde naam én begindatum hebben,
 * worden overgeslagen. Verwijdert het kalenderitem pas nadat het evenement bestaat.
 */
import { db } from "@/lib/db";
import { calendarEvents, events } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function migrateCalendarEventsToEvents() {
  const rijen = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.category, "evenement"));

  let overgezet = 0;
  let overgeslagen = 0;

  for (const rij of rijen) {
    const [bestaat] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.name, rij.title), eq(events.date, rij.date)))
      .limit(1);

    if (bestaat) {
      console.log(`- "${rij.title}" bestaat al als evenement #${bestaat.id}, overgeslagen`);
      overgeslagen++;
      continue;
    }

    const [nieuw] = await db
      .insert(events)
      .values({
        name: rij.title,
        // "andere" claimt niets: het juiste type zet Sven zelf in één klik.
        type: "andere",
        status: "gepland",
        date: rij.date,
        endDate: rij.endDate,
        startTime: rij.startTime,
        endTime: rij.endTime,
        location: rij.location,
        description: rij.description,
        createdByUserId: rij.createdByUserId,
      })
      .returning();

    await db.delete(calendarEvents).where(eq(calendarEvents.id, rij.id));
    console.log(`+ "${rij.title}" (${rij.date}) -> evenement #${nieuw.id}, kalenderitem verwijderd`);
    overgezet++;
  }

  console.log(`\nKlaar: ${overgezet} overgezet, ${overgeslagen} overgeslagen.`);
  return { overgezet, overgeslagen };
}
