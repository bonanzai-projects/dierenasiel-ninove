/**
 * Bepaalt of de "melding"-velden (naam melder, datum, adres/vindplaats) getoond
 * en bewaard moeten worden bij een intake. Eén bron van waarheid, gedeeld door
 * het intakeformulier en de server-action zodat de conditie niet uit elkaar loopt.
 *
 * De velden zijn relevant bij:
 *  - een inbeslagname (IBN) — melder + betrokken instanties;
 *  - een vondeling — óók wanneer iemand het dier zelf komt brengen, niet enkel
 *    wanneer het asiel het gaat ophalen (Sven-feedback 2026-07-24);
 *  - elke intake die het asiel zelf is gaan ophalen (checkbox "opgehaald").
 */
export function shouldCollectMelderDetails(params: {
  intakeReason?: string | null;
  isPickedUpByShelter: boolean;
}): boolean {
  const { intakeReason, isPickedUpByShelter } = params;
  return (
    isPickedUpByShelter ||
    intakeReason === "ibn" ||
    intakeReason === "zwerfhond"
  );
}
