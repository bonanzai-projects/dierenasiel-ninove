/**
 * Configuratie van de AnimalShelter-koppeling (Epic 11).
 *
 * De credentials blijven uitsluitend server-side: geen `NEXT_PUBLIC_`-prefix,
 * nooit in een cookie, nooit naar de browser (koerswijziging §3.1 laag 5).
 *
 * `ANIMALSHELTER_ENABLED` is de noodrem uit §3.1 laag 4: staat die niet exact
 * op "true", dan verdwijnt het menu, weigeren de acties en gaat er geen enkele
 * oproep de deur uit. Zo kan het bestuur de koppeling laten uitzetten met één
 * instelling in Vercel, zonder ontwikkelaar en zonder release.
 */

export interface AnimalShelterConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

type Env = Record<string, string | undefined>;

export function isAnimalShelterEnabled(env: Env = process.env): boolean {
  return (env.ANIMALSHELTER_ENABLED ?? "").trim().toLowerCase() === "true";
}

export function readAnimalShelterConfig(env: Env = process.env): AnimalShelterConfig | null {
  if (!isAnimalShelterEnabled(env)) return null;

  const clientId = (env.ANIMALSHELTER_CLIENT_ID ?? "").trim();
  const clientSecret = (env.ANIMALSHELTER_CLIENT_SECRET ?? "").trim();
  const username = (env.ANIMALSHELTER_USERNAME ?? "").trim();
  const password = (env.ANIMALSHELTER_PASSWORD ?? "").trim();

  if (!clientId || !clientSecret || !username || !password) return null;

  return { clientId, clientSecret, username, password };
}
