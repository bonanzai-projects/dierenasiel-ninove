/**
 * Categorieën van de gedeelde teamkalender (Epic 12, fase 1). Elke categorie
 * heeft één kleur — Sven's vraag: "verschillende categorieën in kleur".
 *
 * Fase 1 dekt de categorieën waarvoor al data bestaat. Evenementen, stage en
 * afstand-afspraken komen in fase 2 (nieuw datamodel) — zie epic 12.
 */
export type CalendarCategoryKey =
  // Fase 1 — afgeleid uit bestaande bronnen (read-only).
  | "adopties"
  | "medisch"
  | "wandelingen"
  | "todo"
  | "ibn"
  // Fase 2 — handmatige items die het team zelf beheert.
  | "evenement"
  | "stage"
  | "afstand"
  | "afspraak";

export interface CalendarCategory {
  key: CalendarCategoryKey;
  label: string;
  /** Tailwind-classes voor de event-pill (achtergrond/tekst/rand). */
  pill: string;
  /** Tailwind-class voor het gekleurde bolletje in de legende/lijst. */
  dot: string;
  /** true = door het team zelf aangemaakt (bewerkbaar), false = afgeleid. */
  manual: boolean;
}

export const CALENDAR_CATEGORIES: readonly CalendarCategory[] = [
  { key: "adopties", label: "Adopties", pill: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500", manual: false },
  { key: "medisch", label: "Afspraken (medisch)", pill: "bg-sky-100 text-sky-800 border-sky-300", dot: "bg-sky-500", manual: false },
  { key: "wandelingen", label: "Wandelingen", pill: "bg-violet-100 text-violet-800 border-violet-300", dot: "bg-violet-500", manual: false },
  { key: "todo", label: "To-do's", pill: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500", manual: false },
  { key: "ibn", label: "IBN-deadlines", pill: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500", manual: false },
  { key: "evenement", label: "Evenementen", pill: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300", dot: "bg-fuchsia-500", manual: true },
  { key: "stage", label: "Stage", pill: "bg-teal-100 text-teal-800 border-teal-300", dot: "bg-teal-500", manual: true },
  { key: "afstand", label: "Afstand", pill: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-500", manual: true },
  { key: "afspraak", label: "Afspraak", pill: "bg-indigo-100 text-indigo-800 border-indigo-300", dot: "bg-indigo-500", manual: true },
] as const;

/** De handmatige (door het team beheerde) categorieën — voor het invoerformulier. */
export const CALENDAR_MANUAL_CATEGORIES = CALENDAR_CATEGORIES.filter((c) => c.manual);

export const CALENDAR_CATEGORY_MAP: Record<CalendarCategoryKey, CalendarCategory> =
  Object.fromEntries(CALENDAR_CATEGORIES.map((c) => [c.key, c])) as Record<
    CalendarCategoryKey,
    CalendarCategory
  >;

export const CALENDAR_CATEGORY_KEYS: CalendarCategoryKey[] = CALENDAR_CATEGORIES.map(
  (c) => c.key,
);
