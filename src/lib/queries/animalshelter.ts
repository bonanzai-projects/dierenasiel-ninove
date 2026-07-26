import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { animals, animalShelterFieldDecisions, animalShelterLinks } from "@/lib/db/schema";
import { fetchAllAnimals } from "@/lib/animalshelter/client";
import { isAnimalShelterEnabled } from "@/lib/animalshelter/config";
import { AnimalShelterError } from "@/lib/animalshelter/http";
import { diffAnimal, type AnimalDiff } from "@/lib/animalshelter/diff";
import { buildImportPreview, type ImportCandidate } from "@/lib/animalshelter/import";
import { matchAnimals } from "@/lib/animalshelter/match";
import {
  buildOverview,
  type DecisionRecord,
  type LocalAnimalRecord,
  type OverviewModel,
} from "@/lib/animalshelter/overview";
import type { AnimalShelterAnimal } from "@/lib/animalshelter/types";

/**
 * Story 11.4 — de gegevens voor het AnimalShelter-scherm.
 *
 * De externe gegevens worden **live** opgehaald bij elk bezoek. Bewust: op een
 * vergelijkingsscherm is verse data het hele punt, en drie GET-oproepen voor 53
 * dieren is verwaarloosbaar. Er is dus geen kopie van hun data in onze database.
 *
 * Wat we wél bewaren, is uitsluitend wat een mens beslist heeft: handmatige
 * koppelingen, bewust genegeerde dieren en beslissingen per veld. Al de rest
 * wordt telkens opnieuw afgeleid.
 */

export type AnimalShelterFetchError = {
  code: "disabled" | "auth_failed" | "unreachable";
  message: string;
};

export type OverviewResult =
  | { ok: true; model: OverviewModel; opgehaaldOp: Date }
  | { ok: false; error: AnimalShelterFetchError };

export type ComparisonResult =
  | {
      ok: true;
      external: AnimalShelterAnimal;
      local: LocalAnimalRecord | null;
      diff: AnimalDiff | null;
      kandidaten: { id: number; name: string; species: string | null }[];
      genegeerdDier: boolean;
    }
  | { ok: false; error: AnimalShelterFetchError };

function toFetchError(error: unknown): AnimalShelterFetchError {
  if (error instanceof AnimalShelterError) {
    if (error.code === "disabled") {
      return {
        code: "disabled",
        message:
          "De koppeling met AnimalShelter staat uit. Zet ANIMALSHELTER_ENABLED op \"true\" en vul de credentials aan.",
      };
    }
    if (error.code === "auth_failed") {
      return {
        code: "auth_failed",
        message: "Aanmelden bij AnimalShelter lukte niet. Controleer de credentials.",
      };
    }
  }
  return {
    code: "unreachable",
    message: "AnimalShelter is momenteel niet bereikbaar. Probeer het straks opnieuw.",
  };
}

async function loadLocalState() {
  const [rijen, links, decisions] = await Promise.all([
    db.select().from(animals),
    db.select().from(animalShelterLinks),
    db.select().from(animalShelterFieldDecisions),
  ]);

  const locals: LocalAnimalRecord[] = rijen.map((a) => ({
    id: a.id,
    name: a.name,
    identificationNr: a.identificationNr,
    dossierNr: a.dossierNr,
    species: a.species,
    breed: a.breed,
    gender: a.gender,
    dateOfBirth: a.dateOfBirth,
    isNeutered: a.isNeutered,
    intakeDate: a.intakeDate,
    intakeReason: a.intakeReason,
    websiteDescription: a.websiteDescription,
    shortDescription: a.shortDescription,
    imageUrl: a.imageUrl,
    images: a.images,
    isAvailableForAdoption: a.isAvailableForAdoption,
    isOnWebsite: a.isOnWebsite,
  }));

  const decisionRecords: DecisionRecord[] = decisions.map((d) => ({
    animalId: d.animalId,
    fieldKey: d.fieldKey,
    decision: d.decision as DecisionRecord["decision"],
    remoteValueHash: d.remoteValueHash,
    decidedAt: d.decidedAt,
    note: d.note,
  }));

  return { locals, links, decisions: decisionRecords };
}

export async function getAnimalShelterOverview(): Promise<OverviewResult> {
  if (!isAnimalShelterEnabled()) {
    return { ok: false, error: toFetchError(new AnimalShelterError("disabled", "")) };
  }

  try {
    const [remote, lokaal] = await Promise.all([fetchAllAnimals(), loadLocalState()]);
    return {
      ok: true,
      model: buildOverview({ remote, ...lokaal }),
      opgehaaldOp: new Date(),
    };
  } catch (error) {
    return { ok: false, error: toFetchError(error) };
  }
}

export async function getAnimalShelterComparison(
  externalId: number,
): Promise<ComparisonResult> {
  if (!isAnimalShelterEnabled()) {
    return { ok: false, error: toFetchError(new AnimalShelterError("disabled", "")) };
  }

  try {
    const [remote, lokaal] = await Promise.all([fetchAllAnimals(), loadLocalState()]);
    const external = remote.find((a) => a.id === externalId);
    if (!external) {
      return {
        ok: false,
        error: { code: "unreachable", message: "Dit dier staat niet (meer) bij AnimalShelter." },
      };
    }

    const match = matchAnimals(remote, lokaal.locals, lokaal.links);
    const pair = match.gekoppeld.find((p) => p.externalId === externalId);
    const local = (pair?.local as LocalAnimalRecord) ?? null;

    const diff = local
      ? diffAnimal(
          external,
          local,
          lokaal.decisions.filter((d) => d.animalId === local.id),
        )
      : null;

    // Voor het handmatig koppelen: alles wat nog vrij is, plus het dier zelf.
    const kandidaten = [...match.enkelLokaal, ...(local ? [local] : [])]
      .map((l) => ({ id: l.id, name: l.name, species: l.species ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"));

    return {
      ok: true,
      external,
      local,
      diff,
      kandidaten,
      genegeerdDier: lokaal.links.some(
        (l) => l.externalId === externalId && l.status === "genegeerd",
      ),
    };
  } catch (error) {
    return { ok: false, error: toFetchError(error) };
  }
}

export type ImportPreviewResult =
  | { ok: true; kandidaten: ImportCandidate[] }
  | { ok: false; error: AnimalShelterFetchError };

/** Story 11.8 — wat er zou aangemaakt worden, vóór er iets gebeurt. */
export async function getAnimalShelterImportPreview(): Promise<ImportPreviewResult> {
  if (!isAnimalShelterEnabled()) {
    return { ok: false, error: toFetchError(new AnimalShelterError("disabled", "")) };
  }

  try {
    const [remote, lokaal] = await Promise.all([fetchAllAnimals(), loadLocalState()]);
    const match = matchAnimals(remote, lokaal.locals, lokaal.links);
    // Alleen dieren die nog geen tegenhanger hebben; de rest hoort op het
    // vergelijkingsscherm thuis, niet in een importlijst.
    const teImporteren = remote.filter((a) =>
      match.enkelExtern.some((e) => e.id === a.id),
    );
    return {
      ok: true,
      kandidaten: buildImportPreview(teImporteren, lokaal.locals, lokaal.links),
    };
  } catch (error) {
    return { ok: false, error: toFetchError(error) };
  }
}

/** Eén extern dier ophalen zonder de rest van het scherm — voor de server-actions. */
export async function findExternalAnimal(externalId: number): Promise<AnimalShelterAnimal | null> {
  const remote = await fetchAllAnimals();
  return remote.find((a) => a.id === externalId) ?? null;
}

export async function findAnimalShelterLink(externalId: number) {
  const [row] = await db
    .select()
    .from(animalShelterLinks)
    .where(eq(animalShelterLinks.externalId, externalId))
    .limit(1);
  return row ?? null;
}
