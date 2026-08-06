/**
 * Epic 13, story 13.8 — een seintje wanneer een draaiboektaak nadert.
 *
 * Sven, vraag 21 (2026-08-06): *"In timing komen we ons zeer dikwijls tegen = te laat
 * met dingen. Dus zou handig zijn als je de timing … in een agenda kan zetten dat je
 * getriggerd wordt."* En vraag 29: *"Willen jullie herinneringen? Zeker wel."*
 *
 * Op de vraag "wat wil je een jaar later terugvinden" antwoordt hij dus eigenlijk:
 * de timing. Niet een verslag achteraf, maar taken die op tijd bovendrijven.
 *
 * Pure logica, geen database. Alle datums zijn YYYY-MM-DD.
 */

export interface ReminderTask {
  id: number;
  eventId: number;
  eventName: string;
  phase: string;
  title: string;
  date: string | null;
  time: string | null;
  responsible: string | null;
  done: boolean;
}

export type ReminderUrgency = "verlopen" | "vandaag" | "binnenkort";

export interface Reminder extends ReminderTask {
  /** Dagen tot de taak; negatief = te laat. */
  days: number;
  urgency: ReminderUrgency;
  /** "3 dagen te laat", "Vandaag", "Morgen", "over 5 dagen". */
  label: string;
}

/**
 * Twee weken vooruit. Verder kijken maakt van een herinnering een tweede
 * takenlijst; het draaiboek zelf staat al op de fiche.
 */
export const REMINDER_HORIZON_DAYS = 14;

/** Verschil in dagen tussen twee ISO-datums, op de middag in UTC (DST-veilig). */
function diffDays(vanaf: string, tot: string): number {
  const a = new Date(`${vanaf}T12:00:00Z`).getTime();
  const b = new Date(`${tot}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function label(days: number): string {
  if (days < 0) {
    const laat = Math.abs(days);
    return `${laat} ${laat === 1 ? "dag" : "dagen"} te laat`;
  }
  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  return `over ${days} dagen`;
}

/**
 * Hoe dringend is één datum, gezien vanaf `today`? Ook gebruikt door het draaiboek
 * op de fiche, zodat een taak die te laat is daar met hetzelfde woord staat als in
 * het seintje op het dashboard.
 */
export function describeDeadline(
  date: string,
  today: string,
): { days: number; urgency: ReminderUrgency; label: string } {
  const days = diffDays(today, date);
  return {
    days,
    urgency: days < 0 ? "verlopen" : days === 0 ? "vandaag" : "binnenkort",
    label: label(days),
  };
}

/**
 * De taken die aandacht vragen: nog niet afgevinkt, met een datum, en die datum
 * ligt binnen de horizon — of is al voorbij.
 *
 * **Alles wat te laat is blijft staan, hoe oud ook.** Een taak van drie maanden
 * geleden die nog altijd niet afgevinkt is, is precies waar Sven zich op stukloopt;
 * die laten wegvallen zou het probleem verbergen in plaats van tonen.
 */
export function taskReminders(
  tasks: readonly ReminderTask[],
  today: string,
  horizonDays: number = REMINDER_HORIZON_DAYS,
): Reminder[] {
  return tasks
    .filter((t) => !t.done && t.date)
    .map((t) => ({ ...t, ...describeDeadline(t.date as string, today) }))
    .filter((r) => r.days <= horizonDays)
    .sort((a, b) => {
      if (a.days !== b.days) return a.days - b.days;
      // Binnen dezelfde dag: een taak zonder uur geldt voor de hele dag en staat vooraan.
      if (a.time !== b.time) {
        if (!a.time) return -1;
        if (!b.time) return 1;
        return a.time.localeCompare(b.time);
      }
      return a.id - b.id;
    });
}

export function reminderCounts(reminders: readonly Reminder[]): {
  verlopen: number;
  vandaag: number;
  binnenkort: number;
  totaal: number;
} {
  return {
    verlopen: reminders.filter((r) => r.urgency === "verlopen").length,
    vandaag: reminders.filter((r) => r.urgency === "vandaag").length,
    binnenkort: reminders.filter((r) => r.urgency === "binnenkort").length,
    totaal: reminders.length,
  };
}
