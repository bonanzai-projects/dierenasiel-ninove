import { formatDateBE } from "@/lib/reports/animal-report-format";
import { calculateAge } from "@/lib/utils";
import { ANIMAL_TRAIT_VALUE_LABELS } from "@/lib/animals/animal-traits";

/**
 * Story 10.32 — opmaakregels voor de affiche aan het bord buiten.
 * Enkel presentatie: de gegevens zelf komen uit `animals` en `animal_traits`.
 */

/** Steriel-tri-state (story 10.29) in de kleine letters van de affiche. */
export function posterSterielLabel(
  isNeutered: boolean | null | undefined,
): string {
  if (isNeutered === null || isNeutered === undefined) {
    return ANIMAL_TRAIT_VALUE_LABELS.niet_gekend;
  }
  return isNeutered ? ANIMAL_TRAIT_VALUE_LABELS.ja : ANIMAL_TRAIT_VALUE_LABELS.nee;
}

/** "Leeftijd"-regel: geboortedatum met de berekende leeftijd erachter. */
export function posterAgeLine(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return ANIMAL_TRAIT_VALUE_LABELS.niet_gekend;
  return `${formatDateBE(dateOfBirth)} (${calculateAge(dateOfBirth)})`;
}

/**
 * De foto's voor het 2×2-raster: hoofdfoto eerst, daarna de extra foto's,
 * ontdubbeld en afgekapt op vier. Lege/ongeldige waarden vallen weg.
 */
export function posterPhotoUrls(
  imageUrl: string | null | undefined,
  images: string[] | null | undefined,
  max = 4,
): string[] {
  const all = [imageUrl, ...(images ?? [])]
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => url.length > 0);
  return Array.from(new Set(all)).slice(0, max);
}
