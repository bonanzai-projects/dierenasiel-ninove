/**
 * Google Maps-kaartje uit een vrij ingetypt adres (Story 10.40).
 *
 * Bewust ZONDER API-sleutel: `maps.google.com/maps?...&output=embed` werkt in een
 * iframe zonder Google Cloud-project of facturatie. Wil je later overstappen op de
 * officiële Maps Embed API, dan hoeft enkel `buildMapEmbedUrl` te wijzigen — de
 * componenten kennen de URL-vorm niet.
 *
 * Er wordt niets gegeocodeerd of opgeslagen: het kaartje volgt puur het adresveld.
 */

/** Alle campagnes liggen in België; meegeven scherpt de zoekopdracht aan. */
const COUNTRY = "België";

/** Herkent België/Belgie/Belgium, zodat we het land niet dubbel toevoegen. */
const COUNTRY_PATTERN = /belgi(ë|e|um)/i;

export interface MapLocation {
  address: string | null | undefined;
  municipality?: string | null;
}

/** Nieuwe regels en opeenvolgende spaties → één spatie; losse komma's weg. */
function normalize(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();
}

/**
 * Bouwt de zoekterm voor de kaart: "<adres>, <gemeente>, <land>".
 * Geeft "" wanneer er geen zinvol adres is — de UI toont dan geen kaart.
 */
export function buildMapQuery({ address, municipality }: MapLocation): string {
  const street = normalize(address);
  if (!street) return "";

  const parts = [street];

  // Gemeente enkel toevoegen als ze niet al in het adres zit (bv. "9400 Ninove").
  const town = normalize(municipality);
  if (town && !new RegExp(`\\b${escapeRegExp(town)}\\b`, "i").test(street)) {
    parts.push(town);
  }

  const combined = parts.join(", ");
  return COUNTRY_PATTERN.test(combined) ? combined : `${combined}, ${COUNTRY}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** URL voor het ingesloten kaartje (iframe). `null` = geen adres → geen kaart tonen. */
export function buildMapEmbedUrl(location: MapLocation): string | null {
  const query = buildMapQuery(location);
  if (!query) return null;
  // hl=nl → Nederlandstalige labels; z=16 → straatniveau.
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=nl&z=16&output=embed`;
}

/** URL om het adres in Google Maps zelf te openen (nieuw tabblad / route). */
export function buildMapLinkUrl(location: MapLocation): string | null {
  const query = buildMapQuery(location);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
