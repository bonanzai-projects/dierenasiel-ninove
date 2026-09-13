/**
 * Story 13.16 — de leverancierslijst van de evenementen.
 *
 * Een kosten- of materiaalregel houdt de naam van zijn leverancier als tekst. De lijst
 * voegt er de contactgegevens aan toe; regel en leverancier vinden elkaar op naam,
 * zonder onderscheid tussen hoofd- en kleine letters. Pure functies, zodat het scherm,
 * de acties en het opvulscript dezelfde regel volgen.
 */

/** De sleutel waarop een regel en een leverancier elkaar vinden. In SQL: `lower(trim(naam))`. */
export function supplierKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

/** "deryck.be" → "https://deryck.be". Een adres met protocol blijft zoals het is; leeg wordt null. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  const schoon = (raw ?? "").trim();
  if (!schoon) return null;
  return /^https?:\/\//i.test(schoon) ? schoon : `https://${schoon}`;
}

/** Story 13.18 — het adres, in vier aparte velden (Sven: "aparte velden aub"). */
export interface SupplierAddress {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

export interface SupplierContactInfo extends SupplierAddress {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export interface ContactLink {
  kind: "gsm" | "mail" | "website" | "adres";
  label: string;
  href: string;
}

/** "Kerkstraat 12, 9400 Ninove". Ontbrekende delen vallen weg; zonder adres null. */
export function formatAddress(a: SupplierAddress): string | null {
  const samen = (...delen: (string | null | undefined)[]) =>
    delen.map((d) => d?.trim()).filter(Boolean).join(" ");
  const regel = [samen(a.street, a.houseNumber), samen(a.postalCode, a.city)].filter(Boolean).join(", ");
  return regel || null;
}

/** De klikbare gegevens van een leverancier, altijd in de volgorde gsm · mail · website · adres. */
export function contactLinks(
  s: Pick<SupplierContactInfo, "phone" | "email" | "website"> & SupplierAddress,
): ContactLink[] {
  const links: ContactLink[] = [];

  const gsm = s.phone?.trim();
  // Een telefoon wil enkel cijfers (en een + vooraan): "0470 12 34 56" → tel:0470123456.
  if (gsm) links.push({ kind: "gsm", label: gsm, href: `tel:${gsm.replace(/[^\d+]/g, "")}` });

  const mail = s.email?.trim();
  if (mail) links.push({ kind: "mail", label: mail, href: `mailto:${mail}` });

  const site = normalizeWebsite(s.website);
  if (site) {
    const label = site.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    links.push({ kind: "website", label, href: site });
  }

  // Wie materiaal gaat ophalen of terugbrengt, heeft met één klik de route.
  const adres = formatAddress(s);
  if (adres) {
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}`;
    links.push({ kind: "adres", label: adres, href });
  }

  return links;
}

export function findSupplier<T extends { name: string }>(
  list: readonly T[],
  name: string | null | undefined,
): T | null {
  const key = supplierKey(name);
  if (!key) return null;
  return list.find((s) => supplierKey(s.name) === key) ?? null;
}

/** Per leverancier: in hoeveel verschillende evenementen hij voorkomt (kosten én materiaal). */
export function eventCountBySupplier(
  rows: readonly { supplier: string | null; eventId: number }[],
): Map<string, number> {
  const perSleutel = new Map<string, Set<number>>();
  for (const r of rows) {
    const key = supplierKey(r.supplier);
    if (!key) continue;
    const ids = perSleutel.get(key) ?? new Set<number>();
    ids.add(r.eventId);
    perSleutel.set(key, ids);
  }
  return new Map([...perSleutel].map(([key, ids]) => [key, ids.size]));
}

/**
 * De namen die al op regels staan maar nog niet in de lijst, elk één keer, in de
 * schrijfwijze waarin ze het eerst voorkomen.
 */
export function missingSupplierNames(
  existing: readonly string[],
  used: readonly (string | null)[],
): string[] {
  const gekend = new Set(existing.map(supplierKey));
  const nieuw: string[] = [];
  for (const naam of used) {
    const key = supplierKey(naam);
    if (!key || gekend.has(key)) continue;
    gekend.add(key);
    nieuw.push((naam as string).trim());
  }
  return nieuw;
}
