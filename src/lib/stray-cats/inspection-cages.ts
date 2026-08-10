/**
 * Per kooi bijhouden of er vangst was tijdens een inspectieronde.
 *
 * De kooien van een campagne staan (voorlopig) als komma-lijstje in
 * `strayCatCampaigns.cageNumbers`. Zolang er geen echte kooi-rijen per campagne
 * bestaan — dat is het resterende deel van Svens Trello-kaart — is dat de enige
 * bron. Deze functies zijn de plek waar dat veld gelezen wordt, zodat het
 * rapport en het inspectieformulier gegarandeerd dezelfde kooien zien.
 */

export function parseCageCodes(cageNumbers: string | null | undefined): string[] {
  if (!cageNumbers) return [];
  return cageNumbers
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

export interface CageResult {
  cageCode: string;
  caught: boolean;
}

/**
 * Eén rij per uitgezette kooi. Vangst voor een kooi die niet bij de campagne
 * hoort, wordt genegeerd: het formulier mag niets kunnen bewaren dat er niet is.
 */
export function cageResultsFor(deployedCodes: string[], caughtCodes: string[]): CageResult[] {
  const caught = new Set(caughtCodes);
  return deployedCodes.map((cageCode) => ({ cageCode, caught: caught.has(cageCode) }));
}

/** "Er was vangst" geldt zodra minstens één kooi een kat opleverde. */
export function wasSuccessfulFrom(caughtCodes: string[]): boolean {
  return caughtCodes.length > 0;
}

/**
 * Regeltje onder een inspectie in de lijst. Leeg wanneer er geen kooirijen zijn
 * — inspecties van vóór deze story hebben er geen, en dan valt het scherm terug
 * op het bestaande vinkje.
 */
export function catchSummary(results: CageResult[]): string {
  if (results.length === 0) return "";
  const caught = results.filter((r) => r.caught).map((r) => r.cageCode);
  return caught.length > 0 ? `Vangst in ${caught.join(", ")}` : "Geen vangst";
}
