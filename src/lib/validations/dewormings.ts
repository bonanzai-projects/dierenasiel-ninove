import { z } from "zod";

export const DEWORMING_TYPES = ["Canicantel", "Dogninth", "Catminth"] as const;

/**
 * Story 10.31: dezelfde tabel registreert twee soorten antiparasitaire behandelingen.
 * Voor ontworming is het product een keuze uit `DEWORMING_TYPES`; voor een
 * vlooienbehandeling is het (voorlopig) vrije tekst — de productenlijst van het
 * asiel is nog niet gekend.
 */
export const DEWORMING_CATEGORIES = ["ontworming", "vlooien"] as const;

export type DewormingCategory = (typeof DEWORMING_CATEGORIES)[number];

export const DEWORMING_CATEGORY_LABELS: Record<DewormingCategory, string> = {
  ontworming: "Ontworming",
  vlooien: "Vlooienbehandeling",
};

export const dewormingSchema = z
  .object({
    animalId: z.coerce.number().positive("Ongeldig dier-ID"),
    category: z
      .enum(DEWORMING_CATEGORIES, { message: "Ongeldige categorie" })
      .default("ontworming"),
    type: z.string(),
    date: z.string().min(1, "Datum is verplicht").regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldig datumformaat"),
    notes: z.string().max(2000, "Opmerkingen mogen max. 2000 tekens zijn").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "ontworming") {
      if (!(DEWORMING_TYPES as readonly string[]).includes(data.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ongeldig ontwormingstype",
          path: ["type"],
        });
      }
      return;
    }

    const product = data.type.trim();
    if (product.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product is verplicht",
        path: ["type"],
      });
    } else if (product.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product mag max. 50 tekens zijn",
        path: ["type"],
      });
    }
  });

export type DewormingInput = z.infer<typeof dewormingSchema>;
