"use server";

import { db } from "@/lib/db";
import { animals } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { animalIntakeSchema, animalUpdateSchema } from "@/lib/validations/animals";
import { slugify } from "@/lib/utils";
import { parseNeuteredValue } from "@/lib/reports/animal-report-format";
import { shouldCollectMelderDetails } from "@/lib/animals/intake-melder";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Animal } from "@/types";

/**
 * Leest een vinkje dat met het hidden+checkbox-patroon wordt verstuurd.
 * Een echte browser stuurt dan twee entries met dezelfde naam (hidden "false"
 * eerst, checkbox "true" erna); `formData.get()` geeft altijd de eerste terug,
 * waardoor zo'n vinkje nooit aan lijkt te staan.
 */
function isChecked(formData: FormData, name: string): boolean {
  return formData.getAll(name).includes("true");
}

/**
 * Verzamelt de tekstvelden van het intakeformulier als platte strings, zodat ze
 * bij een validatiefout teruggegeven en opnieuw getoond kunnen worden.
 * (De gecontroleerde velden — soort, reden, sterilisatie — leven al in React-state.)
 */
function collectIntakeValues(formData: FormData): Record<string, string> {
  const fields = [
    "name", "breed", "color", "dateOfBirth", "identificationNr", "passportNr",
    "intakeDate", "description", "shortDescription", "dossierNr", "pvNr", "ibnReason",
    "intakeMetadata.melderNaam", "intakeMetadata.melderLocatie",
    "intakeMetadata.melderDatum", "intakeMetadata.betrokkenInstanties",
  ];
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") values[field] = value;
  }
  return values;
}

/** De vier melder-/herkomstvelden die als één jsonb-object bewaard worden. */
const MELDER_FIELDS = [
  "intakeMetadata.melderNaam",
  "intakeMetadata.melderLocatie",
  "intakeMetadata.melderDatum",
  "intakeMetadata.betrokkenInstanties",
] as const;

/**
 * Bouwt het intakeMetadata-object uit de losse formuliervelden. Geeft `undefined`
 * terug wanneer geen enkel melder-veld aanwezig of ingevuld is, zodat de aanroeper
 * kan beslissen om de bestaande waarde ongemoeid te laten i.p.v. te overschrijven.
 */
function collectMelderMetadata(formData: FormData) {
  if (!MELDER_FIELDS.some((f) => formData.has(f))) return undefined;
  const meta = {
    melderNaam: (formData.get("intakeMetadata.melderNaam") as string) || undefined,
    melderLocatie: (formData.get("intakeMetadata.melderLocatie") as string) || undefined,
    melderDatum: (formData.get("intakeMetadata.melderDatum") as string) || undefined,
    betrokkenInstanties: (formData.get("intakeMetadata.betrokkenInstanties") as string) || undefined,
  };
  return Object.values(meta).some(Boolean) ? meta : undefined;
}

export async function createAnimalIntake(
  _prevState: ActionResult<Animal> | null,
  formData: FormData,
): Promise<ActionResult<Animal>> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  const isPickedUp = formData.get("isPickedUpByShelter") === "true";
  const intakeReason = (formData.get("intakeReason") as string) || undefined;

  // Build intakeMetadata bij ophaling, IBN of vondeling (Sven-feedback 2026-07-24).
  const hasMetadata = shouldCollectMelderDetails({
    intakeReason,
    isPickedUpByShelter: isPickedUp,
  });
  const intakeMetadata = hasMetadata
    ? {
        melderNaam: (formData.get("intakeMetadata.melderNaam") as string) || undefined,
        melderLocatie: (formData.get("intakeMetadata.melderLocatie") as string) || undefined,
        melderDatum: (formData.get("intakeMetadata.melderDatum") as string) || undefined,
        betrokkenInstanties: (formData.get("intakeMetadata.betrokkenInstanties") as string) || undefined,
      }
    : undefined;

  // Story 10.29: radiogroep Ja/Nee/Onbekend → true/false/null (één waarde per submit).
  const isNeutered = parseNeuteredValue(formData.get("isNeutered"));
  const raw = {
    name: (formData.get("name") as string) || "",
    species: formData.get("species") as string,
    gender: (formData.get("gender") as string) || "",
    breed: (formData.get("breed") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
    dateOfBirth: (formData.get("dateOfBirth") as string) || undefined,
    identificationNr: (formData.get("identificationNr") as string) || undefined,
    passportNr: (formData.get("passportNr") as string) || undefined,
    intakeDate: (formData.get("intakeDate") as string) || "",
    intakeReason,
    description: (formData.get("description") as string) || undefined,
    shortDescription: (formData.get("shortDescription") as string) || undefined,
    isNeutered,
    neuteredDate: isNeutered === true ? (formData.get("neuteredDate") as string) || undefined : undefined,
    neuteredByShelter: isNeutered === true ? formData.getAll("neuteredByShelter").includes("true") : undefined,
    isPickedUpByShelter: isPickedUp,
    dossierNr: (formData.get("dossierNr") as string) || undefined,
    pvNr: (formData.get("pvNr") as string) || undefined,
    ibnReason: (formData.get("ibnReason") as string) || undefined,
    intakeMetadata,
  };

  const parsed = animalIntakeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      // Geef de ingevoerde tekstwaarden terug zodat het formulier ze na een
      // validatiefout opnieuw kan tonen i.p.v. leeg te lopen.
      values: collectIntakeValues(formData),
    };
  }

  try {
    const slug = slugify(parsed.data.name);

    // Calculate IBN 60-day deadline (FR-06)
    let ibnDecisionDeadline: string | null = null;
    if (parsed.data.intakeReason === "ibn" && parsed.data.intakeDate) {
      const deadline = new Date(parsed.data.intakeDate + "T12:00:00");
      deadline.setDate(deadline.getDate() + 60);
      ibnDecisionDeadline = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, "0")}-${String(deadline.getDate()).padStart(2, "0")}`;
    }

    const [animal] = await db
      .insert(animals)
      .values({
        name: parsed.data.name,
        slug,
        species: parsed.data.species,
        gender: parsed.data.gender,
        breed: parsed.data.breed || null,
        color: parsed.data.color || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        identificationNr: parsed.data.identificationNr || null,
        passportNr: parsed.data.passportNr || null,
        intakeDate: parsed.data.intakeDate || null,
        intakeReason: parsed.data.intakeReason || null,
        description: parsed.data.description || "",
        shortDescription: parsed.data.shortDescription || null,
        isNeutered: parsed.data.isNeutered,
        neuteredDate: parsed.data.neuteredDate || null,
        neuteredByShelter: parsed.data.neuteredByShelter ?? null,
        isPickedUpByShelter: parsed.data.isPickedUpByShelter,
        intakeMetadata: parsed.data.intakeMetadata || null,
        dossierNr: parsed.data.dossierNr || null,
        pvNr: parsed.data.pvNr || null,
        ibnReason: parsed.data.ibnReason || null,
        ibnDecisionDeadline,
        workflowPhase: "intake",
        status: "beschikbaar",
        isInShelter: true,
      })
      .returning();

    // Auto-generate barcode for dogs: DOG-{id}
    let finalAnimal = animal;
    if (parsed.data.species === "hond") {
      const barcode = `DOG-${animal.id}`;
      const [updated] = await db
        .update(animals)
        .set({ barcode })
        .where(eq(animals.id, animal.id))
        .returning();
      finalAnimal = updated;
    }

    await logAudit("create_animal", "animal", finalAnimal.id, null, finalAnimal);
    revalidatePath("/beheerder/dieren");

    return { success: true, data: finalAnimal };
  } catch (err: unknown) {
    const pgError = err as { code?: string };
    if (pgError.code === "23505") {
      return {
        success: false,
        fieldErrors: { name: ["Er bestaat al een dier met deze naam. Kies een andere naam."] },
      };
    }
    return {
      success: false,
      error: "Er ging iets mis bij het registreren. Probeer het later opnieuw.",
    };
  }
}

export async function updateAnimal(
  _prevState: ActionResult<Animal> | null,
  formData: FormData,
): Promise<ActionResult<Animal>> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) {
    return { success: false, error: permCheck.error };
  }

  // Story 10.29: radiogroep Ja/Nee/Onbekend → true/false/null.
  const isNeuteredFlag = parseNeuteredValue(formData.get("isNeutered"));
  const raw = {
    id: formData.get("id"),
    name: (formData.get("name") as string) || "",
    aliasName: (formData.get("aliasName") as string) || undefined,
    gender: (formData.get("gender") as string) || "",
    breed: (formData.get("breed") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
    dateOfBirth: (formData.get("dateOfBirth") as string) || undefined,
    intakeDate: (formData.get("intakeDate") as string) || undefined,
    intakeReason: (formData.get("intakeReason") as string) || undefined,
    dossierNr: (formData.get("dossierNr") as string) || undefined,
    pvNr: (formData.get("pvNr") as string) || undefined,
    ibnReason: (formData.get("ibnReason") as string) || undefined,
    intakeMetadata: collectMelderMetadata(formData),
    isNeutered: isNeuteredFlag,
    neuteredDate: isNeuteredFlag === true ? (formData.get("neuteredDate") as string) || undefined : undefined,
    neuteredByShelter: isNeuteredFlag === true ? formData.getAll("neuteredByShelter").includes("true") : undefined,
    description: (formData.get("description") as string) || undefined,
    websiteDescription: (formData.get("websiteDescription") as string) || undefined,
    posterDescription: (formData.get("posterDescription") as string) || undefined,
    shortDescription: (formData.get("shortDescription") as string) || undefined,
    identificationNr: (formData.get("identificationNr") as string) || undefined,
    // getAll().includes i.p.v. get(): het hidden+checkbox-patroon stuurt twee
    // entries met dezelfde naam en get() geeft altijd de eerste ("false") terug.
    isNewChip: isChecked(formData, "isNewChip"),
    passportNr: (formData.get("passportNr") as string) || undefined,
    isNewPassport: isChecked(formData, "isNewPassport"),
    barcode: (formData.get("barcode") as string) || undefined,
    isOnWebsite: isChecked(formData, "isOnWebsite"),
    isOnPoster: isChecked(formData, "isOnPoster"),
    isFeatured: isChecked(formData, "isFeatured"),
  };

  const parsed = animalUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const [oldAnimal] = await db
      .select()
      .from(animals)
      .where(eq(animals.id, parsed.data.id))
      .limit(1);
    if (!oldAnimal) return { success: false, error: "Dier niet gevonden" };

    const slug = slugify(parsed.data.name);
    const baseSet: Record<string, unknown> = {
      name: parsed.data.name,
      slug,
      aliasName: parsed.data.aliasName || sql`null`,
      gender: parsed.data.gender,
      breed: parsed.data.breed || sql`null`,
      color: parsed.data.color || sql`null`,
      dateOfBirth: parsed.data.dateOfBirth || sql`null`,
      intakeDate: parsed.data.intakeDate || sql`null`,
      intakeReason: parsed.data.intakeReason || sql`null`,
      isNeutered: parsed.data.isNeutered,
      description: parsed.data.description || sql`null`,
      websiteDescription: parsed.data.websiteDescription || sql`null`,
      posterDescription: parsed.data.posterDescription || sql`null`,
      shortDescription: parsed.data.shortDescription || sql`null`,
      identificationNr: parsed.data.identificationNr || sql`null`,
      isNewChip: parsed.data.isNewChip,
      passportNr: parsed.data.passportNr || sql`null`,
      isNewPassport: parsed.data.isNewPassport,
      barcode: parsed.data.barcode || sql`null`,
      isOnWebsite: parsed.data.isOnWebsite,
      isOnPoster: parsed.data.isOnPoster,
      isFeatured: parsed.data.isFeatured,
      updatedAt: new Date(),
    };
    // Story 10.23: bij uitvinken óók datum + bron wissen. Anders verschijnen
    // de oude waarden weer bij heraanvinken, wat verwarrend is voor de
    // gebruiker (zie Sven-feedback 2026-05-12).
    if (parsed.data.isNeutered) {
      baseSet.neuteredDate = parsed.data.neuteredDate ? parsed.data.neuteredDate : null;
      baseSet.neuteredByShelter = parsed.data.neuteredByShelter ?? null;
    } else {
      baseSet.neuteredDate = null;
      baseSet.neuteredByShelter = null;
    }

    // Story 10.36: IBN-/herkomstvelden alleen schrijven wanneer hun sectie in het
    // formulier stond (formData.has). Zo wist een dier zonder die sectie (bv. een
    // afstand) niet per ongeluk zijn dossier-/melderdata. Aanwezig maar leeg = wissen.
    if (formData.has("dossierNr")) baseSet.dossierNr = parsed.data.dossierNr || null;
    if (formData.has("pvNr")) baseSet.pvNr = parsed.data.pvNr || null;
    if (formData.has("ibnReason")) baseSet.ibnReason = parsed.data.ibnReason || null;
    if (MELDER_FIELDS.some((f) => formData.has(f))) {
      baseSet.intakeMetadata = parsed.data.intakeMetadata ?? null;
    }

    const [updated] = await db
      .update(animals)
      .set(baseSet)
      .where(eq(animals.id, parsed.data.id))
      .returning();

    await logAudit("update_animal", "animal", updated.id, oldAnimal, updated);
    revalidatePath("/beheerder/dieren");
    revalidatePath(`/beheerder/dieren/${parsed.data.id}`);

    return { success: true, data: updated };
  } catch (err: unknown) {
    const pgError = err as { code?: string };
    if (pgError.code === "23505") {
      return {
        success: false,
        fieldErrors: { name: ["Er bestaat al een dier met deze naam. Kies een andere naam."] },
      };
    }
    return {
      success: false,
      error: "Er ging iets mis bij het opslaan. Probeer het later opnieuw.",
    };
  }
}
