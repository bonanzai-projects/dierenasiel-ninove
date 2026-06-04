import { getIntakeReasonLabel } from "@/lib/constants";

/**
 * Formatteringslogica voor het R1-rapport "Overzicht dieren in asiel".
 * Gealigneerd op het as-is rapport van het asiel (Sven). Pure functies → unit-testbaar.
 *
 * NB: bewust géén kolommen voor `Nr`, `chip op asiel` en `vlooien` — die data
 * bestaat (nog) niet betrouwbaar in ons systeem (zie story 10.25, geparkeerde gaps).
 */

/** ISO-datum (YYYY-MM-DD) → DD-MM-YYYY. Lege/null → "". Niet-ISO → ruwe waarde. */
export function formatDateBE(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "Steriel door asiel" — combineert isNeutered + neuteredByShelter. */
export function sterielLabel(
  isNeutered: boolean | null | undefined,
  neuteredByShelter: boolean | null | undefined,
): string {
  if (!isNeutered) return "Nee";
  return neuteredByShelter ? "Ja (asiel)" : "Ja";
}

/** Vaccinatiedatum met '*' indien door het asiel toegediend (zoals Sven's "*in shelter"). */
export function vaccinDisplay(
  date: string | null | undefined,
  givenByShelter: boolean | null | undefined,
): string {
  const d = formatDateBE(date);
  if (!d) return "";
  return givenByShelter ? `${d} *` : d;
}

/** "Reden opvang" — reden-label + intakedatum (bv. "Afstand door eigenaar — 04-08-2025"). */
export function redenOpvangDisplay(
  intakeReason: string | null | undefined,
  intakeDate: string | null | undefined,
): string {
  const date = formatDateBE(intakeDate);
  const label = intakeReason ? getIntakeReasonLabel(intakeReason) : null;
  if (label && date) return `${label} — ${date}`;
  if (label) return label;
  if (date) return date;
  return "—";
}

/** Boolean → "Ja"/"Nee". */
export function jaNee(value: boolean | null | undefined): string {
  return value ? "Ja" : "Nee";
}

/** Boolean → "OK"/"" (zoals Sven's WEBSITE/ADOPTEER kolommen). */
export function okBlank(value: boolean | null | undefined): string {
  return value ? "OK" : "";
}

/**
 * Reduceert een lijst van per-dier-records naar de meest recente per `animalId`.
 * Vergelijkt op ISO-datum-string (lexicografisch correct). Bij gelijke datum
 * wint de eerst geziene rij.
 */
export function latestByAnimalId<T extends { animalId: number; date: string }>(
  rows: T[],
): Map<number, T> {
  const map = new Map<number, T>();
  for (const row of rows) {
    const current = map.get(row.animalId);
    if (!current || row.date > current.date) {
      map.set(row.animalId, row);
    }
  }
  return map;
}
