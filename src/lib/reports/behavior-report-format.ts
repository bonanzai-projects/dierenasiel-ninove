/**
 * Formatteringslogica voor het R4-rapport "Evaluatiefiche van het gedrag in het asiel"
 * (Bijlage VIII B bij het KB van 27 april 2007). Pure functies → unit-testbaar.
 *
 * De officiële fiche is een matrix: criteria als rijen, elke evaluatiedatum als kolom
 * (minimum eenmaal per week gedurende de eerste drie weken). Daarom worden records
 * oplopend op datum gesorteerd zodat de oudste evaluatie links staat.
 */

/** Sorteer gedragsfiches oplopend op datum (oudste eerst), stabiel, zonder mutatie. */
export function sortBehaviorRecordsAsc<T extends { date: string }>(records: T[]): T[] {
  return records
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.date < b.r.date ? -1 : a.r.date > b.r.date ? 1 : a.i - b.i))
    .map(({ r }) => r);
}

/** Antwoord voor één criterium → "Ja" / "Nee" / "" (leeg bij null/onbekend/ontbrekend). */
export function behaviorAnswer(
  checklist: Record<string, unknown> | null | undefined,
  key: string,
): string {
  if (!checklist) return "";
  const val = checklist[key];
  if (val === true) return "Ja";
  if (val === false) return "Nee";
  return "";
}
