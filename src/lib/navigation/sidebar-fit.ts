/**
 * Past de zijbalk nog zonder te scrollen?
 *
 * De navigatie is `overflow-y-auto`, dus ze scrolt stilletjes zodra ze te lang
 * wordt — je merkt het pas als je een item mist. Bij het toevoegen van
 * "Personeel" (Epic 14) zat ze op de rand. Deze cijfers komen uit de klassen in
 * `Sidebar.tsx`; de test hieronder faalt zodra er een item bijkomt dat niet
 * meer past, zodat die keuze bewust gemaakt wordt in plaats van per ongeluk.
 *
 * Wijzig je de opmaak van de zijbalk, pas dan deze constanten mee aan.
 */

/** `text-sm` (20px regelhoogte) + `py-1` (2×4px). */
export const NAV_ITEM_HEIGHT = 28;

/** `space-y-0.5` tussen de items. */
export const NAV_ITEM_GAP = 2;

/** `py-3` boven en onder de navigatie. */
export const NAV_VERTICAL_PADDING = 24;

/** Logoblok: `py-2` + twee tekstregels + de rand eronder. */
export const HEADER_HEIGHT = 51;

/**
 * Zichtbare hoogte op de kleinste laptop die we bedienen: 1366×768, min de
 * browserbalken en de taakbalk van Windows. Bewust krap gekozen — wie een
 * grotere schermresolutie heeft, houdt gewoon ruimte over.
 */
export const LAPTOP_VIEWPORT_HEIGHT = 640;

export function sidebarHeightFor(itemCount: number): number {
  if (itemCount <= 0) return HEADER_HEIGHT + NAV_VERTICAL_PADDING;
  const items = itemCount * NAV_ITEM_HEIGHT + (itemCount - 1) * NAV_ITEM_GAP;
  return HEADER_HEIGHT + NAV_VERTICAL_PADDING + items;
}

export function fitsWithoutScrolling(
  itemCount: number,
  viewportHeight: number = LAPTOP_VIEWPORT_HEIGHT,
): boolean {
  return sidebarHeightFor(itemCount) <= viewportHeight;
}

/** Hoeveel items er hoogstens passen. Handig in de foutboodschap van de test. */
export function maxItemsThatFit(
  viewportHeight: number = LAPTOP_VIEWPORT_HEIGHT,
): number {
  let count = 0;
  while (fitsWithoutScrolling(count + 1, viewportHeight)) count++;
  return count;
}
