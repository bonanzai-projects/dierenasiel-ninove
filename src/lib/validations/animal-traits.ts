import { z } from "zod";
import { ANIMAL_TRAITS, ANIMAL_TRAIT_VALUES } from "@/lib/animals/animal-traits";

const traitKeys = ANIMAL_TRAITS.map((t) => t.key) as [string, ...string[]];

/**
 * Story 10.32: de eigenschappen worden als jsonb bewaard. We valideren zowel de
 * keys (enkel wat in `ANIMAL_TRAITS` staat) als de waarden (ja/nee/niet_gekend),
 * zodat er geen rommel in de jsonb-kolom belandt.
 */
export const animalTraitsSchema = z.object({
  animalId: z.coerce.number().positive("Ongeldig dier-ID"),
  // `partialRecord` en niet `record`: in zod 4 eist `record` met enum-keys dat
  // álle keys aanwezig zijn, terwijl een dossier gedeeltelijk ingevuld mag zijn.
  traits: z
    .partialRecord(
      z.enum(traitKeys, { message: "Onbekende eigenschap" }),
      z.enum(ANIMAL_TRAIT_VALUES, { message: "Ongeldige waarde" }),
    )
    .default({}),
});

export type AnimalTraitsInput = z.infer<typeof animalTraitsSchema>;
