/**
 * Story 10.81 (Sven: "volledige gegevens van de dierenarts moeten erop komen:
 * adres, nummer, enz.") — pure opmaak van een fiche uit de dierenartsenlijst.
 */

export interface VeterinarianDetails {
  name: string;
  practice: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  orderNumber: string | null;
  notes: string | null;
}

/** Een naam komt maar één keer voor in de lijst — zonder hoofdletters of spaties rond. */
export function vetKey(name: string): string {
  return name.trim().toLowerCase();
}

const tekst = (v: string | null | undefined) => (v ?? "").trim();

/** "Kerkstraat 12, 9400 Ninove" — wat ontbreekt, valt weg. */
export function vetAddress(v: Pick<VeterinarianDetails, "street" | "houseNumber" | "postalCode" | "city">): string {
  const straat = [tekst(v.street), tekst(v.houseNumber)].filter(Boolean).join(" ");
  const gemeente = [tekst(v.postalCode), tekst(v.city)].filter(Boolean).join(" ");
  return [straat, gemeente].filter(Boolean).join(", ");
}

/** De regels onder de naam op het rapport (scherm en PDF); enkel wat ingevuld is. */
export function vetDetailLines(v: VeterinarianDetails): string[] {
  const met = (voor: string, waarde: string | null) => (tekst(waarde) ? `${voor}${tekst(waarde)}` : "");
  return [
    tekst(v.practice),
    vetAddress(v),
    met("Tel. ", v.phone),
    met("Gsm ", v.mobile),
    tekst(v.email),
    met("Ordenummer: ", v.orderNumber),
  ].filter(Boolean);
}

/** De fiche met de naam van wie ingelogd is — zo is die bij een nieuw rapport al gekozen. */
export function defaultVetId(vets: { id: number; name: string }[], name: string): number | null {
  const sleutel = vetKey(name);
  if (!sleutel) return null;
  return vets.find((v) => vetKey(v.name) === sleutel)?.id ?? null;
}
