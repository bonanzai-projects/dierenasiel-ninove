import { z } from "zod";
import { categoriesForKind, parseAmount, type CostKind } from "@/lib/events/costs";

/**
 * Story 13.5 — een kosten- of opbrengstlijn.
 *
 * De bedragen komen als tekst binnen ("400", "560,50", "€ 1.234,56") en gaan als
 * getal (of null) verder. De categorie wordt tegen de gekozen soort gecontroleerd:
 * "tombola" is een opbrengst, geen kost.
 */
const bedrag = (veld: "budgetAmount" | "actualAmount") =>
  z.string().optional().transform((v, ctx) => {
    const res = parseAmount(v ?? "");
    if (!res.ok) {
      ctx.addIssue({ code: "custom", message: res.error, path: [veld] });
      return z.NEVER;
    }
    return res.value;
  });

export const eventCostSchema = z
  .object({
    eventId: z.coerce.number().int().positive("Ongeldig evenement"),
    kind: z.enum(["kost", "opbrengst"]),
    category: z.string().trim().min(1, "Kies een categorie"),
    description: z.string().trim().min(1, "Omschrijving is verplicht"),
    budgetAmount: bedrag("budgetAmount"),
    actualAmount: bedrag("actualAmount"),
    supplier: z.string().trim().optional(),
    paid: z.boolean().optional().default(false),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const bestaat = categoriesForKind(data.kind as CostKind).some((c) => c.key === data.category);
    if (!bestaat) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "Deze categorie hoort niet bij dit soort lijn",
      });
    }
  });

export type EventCostInput = z.infer<typeof eventCostSchema>;
