/**
 * Epic 13, story 13.7 — evenementen op de gedeelde teamkalender.
 *
 * Sven, vraag 27 (2026-08-06): "Moet een evenement ook op de gedeelde teamkalender
 * verschijnen? ja".
 *
 * Het evenement blijft leven in zijn eigen module; de kalender toont het als
 * **afgeleide** bron, net als adopties en wandelingen. Pure functie, geen database.
 */
import type { CalendarEvent } from "./events";
import { expandEventDates } from "./events";

export interface CalendarSourceEvent {
  id: number;
  name: string;
  status: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
}

export function eventsToCalendar(
  rows: readonly CalendarSourceEvent[],
  start: string,
  end: string,
): CalendarEvent[] {
  const items: CalendarEvent[] = [];

  for (const row of rows) {
    // Een geannuleerd evenement hoort niet op de kalender: het gaat niet door.
    // Een concept wél — dat is precies wat je maanden vooraf wil zien staan.
    if (row.status === "geannuleerd") continue;

    for (const day of expandEventDates(row.date, row.endDate, start, end)) {
      items.push({
        id: `evenement-${row.id}-${day}`,
        category: "evenement",
        date: day,
        // Beginuur enkel op de eerste dag (op vervolgdagen is het misleidend).
        time: day === row.date ? row.startTime : null,
        title: row.status === "concept" ? `${row.name} (concept)` : row.name,
        href: `/beheerder/evenementen/${row.id}`,
        status: row.status,
      });
    }
  }

  return items;
}
