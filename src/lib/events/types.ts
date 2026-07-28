/**
 * Epic 13 — evenementenbeheer. Types en statussen van een evenement.
 *
 * De typelijst is een VOORSTEL op basis van wat een asiel doorgaans organiseert;
 * Sven moet ze nog bevestigen (vraag 1 uit epic-13-evenementenbeheer.md).
 * Uitbreiden = één regel hier, geen migratie: het type is een varchar.
 */

export interface EventType {
  key: string;
  label: string;
}

export const EVENT_TYPES: readonly EventType[] = [
  { key: "eetkermis", label: "Eetkermis" },
  { key: "quiz", label: "Quiz" },
  { key: "opendeurdag", label: "Opendeurdag" },
  { key: "kerstmarkt", label: "Kerstmarkt" },
  { key: "wafelverkoop", label: "Wafel- of koekjesverkoop" },
  { key: "markt", label: "Standje op een markt of beurs" },
  { key: "benefiet", label: "Benefiet" },
  { key: "andere", label: "Andere" },
] as const;

export const EVENT_TYPE_KEYS: string[] = EVENT_TYPES.map((t) => t.key);

export function eventTypeLabel(key: string): string {
  return EVENT_TYPES.find((t) => t.key === key)?.label ?? key;
}

export interface EventStatus {
  key: string;
  label: string;
  /** Tailwind-classes voor het statuslabel. */
  pill: string;
}

/**
 * Bewust HANDMATIG, niet afgeleid uit de datum: "concept" en "geannuleerd" vallen
 * niet uit een datum af te leiden, en half afleiden is verwarrender dan niet
 * afleiden. `isPastEvent` dient enkel om de lijst te splitsen.
 */
export const EVENT_STATUSES: readonly EventStatus[] = [
  { key: "concept", label: "Concept", pill: "bg-gray-100 text-gray-700 border-gray-300" },
  { key: "gepland", label: "Gepland", pill: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "afgelopen", label: "Afgelopen", pill: "bg-sky-100 text-sky-800 border-sky-300" },
  { key: "geannuleerd", label: "Geannuleerd", pill: "bg-red-100 text-red-800 border-red-300" },
] as const;

export const EVENT_STATUS_KEYS: string[] = EVENT_STATUSES.map((s) => s.key);

export function eventStatusLabel(key: string): string {
  return EVENT_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function eventStatusPill(key: string): string {
  return (
    EVENT_STATUSES.find((s) => s.key === key)?.pill ??
    "bg-gray-100 text-gray-700 border-gray-300"
  );
}

/**
 * Is het evenement voorbij op `vandaag` (beide YYYY-MM-DD)? De dag zelf telt nog
 * niet als voorbij — op de dag van de eetkermis wil je ze bovenaan zien staan.
 */
export function isPastEvent(
  event: { date: string; endDate?: string | null },
  vandaag: string,
): boolean {
  return (event.endDate || event.date) < vandaag;
}
