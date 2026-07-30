/**
 * Adres → coördinaten via het Vlaamse adressenregister (Story 10.56).
 *
 * Waarom: het kaartje liet Google zelf het adres opzoeken bij élk paginabezoek.
 * Voor een adres in een fusiegemeente ("Bosstraat 32A Leerbeek", Pajottegem)
 * viel dat geregeld terug op een leeg gebied zonder speld — gemeten: 6 op 6 mis
 * op de campagnepagina, terwijl een kaart op coördinaten 3 op 3 juist was.
 *
 * Geopunt is gratis, vraagt geen sleutel en dekt Vlaanderen. Buiten Vlaanderen
 * vindt het niets; de kaart valt dan terug op de oude zoekterm.
 */

const GEOPUNT_URL = "https://geo.api.vlaanderen.be/geolocation/v4/Location";
const TIMEOUT_MS = 5000;

export type GeocodeMatchType = "huisnummer" | "straat" | "gemeente" | "onbekend";

export interface GeopuntLocation {
  FormattedAddress?: string;
  LocationType?: string;
  Location?: { Lat_WGS84?: number; Lon_WGS84?: number };
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  matchType: GeocodeMatchType;
}

/** Hoe scherp de treffer is. Alleen "huisnummer" is een bevestigd adres. */
export function classifyLocationType(locationType: string | undefined): GeocodeMatchType {
  if (!locationType) return "onbekend";
  if (locationType.startsWith("basisregisters_huisnummer")) return "huisnummer";
  if (locationType === "basisregisters_straat") return "straat";
  if (locationType === "basisregisters_gemeente") return "gemeente";
  return "onbekend";
}

const RANG: Record<GeocodeMatchType, number> = {
  huisnummer: 3,
  straat: 2,
  gemeente: 1,
  onbekend: 0,
};

/**
 * Is dit een gemeentenaam die we mogen meesturen? Het veld heet
 * "Gemeente / Opdrachtgever" en bevat vaak een opdrachtgever met meerdere
 * gemeenten ("Pajottegem Gooik/ Herne / Galmaarden"). Gemeten: zo'n waarde
 * meesturen levert nul treffers op, ook voor een adres dat op zich wél bestaat.
 */
export function isUsableMunicipality(municipality: string | null | undefined): boolean {
  const naam = (municipality ?? "").trim();
  if (!naam || naam.length > 60) return false;
  if (/[/,;]/.test(naam)) return false;
  return naam.split(/\s+/).length <= 3;
}

/** De zoekopdrachten, in volgorde van proberen. */
export function buildGeocodeAttempts(
  address: string | null | undefined,
  municipality: string | null | undefined,
): string[] {
  const adres = (address ?? "").replace(/\s+/g, " ").trim();
  if (!adres) return [];

  const pogingen = [adres];

  const gemeente = (municipality ?? "").trim();
  if (
    isUsableMunicipality(gemeente) &&
    !new RegExp(`\\b${gemeente.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(adres)
  ) {
    pogingen.push(`${adres}, ${gemeente}`);
  }

  return pogingen;
}

/** De scherpste treffer met bruikbare coördinaten. */
export function pickBestMatch(results: GeopuntLocation[]): GeocodeResult | null {
  let beste: GeocodeResult | null = null;

  for (const r of results) {
    const lat = r.Location?.Lat_WGS84;
    const lng = r.Location?.Lon_WGS84;
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const matchType = classifyLocationType(r.LocationType);
    if (matchType === "onbekend") continue;

    if (!beste || RANG[matchType] > RANG[beste.matchType]) {
      beste = { lat, lng, formattedAddress: r.FormattedAddress ?? "", matchType };
    }
  }

  return beste;
}

/** Woorden van 4 letters of meer, zonder leestekens en hoofdletters. */
function woorden(tekst: string): Set<string> {
  return new Set(
    tekst
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter((w) => w.length >= 4),
  );
}

/**
 * Slaat een treffer ergens op de invoer? Het register zoekt fuzzy: "gd" gaf
 * "Abingdonstraat, Sint-Niklaas" en "test" gaf "Testeltsebaan, Herselt".
 * Zo'n gok bewaren is erger dan niets, want ze ziet er op de kaart echt uit.
 * Er moet dus minstens één woord van de invoer letterlijk terugkomen.
 */
export function isPlausibleMatch(query: string, formattedAddress: string): boolean {
  const invoer = woorden(query);
  if (invoer.size === 0) return false;

  const resultaat = woorden(formattedAddress);
  for (const woord of invoer) {
    if (resultaat.has(woord)) return true;
  }
  return false;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * @param query   wat we naar het register sturen (mogelijk mét gemeente)
 * @param basis   waarop we de treffer toetsen: het adres alleen. Een gemeente
 *                die toevallig klopt is geen bewijs dat de straat gevonden is —
 *                "test, Halle" leverde zo "Kortestraat, Halle" op.
 */
async function bevraag(query: string, basis: string, fetchImpl: FetchLike): Promise<GeocodeResult | null> {
  const url = `${GEOPUNT_URL}?q=${encodeURIComponent(query)}&c=5`;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": "dierenasiel-ninove-backoffice" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { LocationResult?: GeopuntLocation[] };

  // Een huisnummertreffer is het adres zelf; al de rest moet aantoonbaar bij de
  // invoer horen, anders is het een gok van de fuzzy zoekfunctie.
  const bruikbaar = (data.LocationResult ?? []).filter(
    (r) =>
      classifyLocationType(r.LocationType) === "huisnummer" ||
      isPlausibleMatch(basis, r.FormattedAddress ?? ""),
  );

  return pickBestMatch(bruikbaar);
}

/**
 * Zoekt het adres op. Geeft `null` wanneer er niets gevonden is of wanneer het
 * register onbereikbaar is — het opslaan van een campagne mag hier nooit op
 * stuklopen.
 */
export async function geocodeAddress(
  address: string | null | undefined,
  municipality: string | null | undefined,
  fetchImpl: FetchLike = fetch,
): Promise<GeocodeResult | null> {
  let beste: GeocodeResult | null = null;

  const adres = (address ?? "").trim();

  for (const poging of buildGeocodeAttempts(address, municipality)) {
    try {
      const resultaat = await bevraag(poging, adres, fetchImpl);
      if (resultaat && (!beste || RANG[resultaat.matchType] > RANG[beste.matchType])) {
        beste = resultaat;
      }
      // Een huisnummer is het scherpste wat er is; verder zoeken heeft geen zin.
      if (beste?.matchType === "huisnummer") return beste;
    } catch (err) {
      console.error("geocodeAddress: adressenregister onbereikbaar:", err);
      return beste;
    }
  }

  return beste;
}
