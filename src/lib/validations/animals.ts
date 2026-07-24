import { z } from "zod";

/**
 * Maximum lengte van de korte beschrijving. Spiegelt de DB-restrictie
 * `varchar(300)` op `animals.short_description`. Één bron voor validatie én de
 * `maxLength` in het formulier, zodat ze niet uit elkaar kunnen lopen.
 * De lange beschrijvingen zijn `text` in de DB → géén lengtelimiet.
 */
export const SHORT_DESCRIPTION_MAX = 300;

const shortDescriptionField = z
  .string()
  .max(SHORT_DESCRIPTION_MAX, `Korte beschrijving mag max. ${SHORT_DESCRIPTION_MAX} tekens zijn`)
  .optional();

export const animalIntakeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  species: z.enum(["hond", "kat", "ander"], { message: "Kies een soort" }),
  gender: z.string().min(1, "Geslacht is verplicht"),
  breed: z.string().optional(),
  color: z.string().optional(),
  dateOfBirth: z.string().optional(),
  identificationNr: z.string().optional(),
  passportNr: z.string().optional(),
  intakeDate: z.string().min(1, "Intake datum is verplicht"),
  intakeReason: z.enum(["afstand", "ibn", "zwerfhond", "tijdelijke_opvang"]).optional(),
  description: z.string().optional(),
  shortDescription: shortDescriptionField,
  // Story 10.29: tri-state — true/false/null (= onbekend, "??" in R1).
  isNeutered: z.boolean().nullable().optional().default(null),
  neuteredDate: z.string().optional(),
  neuteredByShelter: z.boolean().optional(),
  isPickedUpByShelter: z.boolean().optional().default(false),
  dossierNr: z.string().optional(),
  pvNr: z.string().optional(),
  // Reden van inbeslagname — waarom het dier in beslag genomen is.
  ibnReason: z.string().optional(),
  intakeMetadata: z
    .object({
      melderNaam: z.string().optional(),
      melderLocatie: z.string().optional(),
      melderDatum: z.string().optional(),
      betrokkenInstanties: z.string().optional(),
    })
    .optional(),
});
// NB: dossiernummer (Dierenwelzijn Vlaanderen) en PV-nummer (politie) zijn bij
// een inbeslagname NIET verplicht bij registratie — het asiel ontvangt die pas
// later. Ze blijven dus optioneel (Sven-feedback 2026-07-24).

export type AnimalIntakeInput = z.infer<typeof animalIntakeSchema>;

export const animalUpdateSchema = z.object({
  id: z.coerce.number().positive("Ongeldig dier-ID"),
  name: z.string().min(1, "Naam is verplicht"),
  aliasName: z.string().optional(),
  gender: z.string().min(1, "Geslacht is verplicht"),
  breed: z.string().optional(),
  color: z.string().optional(),
  dateOfBirth: z.string().optional(),
  intakeDate: z.string().optional(),
  intakeReason: z
    .enum(["afstand", "ibn", "zwerfhond", "tijdelijke_opvang"])
    .optional()
    .or(z.literal("")),
  dossierNr: z.string().optional(),
  // Story 10.36: IBN-velden ook bewerkbaar op de fiche (Sven-feedback 2026-07-24).
  pvNr: z.string().optional(),
  ibnReason: z.string().optional(),
  intakeMetadata: z
    .object({
      melderNaam: z.string().optional(),
      melderLocatie: z.string().optional(),
      melderDatum: z.string().optional(),
      betrokkenInstanties: z.string().optional(),
    })
    .optional(),
  // Story 10.29: tri-state — true/false/null (= onbekend, "??" in R1).
  isNeutered: z.boolean().nullable().optional().default(null),
  neuteredDate: z.string().optional().or(z.literal("")),
  neuteredByShelter: z.boolean().optional(),
  description: z.string().optional(),
  // Story 10.32: eigen tekst voor website en affiche; leeg = terugval op description.
  websiteDescription: z.string().optional(),
  posterDescription: z.string().optional(),
  shortDescription: shortDescriptionField,
  identificationNr: z.string().optional(),
  isNewChip: z.boolean().optional().default(false),
  passportNr: z.string().optional(),
  isNewPassport: z.boolean().optional().default(false),
  barcode: z.string().optional(),
  isOnWebsite: z.boolean().optional().default(false),
  isOnPoster: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
});

export type AnimalUpdateInput = z.infer<typeof animalUpdateSchema>;
