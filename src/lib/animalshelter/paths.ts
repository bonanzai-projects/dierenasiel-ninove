/**
 * Laag 1 van de read-only garantie (Epic 11, koerswijziging 2026-07-26 §3).
 *
 * Dit bestand kent alleen paden — géén hostnaam, géén fetch. De hostnaam staat
 * uitsluitend in `http.ts`, het enige bestand dat de externe API mag aanraken.
 *
 * De lijst hieronder is bewust uitputtend en strikt: exacte tekst voor de drie
 * categorieën, en één streng patroon voor een detailpad. Een pad dat er ook maar
 * een teken naast zit (querystring, slash op het einde, hoofdletter, traversal)
 * wordt geweigerd. Liever een valse afwijzing dan één ongewenste oproep.
 */

export const CATEGORY_PATHS = [
  "/category/dogs",
  "/category/cats",
  "/category/other",
] as const;

export type AnimalShelterCategory = "dogs" | "cats" | "other";

/** Alleen positieve gehele id's, niets erachter. */
const DETAIL_PATH = /^\/animal\/[1-9]\d*$/;

export function isReadPath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0) return false;
  // Een querystring of fragment kan de betekenis van de oproep veranderen en
  // hoort niet bij de vier endpoints die we mogen bevragen.
  if (path.includes("?") || path.includes("#")) return false;
  if ((CATEGORY_PATHS as readonly string[]).includes(path)) return true;
  return DETAIL_PATH.test(path);
}

export function assertReadPath(path: string): void {
  if (!isReadPath(path)) {
    throw new Error(
      `AnimalShelter is een alleen-lezen koppeling: "${path}" staat niet in de lijst met toegelaten leespaden.`,
    );
  }
}

export function categoryPath(category: AnimalShelterCategory): string {
  return `/category/${category}`;
}

export function detailPath(externalId: number): string {
  if (!Number.isInteger(externalId) || externalId < 1) {
    throw new Error(`Ongeldig AnimalShelter-dier-id: ${externalId}`);
  }
  return `/animal/${externalId}`;
}
