import { diffAnimal, type StoredDecision } from "./diff";
import { matchAnimals, type ExistingLink, type LocalAnimalRef, type MatchMethod } from "./match";
import type { LocalAnimalSnapshot } from "./mapping";
import type { AnimalShelterAnimal, AnimalShelterCategory } from "./types";

/**
 * Story 11.4 — het model achter het overzichtsscherm.
 *
 * Pure functie: matching (11.2) en diff (11.3) worden hier samengebracht tot de
 * emmers die de beheerder te zien krijgt. Geen database, geen sessie.
 *
 * De volgorde is niet cosmetisch. Wie dit scherm opent wil weten wat er van hem
 * verwacht wordt, niet wat er al in orde is — dus wat aandacht vraagt staat boven.
 */

export type OverviewBucket =
  | "verschillen"
  | "gelijk"
  | "enkel_extern"
  | "ambigu"
  | "genegeerd";

/**
 * Doorsnede i.p.v. `extends`: `LocalAnimalRef` eist `dossierNr`, terwijl het in
 * `LocalAnimalSnapshot` optioneel is. Twee interfaces uitbreiden met een veld dat
 * niet identiek gedeclareerd is, mag niet.
 */
export type LocalAnimalRecord = LocalAnimalRef &
  LocalAnimalSnapshot & { id: number; name: string };

export interface DecisionRecord extends StoredDecision {
  animalId: number;
}

export interface OverviewEntry {
  externalId: number;
  externalName: string;
  externalNumber: number | null;
  category: AnimalShelterCategory;
  animalId: number | null;
  localName: string | null;
  matchMethod: MatchMethod | null;
  open: number;
  genegeerd: number;
  bucket: OverviewBucket;
  /** Alleen bij een ambigue match: waaruit de beheerder moet kiezen. */
  kandidaten?: { id: number; name: string }[];
}

export interface OverviewModel {
  entries: OverviewEntry[];
  enkelLokaal: { id: number; name: string; species: string | null }[];
  tellers: Record<OverviewBucket | "enkelLokaal", number>;
}

export interface OverviewInput {
  remote: AnimalShelterAnimal[];
  locals: LocalAnimalRecord[];
  links: ExistingLink[];
  decisions: DecisionRecord[];
}

/** Wat aandacht vraagt eerst; wat af is onderaan. */
const BUCKET_ORDER: Record<OverviewBucket, number> = {
  verschillen: 0,
  ambigu: 1,
  enkel_extern: 2,
  gelijk: 3,
  genegeerd: 4,
};

function basis(external: AnimalShelterAnimal) {
  return {
    externalId: external.id,
    externalName: external.naam,
    externalNumber: external.nummer,
    category: external.categorie,
    animalId: null,
    localName: null,
    matchMethod: null,
    open: 0,
    genegeerd: 0,
  } satisfies Omit<OverviewEntry, "bucket">;
}

export function buildOverview({
  remote,
  locals,
  links,
  decisions,
}: OverviewInput): OverviewModel {
  const match = matchAnimals(remote, locals, links);

  const decisionsByAnimal = new Map<number, DecisionRecord[]>();
  for (const decision of decisions) {
    decisionsByAnimal.set(decision.animalId, [
      ...(decisionsByAnimal.get(decision.animalId) ?? []),
      decision,
    ]);
  }

  const entries: OverviewEntry[] = [];

  for (const pair of match.gekoppeld) {
    const diff = diffAnimal(
      pair.external,
      pair.local as LocalAnimalSnapshot,
      decisionsByAnimal.get(pair.animalId) ?? [],
    );

    entries.push({
      ...basis(pair.external),
      animalId: pair.animalId,
      localName: pair.local.name,
      matchMethod: pair.method,
      open: diff.samenvatting.open,
      genegeerd: diff.samenvatting.genegeerd,
      bucket: diff.samenvatting.open > 0 ? "verschillen" : "gelijk",
    });
  }

  for (const item of match.ambigu) {
    entries.push({
      ...basis(item.external),
      bucket: "ambigu",
      kandidaten: item.kandidaten.map((k) => ({ id: k.id, name: k.name })),
    });
  }

  for (const external of match.enkelExtern) {
    entries.push({ ...basis(external), bucket: "enkel_extern" });
  }

  for (const external of match.genegeerd) {
    entries.push({ ...basis(external), bucket: "genegeerd" });
  }

  entries.sort((a, b) => {
    const perEmmer = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket];
    if (perEmmer !== 0) return perEmmer;
    if (a.open !== b.open) return b.open - a.open;
    return a.externalName.localeCompare(b.externalName, "nl");
  });

  const tel = (bucket: OverviewBucket) => entries.filter((e) => e.bucket === bucket).length;

  return {
    entries,
    enkelLokaal: match.enkelLokaal.map((l) => ({
      id: l.id,
      name: l.name,
      species: l.species ?? null,
    })),
    tellers: {
      verschillen: tel("verschillen"),
      gelijk: tel("gelijk"),
      enkel_extern: tel("enkel_extern"),
      ambigu: tel("ambigu"),
      genegeerd: tel("genegeerd"),
      enkelLokaal: match.enkelLokaal.length,
    },
  };
}
