"use server";

import { db } from "@/lib/db";
import { adoptionCandidates } from "@/lib/db/schema";
import { checkBlacklistMatch } from "@/lib/queries/blacklist";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const publicAdoptionSchema = z.object({
  species: z.enum(["hond", "kat", "andere"]),
  requestedAnimalName: z.string().min(1, "Dit veld is verplicht").max(200),
  firstName: z.string().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().min(1, "Achternaam is verplicht").max(100),
  dateOfBirth: z.string().min(1, "Geboortedatum is verplicht"),
  address: z.string().min(1, "Adres is verplicht").max(300),
  postalCode: z.string().min(1, "Postcode en gemeente is verplicht").max(100),
  phone: z.string().min(1, "Gsm nummer is verplicht").max(20),
  // Story 10.69 — verplicht voor elke soort (Sven). Vroeger mocht het leeg blijven en
  // bewaarden we een nepadres; dan kon het asiel de aanvrager niet mailen.
  email: z
    .string({ error: "E-mailadres is verplicht" })
    .trim()
    .min(1, "E-mailadres is verplicht")
    .email("Ongeldig e-mailadres")
    .max(200),
  questionnaireAnswers: z.record(z.string(), z.unknown()),
});

export type PublicAdoptionResult = {
  success: true;
} | {
  success: false;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitPublicAdoptionRequest(
  _prev: PublicAdoptionResult | null,
  formData: FormData,
): Promise<PublicAdoptionResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(formData.get("json") as string);
  } catch {
    return { success: false, error: "Ongeldige gegevens" };
  }

  const parsed = publicAdoptionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Niet alle verplichte velden zijn correct ingevuld.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [record] = await db
      .insert(adoptionCandidates)
      .values({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: `${parsed.data.address}, ${parsed.data.postalCode}`,
        animalId: null,
        requestedAnimalName: parsed.data.requestedAnimalName,
        species: parsed.data.species,
        questionnaireAnswers: {
          ...parsed.data.questionnaireAnswers,
          geboortedatum: parsed.data.dateOfBirth,
          bron: "publiek_formulier",
        },
        status: "pending",
        notes: `Publieke aanvraag via website (${parsed.data.species})`,
        reviewMartine: "in_beraad",
        reviewNathalie: "in_beraad",
        reviewSven: "in_beraad",
      })
      .returning();

    await checkBlacklistMatch(
      parsed.data.firstName,
      parsed.data.lastName,
      parsed.data.address,
    ).then(async (match) => {
      if (match) {
        const { eq } = await import("drizzle-orm");
        await db
          .update(adoptionCandidates)
          .set({ blacklistMatch: true, blacklistMatchEntryId: match.id })
          .where(eq(adoptionCandidates.id, record.id));
      }
    });

    revalidatePath("/beheerder/adoptie");
    return { success: true };
  } catch (err) {
    console.error("submitPublicAdoptionRequest failed:", err);
    return { success: false, error: "Er ging iets mis. Probeer het later opnieuw." };
  }
}
