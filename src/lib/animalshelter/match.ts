import type { AnimalShelterAnimal } from "./types";

/**
 * Story 11.2 — welk extern dier hoort bij welke lokale fiche.
 *
 * Pure functie, geen database. De regels op een rij, in volgorde van gezag:
 *
 *  1. Een **bewaarde koppeling** wint altijd. Iemand heeft die ooit bevestigd;
 *     een heuristiek mag dat niet overrulen.
 *  2. **Chipnummer**, genormaliseerd op cijfers. Dat is de enige echt unieke,
 *     wettelijk verankerde sleutel. Let op: onze eigen database bevat vervuiling
 *     (Shana heeft een tab vóór haar nummer), dus ruw vergelijken werkt niet.
 *  3. **Dossiernummer** ↔ hun `nummer`. Foxy toont dat Sven dat nummer al met de
 *     hand overneemt. Alleen gebruikt als er geen chip is om op te gaan.
 *  4. Al de rest blijft ongekoppeld. Namen worden bewust NIET gebruikt: bij
 *     AnimalShelter staan vijf katten onder "Matcha, Latté, Caramel, Mocha & Cappu".
 *
 * Twee dieren zonder chip mogen nooit aan elkaar geplakt worden — een lege sleutel
 * is geen sleutel. En bij twijfel (twee lokale dieren met dezelfde chip) koppelen
 * we niets automatisch, maar leggen we het voor aan een mens.
 */

export interface LocalAnimalRef {
  id: number;
  name: string;
  identificationNr: string | null;
  dossierNr: string | null;
  species?: string | null;
}

export interface ExistingLink {
  externalId: number;
  animalId: number | null;
  status: string;
}

export type MatchMethod = "chip" | "nummer" | "handmatig";

export interface MatchedPair {
  externalId: number;
  animalId: number;
  method: MatchMethod;
  external: AnimalShelterAnimal;
  local: LocalAnimalRef;
}

export interface AmbiguousMatch {
  external: AnimalShelterAnimal;
  kandidaten: LocalAnimalRef[];
}

export interface MatchResult {
  gekoppeld: MatchedPair[];
  enkelExtern: AnimalShelterAnimal[];
  enkelLokaal: LocalAnimalRef[];
  ambigu: AmbiguousMatch[];
  genegeerd: AnimalShelterAnimal[];
  samenvatting: {
    gekoppeld: number;
    enkelExtern: number;
    enkelLokaal: number;
    ambigu: number;
    genegeerd: number;
  };
}

export function normalizeChip(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const digits = String(value).replace(/\D/g, "");
  // Voorloopnullen wegwerken zodat "02087" en "2087" hetzelfde zijn.
  return digits.replace(/^0+/, "");
}

function groupBy(
  locals: LocalAnimalRef[],
  key: (local: LocalAnimalRef) => string,
): Map<string, LocalAnimalRef[]> {
  const map = new Map<string, LocalAnimalRef[]>();
  for (const local of locals) {
    const k = key(local);
    if (!k) continue; // een lege sleutel is geen sleutel
    map.set(k, [...(map.get(k) ?? []), local]);
  }
  return map;
}

export function matchAnimals(
  remote: AnimalShelterAnimal[],
  locals: LocalAnimalRef[],
  links: ExistingLink[] = [],
): MatchResult {
  const byChip = groupBy(locals, (l) => normalizeChip(l.identificationNr));
  byChip.delete("");
  const byNumber = groupBy(locals, (l) => normalizeNumber(l.dossierNr));
  byNumber.delete("");

  const localById = new Map(locals.map((l) => [l.id, l]));
  const linkByExternal = new Map(links.map((l) => [l.externalId, l]));

  const gekoppeld: MatchedPair[] = [];
  const enkelExtern: AnimalShelterAnimal[] = [];
  const ambigu: AmbiguousMatch[] = [];
  const genegeerd: AnimalShelterAnimal[] = [];
  const geclaimd = new Set<number>();

  for (const external of remote) {
    const link = linkByExternal.get(external.id);

    if (link?.status === "genegeerd") {
      genegeerd.push(external);
      continue;
    }

    // 1. Bewaarde koppeling — wint van elke gok, zolang het dier nog bestaat.
    if (link?.animalId != null) {
      const local = localById.get(link.animalId);
      if (local && !geclaimd.has(local.id)) {
        geclaimd.add(local.id);
        gekoppeld.push({ externalId: external.id, animalId: local.id, method: "handmatig", external, local });
        continue;
      }
    }

    // 2. Chipnummer.
    const chip = normalizeChip(external.identificatie);
    const chipKandidaten = (chip ? byChip.get(chip) : undefined)?.filter((l) => !geclaimd.has(l.id)) ?? [];
    if (chipKandidaten.length > 1) {
      ambigu.push({ external, kandidaten: chipKandidaten });
      continue;
    }
    if (chipKandidaten.length === 1) {
      const local = chipKandidaten[0];
      geclaimd.add(local.id);
      gekoppeld.push({ externalId: external.id, animalId: local.id, method: "chip", external, local });
      continue;
    }

    // 3. Dossiernummer, alleen wanneer de chip niets opleverde.
    const nummer = normalizeNumber(external.nummer);
    const nummerKandidaten = (nummer ? byNumber.get(nummer) : undefined)?.filter((l) => !geclaimd.has(l.id)) ?? [];
    if (nummerKandidaten.length > 1) {
      ambigu.push({ external, kandidaten: nummerKandidaten });
      continue;
    }
    if (nummerKandidaten.length === 1) {
      const local = nummerKandidaten[0];
      geclaimd.add(local.id);
      gekoppeld.push({ externalId: external.id, animalId: local.id, method: "nummer", external, local });
      continue;
    }

    enkelExtern.push(external);
  }

  const enkelLokaal = locals.filter((l) => !geclaimd.has(l.id));

  return {
    gekoppeld,
    enkelExtern,
    enkelLokaal,
    ambigu,
    genegeerd,
    samenvatting: {
      gekoppeld: gekoppeld.length,
      enkelExtern: enkelExtern.length,
      enkelLokaal: enkelLokaal.length,
      ambigu: ambigu.length,
      genegeerd: genegeerd.length,
    },
  };
}
