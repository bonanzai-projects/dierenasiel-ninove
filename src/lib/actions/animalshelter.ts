"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { animals, animalShelterFieldDecisions, animalShelterLinks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { diffAnimal, type DiffRow } from "@/lib/animalshelter/diff";
import { buildAnimalInsert, buildImportPreview } from "@/lib/animalshelter/import";
import { matchAnimals } from "@/lib/animalshelter/match";
import { fetchAllAnimals } from "@/lib/animalshelter/client";
import type { LocalAnimalRecord } from "@/lib/animalshelter/overview";
import type { ActionResult } from "@/types";

/**
 * Story 11.5 — de beslissingen van de beheerder wegschrijven.
 *
 * Alles wat hier gebeurt, gebeurt op ONZE fiche. Er is geen enkele actie die
 * iets naar AnimalShelter stuurt, en die kan er ook niet bijkomen — zie
 * `src/lib/animalshelter/read-only.test.ts`.
 *
 * De waarden komen nooit uit het formulier. Bij elke actie worden de externe
 * gegevens opnieuw opgehaald en wordt de diff opnieuw berekend; enkel wat de
 * server zélf als overneembaar bestempelt, wordt weggeschreven. Zo kan een
 * verouderd scherm (of een gemanipuleerd verzoek) geen waarde binnensmokkelen
 * die AnimalShelter nooit gestuurd heeft.
 */

const PAD = "/beheerder/animalshelter";

/** Kolommen die een overname mag aanraken. Bewust een gesloten lijst. */
const APPLICABLE_FIELDS = new Set([
  "name",
  "species",
  "breed",
  "gender",
  "dateOfBirth",
  "identificationNr",
  "intakeDate",
  "intakeReason",
  "dossierNr",
  "websiteDescription",
  "shortDescription",
  "imageUrl",
  "images",
  "isAvailableForAdoption",
  "isOnWebsite",
]);

/**
 * Geeft de weigering terug, of `undefined` wanneer alles in orde is. Het
 * retourtype is bewust enkel de fout-variant, zodat elke actie hem rechtstreeks
 * kan doorgeven ongeacht welk soort data ze normaal teruggeeft.
 */
async function guard(): Promise<{ success: false; error?: string } | undefined> {
  const result = await requirePermission("animalshelter:read");
  return result && result.success === false ? result : undefined;
}

/** Haalt de externe gegevens op en berekent de diff opnieuw, server-side. */
async function verseDiff(externalId: number, animalId: number) {
  const [remote, lokaleDieren, beslissingen] = await Promise.all([
    fetchAllAnimals(),
    db.select().from(animals),
    db
      .select()
      .from(animalShelterFieldDecisions)
      .where(eq(animalShelterFieldDecisions.animalId, animalId)),
  ]);

  const external = remote.find((a) => a.id === externalId);
  const local = lokaleDieren.find((a) => a.id === animalId);
  if (!external || !local) return null;

  const diff = diffAnimal(
    external,
    local as LocalAnimalRecord,
    beslissingen.map((d) => ({
      fieldKey: d.fieldKey,
      decision: d.decision as "negeer_waarde" | "negeer_altijd" | "overgenomen",
      remoteValueHash: d.remoteValueHash,
    })),
  );

  return { external, local, diff };
}

async function bewaarBeslissing(
  animalId: number,
  row: DiffRow,
  decision: "negeer_waarde" | "negeer_altijd" | "overgenomen",
  userId: number | null,
) {
  const waarden = {
    decision,
    // Een "altijd negeren" is niet aan een waarde gebonden; de andere wel.
    remoteValueHash: decision === "negeer_altijd" ? null : row.remoteValueHash,
    remoteValue: row.remoteText,
    localValue: row.localText,
    decidedBy: userId,
    decidedAt: new Date(),
  };

  await db
    .insert(animalShelterFieldDecisions)
    .values({ animalId, fieldKey: row.key, ...waarden })
    .onConflictDoUpdate({
      target: [animalShelterFieldDecisions.animalId, animalShelterFieldDecisions.fieldKey],
      set: waarden,
    });
}

/**
 * Neemt één of meer velden over van AnimalShelter naar onze fiche.
 * Velden die de server niet als overneembaar ziet, worden overgeslagen.
 */
export async function applyAnimalShelterFields(
  externalId: number,
  animalId: number,
  fieldKeys: string[],
): Promise<ActionResult<{ overgenomen: string[]; overgeslagen: string[] }>> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  const session = await getSession();

  try {
    const vers = await verseDiff(externalId, animalId);
    if (!vers) return { success: false, error: "Dit dier is niet (meer) gekoppeld." };

    const overgenomen: string[] = [];
    const overgeslagen: string[] = [];
    const set: Record<string, unknown> = {};

    for (const key of fieldKeys) {
      const row = vers.diff.rows.find((r) => r.key === key);
      if (!row || !row.takeable || !APPLICABLE_FIELDS.has(key)) {
        overgeslagen.push(key);
        continue;
      }
      set[key] = row.remoteValue;
      overgenomen.push(key);
    }

    if (overgenomen.length === 0) {
      return { success: false, error: "Er viel niets over te nemen." };
    }

    await db
      .update(animals)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(animals.id, animalId));

    for (const key of overgenomen) {
      const row = vers.diff.rows.find((r) => r.key === key)!;
      await bewaarBeslissing(animalId, row, "overgenomen", session?.userId ?? null);
      await logAudit(
        "animalshelter_field_overgenomen",
        "animal",
        animalId,
        { veld: key, waarde: row.localText },
        { veld: key, waarde: row.remoteText, externalId },
      );
    }

    revalidatePath(PAD);
    revalidatePath(`${PAD}/${externalId}`);
    revalidatePath(`/beheerder/dieren/${animalId}`);
    return { success: true, data: { overgenomen, overgeslagen } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het overnemen. Probeer het later opnieuw." };
  }
}

/** Legt vast dat een verschil bewust genegeerd wordt. */
export async function ignoreAnimalShelterFields(
  externalId: number,
  animalId: number,
  fieldKeys: string[],
  altijd = false,
): Promise<ActionResult<{ genegeerd: string[] }>> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  const session = await getSession();

  try {
    const vers = await verseDiff(externalId, animalId);
    if (!vers) return { success: false, error: "Dit dier is niet (meer) gekoppeld." };

    const genegeerd: string[] = [];
    for (const key of fieldKeys) {
      const row = vers.diff.rows.find((r) => r.key === key);
      if (!row || row.state === "gelijk") continue;
      await bewaarBeslissing(
        animalId,
        row,
        altijd ? "negeer_altijd" : "negeer_waarde",
        session?.userId ?? null,
      );
      genegeerd.push(key);
    }

    if (genegeerd.length === 0) {
      return { success: false, error: "Er viel niets te negeren." };
    }

    await logAudit(
      altijd ? "animalshelter_veld_altijd_genegeerd" : "animalshelter_veld_genegeerd",
      "animal",
      animalId,
      null,
      { velden: genegeerd, externalId },
    );

    revalidatePath(PAD);
    revalidatePath(`${PAD}/${externalId}`);
    return { success: true, data: { genegeerd } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van je keuze." };
  }
}

/** Draait een eerdere beslissing terug — het verschil komt weer bovendrijven. */
export async function clearAnimalShelterDecisions(
  externalId: number,
  animalId: number,
  fieldKeys: string[],
): Promise<ActionResult<{ hersteld: string[] }>> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  if (fieldKeys.length === 0) return { success: false, error: "Geen velden opgegeven." };

  try {
    await db
      .delete(animalShelterFieldDecisions)
      .where(
        and(
          eq(animalShelterFieldDecisions.animalId, animalId),
          inArray(animalShelterFieldDecisions.fieldKey, fieldKeys),
        ),
      );

    await logAudit("animalshelter_beslissing_teruggedraaid", "animal", animalId, null, {
      velden: fieldKeys,
      externalId,
    });

    revalidatePath(PAD);
    revalidatePath(`${PAD}/${externalId}`);
    return { success: true, data: { hersteld: fieldKeys } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het terugdraaien." };
  }
}

/** Koppelt een extern dier handmatig aan een fiche, of maakt de koppeling los. */
export async function linkAnimalShelterAnimal(
  externalId: number,
  animalId: number | null,
): Promise<ActionResult<{ externalId: number; animalId: number | null }>> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  const session = await getSession();

  try {
    const remote = await fetchAllAnimals();
    const external = remote.find((a) => a.id === externalId);
    if (!external) return { success: false, error: "Dit dier staat niet (meer) bij AnimalShelter." };

    if (animalId !== null) {
      const [bestaat] = await db.select().from(animals).where(eq(animals.id, animalId)).limit(1);
      if (!bestaat) return { success: false, error: "Dat dier bestaat niet in onze database." };

      // Een lokaal dier kan maar aan één extern dier hangen.
      const [dubbel] = await db
        .select()
        .from(animalShelterLinks)
        .where(eq(animalShelterLinks.animalId, animalId))
        .limit(1);
      if (dubbel && dubbel.externalId !== externalId) {
        return { success: false, error: `${bestaat.name} is al aan een ander AnimalShelter-dier gekoppeld.` };
      }
    }

    const waarden = {
      animalId,
      externalNumber: external.nummer,
      category: external.categorie,
      matchMethod: animalId === null ? null : "handmatig",
      status: animalId === null ? "niet_gekoppeld" : "gekoppeld",
      linkedBy: session?.userId ?? null,
      linkedAt: new Date(),
      lastSeenAt: new Date(),
    };

    await db
      .insert(animalShelterLinks)
      .values({ externalId, ...waarden })
      .onConflictDoUpdate({ target: animalShelterLinks.externalId, set: waarden });

    await logAudit("animalshelter_koppeling", "animalshelter_link", externalId, null, {
      externalId,
      animalId,
    });

    revalidatePath(PAD);
    revalidatePath(`${PAD}/${externalId}`);
    return { success: true, data: { externalId, animalId } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het koppelen." };
  }
}

/** Zet een extern dier op "bewust genegeerd" (of haalt dat weer weg). */
export async function ignoreAnimalShelterAnimal(
  externalId: number,
  negeren: boolean,
): Promise<ActionResult<{ externalId: number; negeren: boolean }>> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  const session = await getSession();

  try {
    const remote = await fetchAllAnimals();
    const external = remote.find((a) => a.id === externalId);
    if (!external) return { success: false, error: "Dit dier staat niet (meer) bij AnimalShelter." };

    const waarden = {
      animalId: null,
      externalNumber: external.nummer,
      category: external.categorie,
      matchMethod: null,
      status: negeren ? "genegeerd" : "niet_gekoppeld",
      linkedBy: session?.userId ?? null,
      linkedAt: new Date(),
      lastSeenAt: new Date(),
    };

    await db
      .insert(animalShelterLinks)
      .values({ externalId, ...waarden })
      .onConflictDoUpdate({ target: animalShelterLinks.externalId, set: waarden });

    await logAudit(
      negeren ? "animalshelter_dier_genegeerd" : "animalshelter_dier_hersteld",
      "animalshelter_link",
      externalId,
      null,
      { externalId, naam: external.naam },
    );

    revalidatePath(PAD);
    revalidatePath(`${PAD}/${externalId}`);
    return { success: true, data: { externalId, negeren } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het opslaan van je keuze." };
  }
}

export interface ImportSelection {
  externalId: number;
  species?: string;
  gender?: string;
}

/**
 * Story 11.8 — maakt de geselecteerde AnimalShelter-dieren aan als nieuwe fiche.
 *
 * Er gebeurt niets automatisch: de beheerder heeft de voorbeeldweergave gezien
 * en per dier bevestigd. Wat geblokkeerd is of nog een antwoord mist, wordt
 * overgeslagen mét reden — nooit met een gok ingevuld.
 */
export async function importAnimalShelterAnimals(
  selections: ImportSelection[],
): Promise<
  ActionResult<{
    aangemaakt: { externalId: number; animalId: number; name: string }[];
    overgeslagen: { externalId: number; naam: string; reden: string }[];
  }>
> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  if (selections.length === 0) {
    return { success: false, error: "Er is geen enkel dier geselecteerd." };
  }

  const session = await getSession();

  try {
    const [remote, lokaleDieren, links] = await Promise.all([
      fetchAllAnimals(),
      db.select().from(animals),
      db.select().from(animalShelterLinks),
    ]);

    const kandidaten = buildImportPreview(
      remote,
      lokaleDieren as LocalAnimalRecord[],
      links,
    );
    const perExterneId = new Map(kandidaten.map((k) => [k.externalId, k]));
    const externPerId = new Map(remote.map((a) => [a.id, a]));

    const aangemaakt: { externalId: number; animalId: number; name: string }[] = [];
    const overgeslagen: { externalId: number; naam: string; reden: string }[] = [];

    for (const keuze of selections) {
      const kandidaat = perExterneId.get(keuze.externalId);
      const external = externPerId.get(keuze.externalId);

      if (!kandidaat || !external) {
        overgeslagen.push({
          externalId: keuze.externalId,
          naam: "",
          reden: "Dit dier staat niet (meer) in de lijst om aan te maken.",
        });
        continue;
      }

      if (kandidaat.blockers.length > 0) {
        overgeslagen.push({
          externalId: keuze.externalId,
          naam: kandidaat.name,
          reden: kandidaat.blockers[0],
        });
        continue;
      }

      const species = keuze.species ?? kandidaat.species ?? undefined;
      const gender = keuze.gender ?? kandidaat.gender ?? undefined;
      if (!species || !gender) {
        overgeslagen.push({
          externalId: keuze.externalId,
          naam: kandidaat.name,
          reden: !species
            ? "Kies eerst de soort — AnimalShelter zegt alleen \"other\"."
            : "Kies eerst het geslacht — AnimalShelter geeft het als onbekend door.",
        });
        continue;
      }

      const [nieuw] = await db
        .insert(animals)
        .values(buildAnimalInsert(external, { species, gender }, kandidaat.slug))
        .returning();

      await db.insert(animalShelterLinks).values({
        externalId: keuze.externalId,
        animalId: nieuw.id,
        externalNumber: external.nummer,
        category: external.categorie,
        matchMethod: "import",
        status: "gekoppeld",
        linkedBy: session?.userId ?? null,
        linkedAt: new Date(),
        lastSeenAt: new Date(),
      });

      await logAudit("animalshelter_dier_geimporteerd", "animal", nieuw.id, null, {
        externalId: keuze.externalId,
        naam: nieuw.name,
      });

      aangemaakt.push({ externalId: keuze.externalId, animalId: nieuw.id, name: nieuw.name });
    }

    revalidatePath(PAD);
    revalidatePath(`${PAD}/importeren`);
    revalidatePath("/beheerder/dieren");

    if (aangemaakt.length === 0) {
      return {
        success: false,
        error: overgeslagen[0]?.reden ?? "Er kon geen enkel dier aangemaakt worden.",
      };
    }

    return { success: true, data: { aangemaakt, overgeslagen } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het aanmaken. Probeer het later opnieuw." };
  }
}

/** Alleen de dieren die nog vrij zijn — voor de koppel-keuzelijst. */
export async function getUnlinkedLocalAnimals(): Promise<
  ActionResult<{ id: number; name: string; species: string | null }[]>
> {
  const geweigerd = await guard();
  if (geweigerd) return geweigerd;

  try {
    const [remote, lokaal, links] = await Promise.all([
      fetchAllAnimals(),
      db.select().from(animals),
      db.select().from(animalShelterLinks),
    ]);
    const match = matchAnimals(remote, lokaal as LocalAnimalRecord[], links);
    return {
      success: true,
      data: match.enkelLokaal.map((l) => ({
        id: l.id,
        name: l.name,
        species: l.species ?? null,
      })),
    };
  } catch {
    return { success: false, error: "Kon de lijst niet ophalen." };
  }
}
