import { z } from "zod";

/**
 * Vorm van de AnimalShelter-responses, opgesteld op de echte data van 2026-07-26
 * (53 dieren; ruwe responses bewaard in _bmad-output/implementation-artifacts/
 * animalshelter-voorbeeldresponses/).
 *
 * Twee bewuste keuzes:
 *  - Onbekende velden worden toegelaten. Hun API mag groeien zonder onze import
 *    te breken; wij lezen enkel wat we kennen.
 *  - Bijna alles is nullable. In de echte data zijn `identificatie`,
 *    `geboortedatum`, `properties` en `leeftijdscategorie` effectief leeg bij
 *    sommige dieren, en dat is normaal — een vondeling heeft nu eenmaal geen chip.
 */

const nullableString = z.string().nullish().transform((v) => v ?? null);
const nullableNumber = z.number().nullish().transform((v) => v ?? null);

/**
 * `properties` komt in twee schrijfwijzen binnen voor hetzelfde "niets" (Story 11.9).
 *
 * AnimalShelter draait op PHP, en `json_encode` van een lege associatieve array
 * levert `[]` in plaats van `{}`. Voor het dier "Bommel" (id 1908097) gebeurde
 * dat in productie, waarop het hele scherm viel. We lezen die lege array dus als
 * "geen properties" — precies zoals `null`.
 *
 * Een gevúlde array laten we wél vallen: dat zou een echte vormwijziging zijn en
 * die willen we zien, niet gokken.
 */
const propertiesField = z.preprocess(
  (value) => (Array.isArray(value) && value.length === 0 ? null : value),
  z.record(z.string(), z.string().nullable()).nullish().transform((v) => v ?? null),
);

export const animalShelterCategorySchema = z.enum(["dogs", "cats", "other"]);

export const animalShelterImageSchema = z.object({
  image: z.string(),
  sortorder: z.number().default(0),
});

export const animalShelterAnimalSchema = z.looseObject({
  id: z.number().int().positive(),
  nummer: nullableNumber,
  categorie: animalShelterCategorySchema,
  identificatie: nullableString,
  referentie: nullableString,
  naam: z.string(),
  ras: nullableString,
  geslacht: nullableString,
  /** 0 | 1 | 2 — betekenis nog te bevestigen bij Sven, zie koerswijziging §6.2.1. */
  gecastreerd: nullableNumber,
  geboortedatum: nullableString,
  leeftijd: nullableNumber,
  leeftijdscategorie: nullableString,
  hoofdbeeld: nullableString,
  extra_beelden: z.array(animalShelterImageSchema).default([]),
  publish: nullableNumber,
  publishonwebsite: nullableNumber,
  adoptie: nullableNumber,
  reserved: nullableNumber,
  /** dd-mm-jjjj — let op: ánder formaat dan `geboortedatum`. */
  checkin_date: nullableString,
  checkin_reason: nullableString,
  checkout_reason: nullableString,
  korte_beschrijving_nl: nullableString,
  beschrijving_nl: nullableString,
  properties: propertiesField,
});

export type AnimalShelterAnimal = z.infer<typeof animalShelterAnimalSchema>;
export type AnimalShelterCategory = z.infer<typeof animalShelterCategorySchema>;

/**
 * Story 11.9 — één eigen fouttype voor "hun antwoord heeft een vorm die wij niet
 * kennen". Zonder dat onderscheid werd een vormfout in het scherm vertaald naar
 * "AnimalShelter is momenteel niet bereikbaar", wat naar de verkeerde oorzaak
 * wijst: hun API antwoordde perfect, alleen anders dan verwacht.
 */
export class AnimalShelterShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnimalShelterShapeError";
  }
}

/** Genoeg om het dier bij AnimalShelter terug te vinden, ook als de rest onleesbaar is. */
function describeItem(item: unknown): string {
  if (typeof item !== "object" || item === null) return "een dier";
  const { id, naam } = item as { id?: unknown; naam?: unknown };
  const delen = [
    typeof id === "number" || typeof id === "string" ? `id ${id}` : null,
    typeof naam === "string" && naam ? `"${naam}"` : null,
  ].filter(Boolean);
  return delen.length > 0 ? `dier ${delen.join(" ")}` : "een dier";
}

export function parseAnimalList(payload: unknown): AnimalShelterAnimal[] {
  if (!Array.isArray(payload)) {
    throw new AnimalShelterShapeError("AnimalShelter gaf geen lijst van dieren terug.");
  }
  return payload.map((item) => {
    const resultaat = animalShelterAnimalSchema.safeParse(item);
    if (!resultaat.success) {
      const velden = [...new Set(resultaat.error.issues.map((i) => i.path.join(".")))]
        .filter(Boolean)
        .join(", ");
      throw new AnimalShelterShapeError(
        `AnimalShelter gaf ${describeItem(item)} in een onverwachte vorm terug${
          velden ? ` (veld: ${velden})` : ""
        }.`,
      );
    }
    return resultaat.data;
  });
}
