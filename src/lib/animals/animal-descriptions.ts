/**
 * Story 10.32 — één dier heeft drie teksten:
 *  - `description`        de uitgebreide beschrijving; de werktekst waar de rest van vertrekt
 *  - `websiteDescription` wat er op de publieke site komt
 *  - `posterDescription`  wat er op de affiche voor het bord buiten komt
 *
 * De twee laatste mogen leeg blijven; dan valt het oppervlak terug op de
 * uitgebreide beschrijving. Zo staat er nooit onbedoeld niets op de website of
 * op het blad, en hoeft niemand dezelfde tekst drie keer te onderhouden.
 */

function pickText(
  specific: string | null | undefined,
  fallback: string | null | undefined,
): string {
  const own = specific?.trim();
  if (own) return own;
  return fallback?.trim() ?? "";
}

/** Tekst voor het publieke dierprofiel. */
export function resolveWebsiteDescription(
  websiteDescription: string | null | undefined,
  description: string | null | undefined,
): string {
  return pickText(websiteDescription, description);
}

/** Tekst voor de affiche aan het bord buiten. */
export function resolvePosterDescription(
  posterDescription: string | null | undefined,
  description: string | null | undefined,
): string {
  return pickText(posterDescription, description);
}
