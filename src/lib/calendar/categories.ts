/**
 * Categorieën van de gedeelde teamkalender (Epic 12, fase 1). Elke categorie
 * heeft één kleur — Sven's vraag: "verschillende categorieën in kleur".
 *
 * Fase 1 dekt de categorieën waarvoor al data bestaat. Evenementen, stage en
 * afstand-afspraken komen in fase 2 (nieuw datamodel) — zie epic 12.
 */
export type CalendarCategoryKey =
  | "adopties"
  | "medisch"
  | "wandelingen"
  | "todo"
  | "ibn";

export interface CalendarCategory {
  key: CalendarCategoryKey;
  label: string;
  /** Tailwind-classes voor de event-pill (achtergrond/tekst/rand). */
  pill: string;
  /** Tailwind-class voor het gekleurde bolletje in de legende/lijst. */
  dot: string;
}

export const CALENDAR_CATEGORIES: readonly CalendarCategory[] = [
  { key: "adopties", label: "Adopties", pill: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" },
  { key: "medisch", label: "Afspraken (medisch)", pill: "bg-sky-100 text-sky-800 border-sky-300", dot: "bg-sky-500" },
  { key: "wandelingen", label: "Wandelingen", pill: "bg-violet-100 text-violet-800 border-violet-300", dot: "bg-violet-500" },
  { key: "todo", label: "To-do's", pill: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" },
  { key: "ibn", label: "IBN-deadlines", pill: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
] as const;

export const CALENDAR_CATEGORY_MAP: Record<CalendarCategoryKey, CalendarCategory> =
  Object.fromEntries(CALENDAR_CATEGORIES.map((c) => [c.key, c])) as Record<
    CalendarCategoryKey,
    CalendarCategory
  >;

export const CALENDAR_CATEGORY_KEYS: CalendarCategoryKey[] = CALENDAR_CATEGORIES.map(
  (c) => c.key,
);
