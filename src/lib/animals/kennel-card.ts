import { genderOptionsForSpecies, getIntakeReasonLabel } from "@/lib/constants";

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
    /** Story 10.80: reden van intake, naast "In huis sinds". */
    intakeReason: string | null;
    /** Laatst gewogen gewicht in kg, al opgemaakt (bv. "32,5"). Story 10.55. */
    weightKg: string | null;
  };
  /** Datum van de meest recente vaccinatie, of null. */
  lastVaccination: string | null;
  /**
   * Story 10.80: ontwormingen (niet de vlooienbehandeling) met hun product, in
   * eender welke volgorde — de kaart neemt de laatste `MAX_ONTWORMINGEN`.
   */
  dewormings: { date: string; type: string }[];
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
  /** Story 10.80: tabel, oudste bovenaan, korte datums (DD.MM.JJ). */
  ontwormingen: { datum: string; product: string }[];
  /** Lege regels onder de tabel om met de hand bij te schrijven (tot `MAX_ONTWORMINGEN`). */
  ontwormingLegeRegels: number;
  gewicht: string;
  inHuisSinds: string;
  /** Story 10.80: bv. "Afstand door eigenaar"; leeg als onbekend. */
  redenIntake: string;
}

/** Zoveel regels telt de ontwormingstabel op de kaart. */
export const MAX_ONTWORMINGEN = 6;

/** `"2024-10-27"` → `"27.10.2024"`, zoals op de papieren kaart. */
function datum(waarde: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((waarde ?? "").trim());
  if (!match) return "";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

/** "2026-07-01" → "01.07.26": de korte datums in de ontwormingstabel (Sven). */
function korteDatum(waarde: string): string {
  const match = /^\d{2}(\d{2})-(\d{2})-(\d{2})$/.exec(waarde.trim());
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
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
  dewormings,
}: KennelCardInput): KennelCardModel {
  const opties = genderOptionsForSpecies(animal.species ?? "");
  const waarde = tekst(animal.gender).toLowerCase();
  const oud = OUDE_GESLACHTEN[waarde];

  // Story 10.80: oudste bovenaan, zodat een nieuwe ontworming met de hand onderaan kan.
  const ontwormingen = [...dewormings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_ONTWORMINGEN)
    .map((o) => ({ datum: korteDatum(o.date), product: tekst(o.type) }));

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
    ontwormingen,
    ontwormingLegeRegels: MAX_ONTWORMINGEN - ontwormingen.length,
    gewicht: tekst(animal.weightKg),
    inHuisSinds: datum(animal.intakeDate),
    redenIntake: animal.intakeReason && getIntakeReasonLabel(animal.intakeReason) !== "—"
      ? getIntakeReasonLabel(animal.intakeReason)
      : "",
  };
}
