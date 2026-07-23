/**
 * Story 10.32 — de gedrags-/omgangseigenschappen van een dier.
 *
 * Dit zijn eigenschappen van het DIER. Let op het verschil met de gelijkaardig
 * klinkende vragen in `adoptionCandidates.questionnaireAnswers`: die gaan over het
 * gezin van de kandidaat-adoptant (heeft ú kinderen/een tuin/ervaring), niet over
 * het dier. Ze worden beheerd op de dierdetailpagina en o.a. gebruikt op de
 * affiche voor het bord buiten.
 *
 * Volgorde en labels volgen het papieren blad van het asiel.
 */

export const ANIMAL_TRAITS = [
  { key: "kinderen_tot_6", label: "Kan met kinderen om <6 jaar" },
  { key: "kinderen_tot_14", label: "Kan met kinderen om <14 jaar" },
  { key: "tuin_nodig", label: "Heeft toegang tot tuin nodig" },
  { key: "zindelijk", label: "Zindelijk" },
  { key: "vervoer_auto", label: "Kan vervoerd worden in de auto" },
  { key: "andere_honden", label: "Kan met andere honden" },
  { key: "katten", label: "Kan met katten" },
  { key: "alleen_thuis", label: "Kan alleen thuis blijven" },
  { key: "basiscommandos", label: "Basis commando's gekend" },
  { key: "ervaring_vereist", label: "Ervaring vereist" },
] as const;

export type AnimalTraitKey = (typeof ANIMAL_TRAITS)[number]["key"];

/**
 * Drie waarden. Het papieren blad gebruikt "?" en "niet gekend" door elkaar;
 * dat is hetzelfde en wordt hier als één waarde getoond.
 */
export const ANIMAL_TRAIT_VALUES = ["ja", "nee", "niet_gekend"] as const;

export type AnimalTraitValue = (typeof ANIMAL_TRAIT_VALUES)[number];

export const ANIMAL_TRAIT_VALUE_LABELS: Record<AnimalTraitValue, string> = {
  ja: "ja",
  nee: "nee",
  niet_gekend: "niet gekend",
};

export type AnimalTraits = Record<string, string>;

export interface AnimalTraitLine {
  key: AnimalTraitKey;
  label: string;
  value: string;
}

/** Opgeslagen waarde → leesbare tekst. Alles wat we niet herkennen = "niet gekend". */
export function animalTraitValue(
  traits: AnimalTraits | null | undefined,
  key: string,
): string {
  const raw = traits?.[key];
  if (raw && (ANIMAL_TRAIT_VALUES as readonly string[]).includes(raw)) {
    return ANIMAL_TRAIT_VALUE_LABELS[raw as AnimalTraitValue];
  }
  return ANIMAL_TRAIT_VALUE_LABELS.niet_gekend;
}

/** De 10 regels van het blok "Eigenschappen", altijd volledig en in vaste volgorde. */
export function animalTraitLines(
  traits: AnimalTraits | null | undefined,
): AnimalTraitLine[] {
  return ANIMAL_TRAITS.map((trait) => ({
    key: trait.key,
    label: trait.label,
    value: animalTraitValue(traits, trait.key),
  }));
}
