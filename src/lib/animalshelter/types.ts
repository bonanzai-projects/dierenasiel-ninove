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
  properties: z.record(z.string(), z.string().nullable()).nullish().transform((v) => v ?? null),
});

export type AnimalShelterAnimal = z.infer<typeof animalShelterAnimalSchema>;
export type AnimalShelterCategory = z.infer<typeof animalShelterCategorySchema>;

export function parseAnimalList(payload: unknown): AnimalShelterAnimal[] {
  if (!Array.isArray(payload)) {
    throw new Error("AnimalShelter gaf geen lijst van dieren terug.");
  }
  return payload.map((item) => animalShelterAnimalSchema.parse(item));
}
