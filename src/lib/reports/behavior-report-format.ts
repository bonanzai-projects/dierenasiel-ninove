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

/**
 * Bouwt de kolommen van de matrix: één kolom per gedragsfiche (oudste links),
 * aangevuld met lege kolommen tot `minColumns` zodat het rapport ook bij weinig
 * of geen fiches het formaat van het blanco formulier aanhoudt.
 */
export function buildBehaviorColumns<T extends { date: string }>(
  records: T[],
  minColumns: number,
): (T | null)[] {
  const columns: (T | null)[] = [...sortBehaviorRecordsAsc(records)];
  while (columns.length < minColumns) columns.push(null);
  return columns;
}

/**
 * Splitst de kolommen in blokken van maximaal `maxPerBlock`, zodat een dier met
 * veel evaluaties over meerdere matrices wordt verdeeld i.p.v. in onleesbaar
 * smalle kolommen te worden geperst. Geeft altijd minstens één blok terug.
 */
export function chunkBehaviorColumns<T>(
  columns: T[],
  maxPerBlock: number,
): T[][] {
  if (columns.length === 0) return [[]];
  const blocks: T[][] = [];
  for (let i = 0; i < columns.length; i += maxPerBlock) {
    blocks.push(columns.slice(i, i + maxPerBlock));
  }
  return blocks;
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

/**
 * Naam van wie de fiche invulde (Story 10.54, vraag Sven). Leeg bij een lege
 * kolom van het blanco formulier of wanneer de invuller niet gekend is —
 * fiches van vóór deze story hebben geen ingelogde gebruiker bij zich.
 */
export function behaviorRecorder(
  column: { recordedByName?: string | null } | null | undefined,
): string {
  return column?.recordedByName?.trim() ?? "";
}
