import { genderOptionsForSpecies } from "@/lib/constants";

/**
 * Story 10.43 — de kaart die aan de kennel hangt.
 *
 * Vervangt de handgeschreven steekkaart die Sven als voorbeeld doorstuurde. De
 * indeling volgt die kaart bewust: dezelfde velden, dezelfde volgorde, en de
 * keuzes (Reu/Teef, Ja/Neen) blijven allebei staan met één gemarkeerd — zoals je
 * ze op papier omcirkelt.
 *
 * Pure functie: hier wordt alleen bepaald wát er op de kaart komt. Het tekenen
 * gebeurt in `KennelCardPdf`.
 *
 * Wat we niet weten, blijft **leeg** in plaats van een streepje te tonen. De kaart
 * hangt aan een kennel en er wordt met de hand op bijgeschreven; een streepje
 * suggereert onterecht dat het veld afgehandeld is.
 */

export interface KennelCardInput {
  animal: {
    name: string;
    aliasName: string | null;
    species: string | null;
    breed: string | null;
    gender: string | null;
    isNeutered: boolean | null;
    dateOfBirth: string | null;
    intakeDate: string | null;
    /** Laatst gewogen gewicht in kg, al opgemaakt (bv. "32,5"). Story 10.55. */
    weightKg: string | null;
  };
  /** Datum van de meest recente vaccinatie, of null. */
  lastVaccination: string | null;
  /** Datum van de meest recente ontworming (niet de vlooienbehandeling), of null. */
  lastDeworming: string | null;
}

export interface KennelCardOption {
  label: string;
  gemarkeerd: boolean;
}

export interface KennelCardModel {
  ras: string;
  naam: string;
  echteNaam: string;
  geslacht: KennelCardOption[];
  steriel: KennelCardOption[];
  geboortedatum: string;
  gevaccineerd: string;
  ontworming: string;
  gewicht: string;
  inHuisSinds: string;
}

/** `"2024-10-27"` → `"27.10.2024"`, zoals op de papieren kaart. */
function datum(waarde: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((waarde ?? "").trim());
  if (!match) return "";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function tekst(waarde: string | null | undefined): string {
  return (waarde ?? "").trim();
}

function hoofdletter(waarde: string): string {
  return waarde.charAt(0).toUpperCase() + waarde.slice(1);
}

/**
 * Waarden van vóór Story 10.37, die nog bij een deel van de dieren in de database
 * staan. Ze zijn ondubbelzinnig (mannelijk = de mannelijke optie van die soort),
 * dus we markeren ze gewoon in plaats van het vakje leeg te laten. "onbekend"
 * blijft bewust ongemarkeerd — dat is geen geslacht maar het ontbreken ervan.
 */
const OUDE_GESLACHTEN: Record<string, "m" | "v"> = {
  mannelijk: "m",
  vrouwelijk: "v",
};

export function buildKennelCard({
  animal,
  lastVaccination,
  lastDeworming,
}: KennelCardInput): KennelCardModel {
  const opties = genderOptionsForSpecies(animal.species ?? "");
  const waarde = tekst(animal.gender).toLowerCase();
  const oud = OUDE_GESLACHTEN[waarde];

  const geslacht = opties.map((optie, index) => ({
    label: hoofdletter(optie.label),
    gemarkeerd: oud
      ? index === (oud === "m" ? 0 : 1) // de lijst staat altijd mannelijk-eerst
      : optie.value === waarde,
  }));

  return {
    ras: tekst(animal.breed),
    naam: tekst(animal.name),
    echteNaam: tekst(animal.aliasName),
    geslacht,
    steriel: [
      { label: "Ja", gemarkeerd: animal.isNeutered === true },
      { label: "Neen", gemarkeerd: animal.isNeutered === false },
    ],
    geboortedatum: datum(animal.dateOfBirth),
    gevaccineerd: datum(lastVaccination),
    ontworming: datum(lastDeworming),
    gewicht: tekst(animal.weightKg),
    inHuisSinds: datum(animal.intakeDate),
  };
}
