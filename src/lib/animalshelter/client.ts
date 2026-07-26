import { readFromAnimalShelter } from "./http";
import { CATEGORY_PATHS, categoryPath } from "./paths";
import { parseAnimalList, type AnimalShelterAnimal, type AnimalShelterCategory } from "./types";

/**
 * Getypeerde leesoproepen bovenop het doorgeefluik (Story 11.1).
 *
 * Drie oproepen volstaan voor de volledige dataset. Het detailendpoint
 * `/animal/<id>` is bewust niet in gebruik: het geeft mínder velden terug dan de
 * categorielijsten (geen ras, geen properties, geen intakegegevens, geen
 * publicatievlaggen). Zie koerswijziging §1.1a — story 11.7 is daarom geschrapt.
 */

const CATEGORIES: AnimalShelterCategory[] = ["dogs", "cats", "other"];

export async function fetchCategory(
  category: AnimalShelterCategory,
): Promise<AnimalShelterAnimal[]> {
  const payload = await readFromAnimalShelter(categoryPath(category));
  return parseAnimalList(payload);
}

/**
 * De volledige populatie van het asiel bij AnimalShelter, in vaste volgorde.
 * Bewust sequentieel: 53 dieren in drie oproepen is niets, en zo belasten we
 * hun API niet met gelijktijdige verzoeken.
 */
export async function fetchAllAnimals(): Promise<AnimalShelterAnimal[]> {
  const alles: AnimalShelterAnimal[] = [];
  for (const category of CATEGORIES) {
    alles.push(...(await fetchCategory(category)));
  }
  return alles;
}

/** Handig voor het overzichtsscherm: welke paden worden er bij een ophaalronde geraakt. */
export function describeFetchPlan(): readonly string[] {
  return CATEGORY_PATHS;
}
