import { assertReadPath } from "./paths";
import { readAnimalShelterConfig } from "./config";
import { logOutboundCall } from "./audit";

/**
 * HET DOORGEEFLUIK — laag 1 van de read-only garantie (Epic 11, koerswijziging
 * 2026-07-26 §3). Dit is het enige bestand in de codebase dat de hostnaam van
 * AnimalShelter mag bevatten en het enige dat er verbinding mee maakt.
 *
 * Waarom dat afdwingbaar is en niet zomaar een afspraak:
 *
 *  1. `readFromAnimalShelter` heeft géén methode-parameter. `method: "GET"` staat
 *     hardcoded. Geen enkele oproeper kan daar iets anders van maken.
 *  2. Er is géén body-argument. Er bestaat geen weg om gegevens mee te sturen.
 *  3. Het pad gaat door de allowlist van `paths.ts` vóór er een socket opengaat.
 *  4. De enige POST staat op `fetchToken`, die niet geëxporteerd wordt en waarvan
 *     de body een vaste grant-payload uit env-vars is. Er loopt geen enkel pad
 *     waarlangs dierdata daarin terecht kan komen.
 *  5. `read-only.test.ts` controleert bovenstaande op de broncode zelf en breekt
 *     de build wanneer iemand er ooit een schrijfactie bij zet.
 *
 * Wie hier iets aan wil veranderen: lees eerst §3 van de koerswijziging. Het
 * bestuur van het asiel staat nog niet volledig achter deze integratie; de
 * garantie dat wij nooit schrijven is een voorwaarde, geen implementatiedetail.
 */

const HOST = "https://api.animalshelter.be";
const TOKEN_PATH = "/oauth/token";

/** Marge zodat we nooit met een net-vervallen token op pad gaan. */
const EXPIRY_MARGIN_MS = 60_000;

export type AnimalShelterErrorCode =
  | "disabled"
  | "forbidden_path"
  | "auth_failed"
  | "http_error"
  | "invalid_response";

export class AnimalShelterError extends Error {
  constructor(
    public readonly code: AnimalShelterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AnimalShelterError";
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Nodig in tests en na een 401; het token leeft normaal een jaar. */
export function resetAnimalShelterTokenCache(): void {
  cachedToken = null;
}

async function fetchToken(): Promise<string> {
  const config = readAnimalShelterConfig();
  if (!config) {
    throw new AnimalShelterError(
      "disabled",
      "De AnimalShelter-koppeling staat uit of is niet volledig ingesteld.",
    );
  }

  const response = await fetch(`${HOST}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
    }),
  });

  await logOutboundCall("POST", TOKEN_PATH, response.status);

  if (!response.ok) {
    throw new AnimalShelterError(
      "auth_failed",
      `Aanmelden bij AnimalShelter mislukt (HTTP ${response.status}).`,
    );
  }

  let payload: { access_token?: unknown; expires_in?: unknown };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new AnimalShelterError("auth_failed", "AnimalShelter gaf een onleesbaar tokenantwoord.");
  }

  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new AnimalShelterError("auth_failed", "AnimalShelter gaf geen bruikbaar token terug.");
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000 - EXPIRY_MARGIN_MS,
  };
  return cachedToken.value;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  return fetchToken();
}

/**
 * De enige manier waarop deze applicatie AnimalShelter bereikt. Leest, en niets anders.
 */
export async function readFromAnimalShelter(path: string): Promise<unknown> {
  // Volgorde is bewust: eerst het pad, dan pas de configuratie. Een verboden pad
  // mag zelfs niet tot het ophalen van een token leiden.
  try {
    assertReadPath(path);
  } catch (error) {
    throw new AnimalShelterError("forbidden_path", (error as Error).message);
  }

  if (!readAnimalShelterConfig()) {
    throw new AnimalShelterError(
      "disabled",
      "De AnimalShelter-koppeling staat uit of is niet volledig ingesteld.",
    );
  }

  let response = await sendRead(path, await getToken());

  if (response.status === 401) {
    // Token afgekeurd: één keer opnieuw aanmelden, daarna opgeven.
    resetAnimalShelterTokenCache();
    response = await sendRead(path, await getToken());
    if (response.status === 401) {
      throw new AnimalShelterError(
        "auth_failed",
        "AnimalShelter wees onze aanmelding af. Controleer de credentials.",
      );
    }
  }

  if (!response.ok) {
    throw new AnimalShelterError(
      "http_error",
      `AnimalShelter antwoordde met HTTP ${response.status} op ${path}.`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new AnimalShelterError(
      "invalid_response",
      `AnimalShelter gaf een onleesbaar antwoord op ${path}.`,
    );
  }
}

async function sendRead(path: string, token: string): Promise<Response> {
  const response = await fetch(`${HOST}${path}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  await logOutboundCall("GET", path, response.status);
  return response;
}
