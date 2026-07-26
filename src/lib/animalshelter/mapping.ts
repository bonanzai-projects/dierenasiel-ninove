import type { AnimalShelterAnimal, AnimalShelterCategory } from "./types";

/**
 * Story 11.3 — de vertaallaag tussen AnimalShelter en onze fiche.
 *
 * Alleen klasse B uit de koerswijziging §2 staat hier: de velden die beide
 * systemen bijhouden en die dus uit elkaar kunnen lopen. Klasse A (kennel,
 * medisch, workflow, adoptie…) komt hier niet in voor — AnimalShelter kent die
 * velden niet. Klasse C (hun `publish`, `reserved`, `properties`,
 * `leeftijdscategorie`…) evenmin: dat tonen we elders als referentie, maar het
 * is niet overneembaar omdat er geen lokaal veld voor bestaat.
 *
 * Vier mappings zijn nog niet beslecht (§6.2). Die zijn hier expliciet
 * `notTakeable` mét reden. Bewust: liever een leeg vakje met uitleg dan een
 * verkeerd ingevuld vakje op een dierfiche.
 */

export type FieldValue = string | boolean | string[] | null;

export interface LocalAnimalSnapshot {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  identificationNr?: string | null;
  isNeutered?: boolean | null;
  intakeDate?: string | null;
  intakeReason?: string | null;
  dossierNr?: string | null;
  websiteDescription?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  images?: string[] | null;
  isAvailableForAdoption?: boolean | null;
  isOnWebsite?: boolean | null;
}

export interface FieldDefinition {
  key: string;
  label: string;
  /** De externe waarde, al omgezet naar ons formaat. */
  remote: (animal: AnimalShelterAnimal) => FieldValue;
  local: (animal: LocalAnimalSnapshot) => FieldValue;
  /** Reden waarom dit veld voor dít dier niet overneembaar is, of null. */
  notTakeable: (animal: AnimalShelterAnimal) => string | null;
  format: (value: FieldValue) => string;
  multiline?: boolean;
}

// --- normalisatie ----------------------------------------------------------

export function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = value.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
  // AnimalShelter gebruikt "-" als vulteken voor "niets ingevuld" (bv. bij `ras`).
  if (!cleaned || cleaned === "-") return null;
  return cleaned;
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `"2020-12-01 00:00:00"` of `"2017-06-26T00:00:00Z"` → `"2020-12-01"`. */
export function parseIsoDate(value: string | null | undefined): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return null;
  const [, y, m, d] = match;
  if (!isRealDate(+y, +m, +d)) return null;
  return `${y}-${m}-${d}`;
}

/**
 * `"04-08-2025"` → `"2025-08-04"`. LET OP: dit is dd-mm-jjjj, terwijl
 * `geboortedatum` in dezelfde response jjjj-mm-dd is. Twee formaten, één API.
 */
export function parseBelgianDate(value: string | null | undefined): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(text);
  if (!match) return null;
  const day = +match[1];
  const month = +match[2];
  const year = +match[3];
  if (!isRealDate(year, month, day)) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function mapSpecies(category: AnimalShelterCategory | string | null): string | null {
  if (category === "dogs") return "hond";
  if (category === "cats") return "kat";
  // "other" dekt bij ons konijn, cavia, ezel, kip en hangbuikvarken. Welke het is,
  // staat nergens in de response — dat laten we een mens kiezen (§6.2.4).
  return null;
}

export function mapGender(
  sex: string | null | undefined,
  category: AnimalShelterCategory | string | null,
): string | null {
  const code = (sex ?? "").trim().toUpperCase();
  if (code !== "M" && code !== "F") return null; // "O" heeft bij ons geen tegenhanger
  if (category === "dogs") return code === "M" ? "reu" : "teef";
  if (category === "cats") return code === "M" ? "kater" : "poes";
  return code === "M" ? "mannetje" : "vrouwtje";
}

const INTAKE_REASON_MAP: Record<string, string> = {
  afgestaan: "afstand",
  inbeslagname: "ibn",
  gevondendier: "zwerfhond", // ons label is "Vondeling"
  // "zwerfkat" bestaat bewust niet: die reden staat niet in INTAKE_REASONS (§6.2.3).
};

export function mapIntakeReason(reason: string | null | undefined): string | null {
  const key = normalizeText(reason)?.toLowerCase();
  if (!key) return null;
  return INTAKE_REASON_MAP[key] ?? null;
}

/**
 * `gecastreerd` 0 | 1 | 2. Betekenis bevestigd door Sven op 2026-07-26:
 * 0 = nee, 1 = ja, 2 = niet van toepassing.
 *
 * Voor code 2 hebben wij géén veldwaarde. Ons `isNeutered` is een drietoestand
 * ja / nee / onbekend (Story 10.29), en "niet van toepassing" is iets anders dan
 * "onbekend". Daarom geeft 2 hier `null` terug en wordt het veld voor dat dier
 * niet overneembaar gemaakt — met uitleg, in plaats van stilzwijgend leeg.
 */
export function mapNeutered(code: number | null | undefined): boolean | null {
  if (code === 0) return false;
  if (code === 1) return true;
  return null;
}

export function toBoolean(value: number | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  return value === 1;
}

// --- weergave --------------------------------------------------------------

const LEEG = "—";

function formatText(value: FieldValue): string {
  if (value === null || value === "") return LEEG;
  if (Array.isArray(value)) return value.length ? `${value.length} foto's` : LEEG;
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  return value;
}

/**
 * Weergave van een tekst die HTML bevat. AnimalShelter levert de website-tekst
 * als HTML aan, en zo hoort ze ook bewaard te worden — maar `<p>Ras: …</p>` in
 * een vergelijkingstabel leest niet. Dit raakt alleen de weergave: de waarde die
 * overgenomen en gehasht wordt, blijft de oorspronkelijke HTML.
 */
function formatRichText(value: FieldValue): string {
  if (typeof value !== "string" || !value.trim()) return LEEG;
  return value
    // Eerst de regeleindes gelijktrekken: anders levert een `</p>` gevolgd door
    // een echte CRLF twee regeleindes op in plaats van één.
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(value: FieldValue): string {
  if (typeof value !== "string") return LEEG;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

const nooitOverneembaar = () => null;

// --- de velden -------------------------------------------------------------

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: "name",
    // Story 10.42: bij AnimalShelter is de naam altijd de schuilnaam — die staat
    // op adopteereendier.be. Ons `name` bevat diezelfde publieke naam.
    label: "Naam / Schuilnaam",
    remote: (a) => normalizeText(a.naam),
    local: (a) => normalizeText(a.name),
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "species",
    label: "Soort",
    remote: (a) => mapSpecies(a.categorie),
    local: (a) => normalizeText(a.species),
    notTakeable: (a) =>
      mapSpecies(a.categorie) === null
        ? "AnimalShelter zegt alleen \"other\"; kies zelf de juiste soort op de fiche."
        : null,
    format: formatText,
  },
  {
    key: "breed",
    label: "Ras",
    remote: (a) => normalizeText(a.ras),
    local: (a) => normalizeText(a.breed),
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "gender",
    label: "Geslacht",
    remote: (a) => mapGender(a.geslacht, a.categorie),
    local: (a) => normalizeText(a.gender),
    notTakeable: (a) =>
      mapGender(a.geslacht, a.categorie) === null
        ? "AnimalShelter geeft het geslacht als onbekend door; wij kennen die waarde niet."
        : null,
    format: formatText,
  },
  {
    key: "dateOfBirth",
    label: "Geboortedatum",
    remote: (a) => parseIsoDate(a.geboortedatum),
    local: (a) => parseIsoDate(a.dateOfBirth),
    notTakeable: nooitOverneembaar,
    format: formatDate,
  },
  {
    key: "identificationNr",
    label: "Chipnummer",
    remote: (a) => normalizeText(a.identificatie),
    local: (a) => normalizeText(a.identificationNr),
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "isNeutered",
    label: "Gesteriliseerd/gecastreerd",
    remote: (a) => mapNeutered(a.gecastreerd),
    local: (a) => (a.isNeutered === null || a.isNeutered === undefined ? null : a.isNeutered),
    notTakeable: (a) =>
      a.gecastreerd === 0 || a.gecastreerd === 1
        ? null
        : "AnimalShelter geeft hier \"niet van toepassing\" door; wij hebben daar geen waarde voor.",
    format: formatText,
  },
  {
    key: "intakeDate",
    label: "Intakedatum",
    remote: (a) => parseBelgianDate(a.checkin_date),
    local: (a) => parseIsoDate(a.intakeDate),
    notTakeable: nooitOverneembaar,
    format: formatDate,
  },
  {
    key: "intakeReason",
    label: "Reden van intake",
    remote: (a) => mapIntakeReason(a.checkin_reason),
    local: (a) => normalizeText(a.intakeReason),
    notTakeable: (a) =>
      normalizeText(a.checkin_reason) && mapIntakeReason(a.checkin_reason) === null
        ? `AnimalShelter geeft "${normalizeText(a.checkin_reason)}" door; die reden bestaat bij ons niet.`
        : null,
    format: formatText,
  },
  {
    key: "dossierNr",
    label: "Dossiernummer",
    remote: (a) => (a.nummer === null ? null : String(a.nummer)),
    local: (a) => normalizeText(a.dossierNr),
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "websiteDescription",
    label: "Website-tekst",
    remote: (a) => normalizeText(a.beschrijving_nl),
    local: (a) => normalizeText(a.websiteDescription),
    notTakeable: nooitOverneembaar,
    format: formatRichText,
    multiline: true,
  },
  {
    key: "shortDescription",
    label: "Korte beschrijving",
    remote: (a) => normalizeText(a.korte_beschrijving_nl),
    local: (a) => normalizeText(a.shortDescription),
    notTakeable: nooitOverneembaar,
    format: formatRichText,
    multiline: true,
  },
  {
    key: "imageUrl",
    label: "Hoofdfoto",
    remote: (a) => normalizeText(a.hoofdbeeld),
    local: (a) => normalizeText(a.imageUrl),
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "images",
    label: "Extra foto's",
    remote: (a) =>
      [...a.extra_beelden].sort((x, y) => x.sortorder - y.sortorder).map((b) => b.image),
    local: (a) => a.images ?? [],
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "isAvailableForAdoption",
    label: "Ter adoptie",
    remote: (a) => toBoolean(a.adoptie),
    local: (a) => a.isAvailableForAdoption ?? null,
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
  {
    key: "isOnWebsite",
    label: "Op de website",
    remote: (a) => toBoolean(a.publishonwebsite),
    local: (a) => a.isOnWebsite ?? null,
    notTakeable: nooitOverneembaar,
    format: formatText,
  },
];

const BY_KEY = new Map(FIELD_DEFINITIONS.map((f) => [f.key, f]));

export function fieldDefinition(key: string): FieldDefinition {
  const definition = BY_KEY.get(key);
  if (!definition) throw new Error(`Onbekend AnimalShelter-veld: ${key}`);
  return definition;
}
