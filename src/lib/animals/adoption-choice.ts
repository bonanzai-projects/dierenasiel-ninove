export interface AdoptionChoice {
  /** De publieke naam (schuilnaam), zoals op de adoptiewebsite. */
  name: string;
  photoUrl: string | null;
}

interface AdoptableAnimal {
  name: string;
  imageUrl?: string | null;
  images?: string[] | null;
}

/**
 * Story 10.68 — één keuze in de lijst van de adoptieaanvraag: de naam en de foto die
 * eronder verschijnt zodra het dier gekozen is. De hoofdfoto; zonder hoofdfoto de eerste
 * andere foto. Bewust enkel de publieke naam: de echte naam hoort niet op het publieke
 * formulier.
 */
export function adoptionChoice(animal: AdoptableAnimal): AdoptionChoice {
  return {
    name: animal.name,
    photoUrl: animal.imageUrl || animal.images?.find((src) => !!src) || null,
  };
}
