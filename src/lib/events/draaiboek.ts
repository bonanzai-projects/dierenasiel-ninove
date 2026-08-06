/**
 * Epic 13, story 13.2 — het draaiboek van een evenement.
 *
 * VASTE fasen in plaats van vrije groepen: een draaiboek dat je eerst zelf moet
 * structureren, wordt geen draaiboek. Pure logica, geen database.
 *
 * Sinds story 13.3 zijn het er vier: Sven vroeg de evaluatie er als fase bij
 * (vraag 7, 2026-08-06). Het gaat om de taken ná de opkuis — de evaluatie
 * plannen, cijfers opvragen, afspraken vastleggen — niet om de evaluatie zelf.
 */

export interface DraaiboekPhase {
  key: string;
  label: string;
  /** Korte toelichting onder de fase-titel. */
  hint: string;
}

export const DRAAIBOEK_PHASES: readonly DraaiboekPhase[] = [
  {
    key: "voorbereiding",
    label: "Voorbereiding",
    hint: "Alles wat vooraf moet gebeuren: zaal, vergunning, drank bestellen, affiches.",
  },
  {
    key: "dag-zelf",
    label: "De dag zelf",
    hint: "Het uurschema van de dag: opbouw, openen, bedienen, sluiten.",
  },
  {
    key: "afbraak",
    label: "Afbraak & nazorg",
    hint: "Opruimen, materiaal terugbrengen, afrekenen, bedanken.",
  },
  {
    key: "evaluatie",
    label: "Evaluatie",
    hint: "Wat we nadien nog willen weten: cijfers opvragen, samenzitten, afspraken voor volgend jaar.",
  },
] as const;

export const DRAAIBOEK_PHASE_KEYS: string[] = DRAAIBOEK_PHASES.map((f) => f.key);

export function draaiboekPhaseLabel(key: string): string {
  return DRAAIBOEK_PHASES.find((f) => f.key === key)?.label ?? key;
}

interface Taak {
  id: number;
  phase: string;
  date: string | null;
  time: string | null;
  sortOrder: number;
  done: boolean;
}

/** Leeg (null) sorteert achteraan bij een datum, vooraan bij een uur — zie hieronder. */
function vergelijk<T extends Taak>(a: T, b: T): number {
  // Een taak zonder datum hoort "ergens in deze fase" en zakt naar onder.
  if (a.date !== b.date) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  }
  // Binnen dezelfde dag staat een taak zonder uur juist bovenaan: die geldt
  // voor de hele dag, niet ná het laatste uurtje.
  if (a.time !== b.time) {
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id - b.id;
}

/**
 * Verdeelt de taken over de drie fasen, elk gesorteerd. Alle fasen komen terug,
 * ook de lege — het draaiboek toont dan wat er nog ontbreekt. Een taak met een
 * onbekende fase belandt bij de voorbereiding in plaats van te verdwijnen.
 */
export function groupTasksByPhase<T extends Taak>(
  tasks: readonly T[],
): { phase: string; label: string; hint: string; tasks: T[] }[] {
  return DRAAIBOEK_PHASES.map((fase, index) => ({
    phase: fase.key,
    label: fase.label,
    hint: fase.hint,
    tasks: tasks
      .filter((t) =>
        DRAAIBOEK_PHASE_KEYS.includes(t.phase) ? t.phase === fase.key : index === 0,
      )
      .sort(vergelijk),
  }));
}

export function draaiboekProgress(
  tasks: readonly { done: boolean }[],
): { done: number; total: number; pct: number } {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
