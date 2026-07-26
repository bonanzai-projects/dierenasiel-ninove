import { slugify } from "@/lib/utils";
import {
  mapGender,
  mapIntakeReason,
  mapNeutered,
  mapSpecies,
  normalizeText,
  parseBelgianDate,
  parseIsoDate,
  toBoolean,
} from "./mapping";
import { normalizeChip, type ExistingLink } from "./match";
import type { LocalAnimalRecord } from "./overview";
import type { AnimalShelterAnimal } from "./types";

/**
 * Story 11.8 — dieren die alleen bij AnimalShelter bestaan lokaal aanmaken.
 *
 * Bij de meting van 2026-07-26 waren dat er 46 van de 53. Zonder deze stap
 * blijft Epic 11 een vergelijkingsscherm in plaats van een inhaalslag.
 *
 * Pure functies: hier wordt alleen berekend wát er zou gebeuren. Het effectief
 * aanmaken gebeurt in `src/lib/actions/animalshelter.ts`, pas nadat de beheerder
 * de voorbeeldweergave gezien en bevestigd heeft.
 *
 * Twee dingen die zonder aandacht stukgaan:
 *  - `animals.slug` is uniek, en er staan vier katten met de naam "Kitten" bij
 *    AnimalShelter. Slugs worden daarom doorgeteld, ook binnen één import.
 *  - `animals.description` is NOT NULL (Story 10.39): een lege beschrijving is
 *    `""`, nooit `null`.
 */

export interface ImportKeuze {
  species?: string;
  gender?: string;
}

export interface ImportCandidate {
  externalId: number;
  name: string;
  category: string;
  /** Gemapt, of null wanneer de beheerder het moet kiezen. */
  species: string | null;
  gender: string | null;
  breed: string | null;
  chip: string | null;
  dateOfBirth: string | null;
  intakeDate: string | null;
  intakeReason: string | null;
  slug: string;
  /** Redenen waarom dit dier niet aangemaakt kan worden. Leeg = het mag. */
  blockers: string[];
  /** Wat de beheerder nog moet invullen voor het aangemaakt kan worden. */
  vragen: ("species" | "gender")[];
}

const MAX_SLUG_POGINGEN = 200;

export function buildUniqueSlug(naam: string, bezet: Set<string>): string {
  const basis = slugify(naam) || "dier";
  if (!bezet.has(basis)) return basis;
  for (let n = 2; n < MAX_SLUG_POGINGEN; n++) {
    const kandidaat = `${basis}-${n}`;
    if (!bezet.has(kandidaat)) return kandidaat;
  }
  // Praktisch onbereikbaar; beter een lelijke slug dan een botsing in de database.
  return `${basis}-${bezet.size + 1}`;
}

export function buildImportPreview(
  remote: AnimalShelterAnimal[],
  locals: LocalAnimalRecord[],
  links: ExistingLink[],
): ImportCandidate[] {
  const chipsLokaal = new Set(
    locals.map((l) => normalizeChip(l.identificationNr)).filter(Boolean),
  );
  const linkPerExterne = new Map(links.map((l) => [l.externalId, l]));
  const bezetteSlugs = new Set<string>(
    locals.map((l) => slugify(l.name)).filter(Boolean),
  );

  const kandidaten: ImportCandidate[] = [];

  for (const external of remote) {
    const link = linkPerExterne.get(external.id);
    // Bewust genegeerd = niet aanbieden. Wie dat wil terugdraaien, doet dat op
    // het vergelijkingsscherm van dat dier.
    if (link?.status === "genegeerd") continue;

    const species = mapSpecies(external.categorie);
    const gender = mapGender(external.geslacht, external.categorie);
    const chip = normalizeText(external.identificatie);

    const blockers: string[] = [];
    if (link?.animalId != null) {
      blockers.push("Dit dier is al aan een fiche gekoppeld.");
    }
    if (chip && chipsLokaal.has(normalizeChip(chip))) {
      blockers.push("Er staat al een dier met dit chipnummer in onze database.");
    }
    if (!normalizeText(external.naam)) {
      blockers.push("Dit dier heeft geen naam bij AnimalShelter.");
    }

    const vragen: ("species" | "gender")[] = [];
    if (species === null) vragen.push("species");
    if (gender === null) vragen.push("gender");

    const slug = buildUniqueSlug(external.naam, bezetteSlugs);
    bezetteSlugs.add(slug);

    kandidaten.push({
      externalId: external.id,
      name: external.naam,
      category: external.categorie,
      species,
      gender,
      breed: normalizeText(external.ras),
      chip,
      dateOfBirth: parseIsoDate(external.geboortedatum),
      intakeDate: parseBelgianDate(external.checkin_date),
      intakeReason: mapIntakeReason(external.checkin_reason),
      slug,
      blockers,
      vragen,
    });
  }

  return kandidaten;
}

/**
 * De waarden voor één nieuwe fiche. Alleen wat AnimalShelter betrouwbaar
 * aanlevert; de rest blijft leeg en is handwerk van het asiel.
 */
export function buildAnimalInsert(
  external: AnimalShelterAnimal,
  keuze: ImportKeuze,
  slug: string,
) {
  const species = keuze.species ?? mapSpecies(external.categorie);
  const gender = keuze.gender ?? mapGender(external.geslacht, external.categorie);

  return {
    name: external.naam.trim(),
    slug,
    species: species ?? "",
    gender: gender ?? "",
    breed: normalizeText(external.ras),
    dateOfBirth: parseIsoDate(external.geboortedatum),
    identificationNr: normalizeText(external.identificatie),
    intakeDate: parseBelgianDate(external.checkin_date),
    intakeReason: mapIntakeReason(external.checkin_reason),
    dossierNr: external.nummer === null ? null : String(external.nummer),
    // NOT NULL — een lege beschrijving is "", nooit null (Story 10.39).
    description: "",
    websiteDescription: normalizeText(external.beschrijving_nl),
    shortDescription: normalizeText(external.korte_beschrijving_nl)?.slice(0, 300) ?? null,
    imageUrl: normalizeText(external.hoofdbeeld),
    images: [...external.extra_beelden]
      .sort((a, b) => a.sortorder - b.sortorder)
      .map((b) => b.image),
    isAvailableForAdoption: toBoolean(external.adoptie) ?? false,
    isOnWebsite: toBoolean(external.publishonwebsite) ?? false,
    // 0 = nee, 1 = ja, 2 = niet van toepassing (bevestigd door Sven 2026-07-26).
    // Bij 2 blijft het veld leeg: "niet van toepassing" is geen waarde die wij kennen.
    isNeutered: mapNeutered(external.gecastreerd),
    // Het dier komt aan het begin van ÓNZE workflow te staan. Kennel, fase en
    // uitstroom blijven handwerk van het asiel — dat is klasse A (§2).
    workflowPhase: "intake",
    status: "beschikbaar",
    isInShelter: true,
  };
}
