interface AnimalNames {
  name: string;
  aliasName?: string | null;
}

/**
 * De naam van een dier zoals het kennelscherm hem toont: eerst de echte naam,
 * dan de schuilnaam — "Feliz/Marie". Zonder echte naam enkel de schuilnaam.
 *
 * Sinds Story 10.42 is `name` de schuilnaam (de publieke naam op
 * adopteereendier.be) en `aliasName` de echte naam. Sven (2026-09-12) wil in
 * de kennels beide zien, met de echte naam vooraan (Story 10.67).
 */
export function kennelAnimalName({ name, aliasName }: AnimalNames): string {
  const schuilnaam = name.trim();
  const echteNaam = aliasName?.trim() ?? "";
  if (!echteNaam || echteNaam.toLocaleLowerCase("nl") === schuilnaam.toLocaleLowerCase("nl")) {
    return schuilnaam;
  }
  return `${echteNaam}/${schuilnaam}`;
}
