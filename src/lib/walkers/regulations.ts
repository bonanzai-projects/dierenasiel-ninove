/**
 * Story 10.77 — het wandelreglement, één bron voor het inschrijfformulier, de
 * publieke pagina /wandelreglement en het aanvaardscherm in de wandelaar-app.
 *
 * Tekst = Sven's document "Wandelen: reglement en uren van het asiel" (Trello,
 * 5 mei 2026), met enkel tik- en spatiefouten verbeterd.
 *
 * Een nieuwe versie = de tekst aanpassen ÉN `WALK_REGULATIONS_VERSION` ophogen.
 * Iedere wandelaar moet die versie dan opnieuw aanvaarden vóór hij kan boeken
 * (keuze Johan): enkel zo bewijst de aanvaarding welke tekst gold.
 */

export const WALK_REGULATIONS_VERSION = "2026-05-05";

export const WALK_REGULATIONS_TITLE = "Wandelen: reglement en uren van het asiel";

export const WALK_REGULATIONS: readonly string[] = [
  "Er kan gewandeld worden met de honden op maandag, woensdag, vrijdag en zaterdag, tussen 10 en 12 uur. M.a.w. starten tussen 10 en 10u45, tenzij anders afgesproken.",
  "De wandelaar dient zich in te schrijven en zijn gegevens achter te laten zoals aangegeven op onze website www.dierenasielninove.be.",
  "De wandelaar dient ten minste 18 jaar oud te zijn of onder begeleiding van een volwassen persoon. De volwassen persoon is verantwoordelijk tijdens de wandeling.",
  "De wandelaar dient tijdens de wandeling telefonisch bereikbaar te zijn via het nummer doorgegeven op de wandelfiche.",
  "Bij vriestemperaturen of temperaturen boven de 24 graden gaan de wandelingen enkel door indien aangegeven op de pagina. Wij dragen zorg voor onze dieren en willen niet dat hun kussentjes bevroren of verbrand raken.",
  "De keuze van de hond gebeurt in samenspraak met de wandelaar en de medewerker van het asiel. De toestemming tot wandelen kan men enkel verkrijgen van de verantwoordelijke van het asiel.",
  "Keuze uit bepaalde favoriete honden wordt bepaald door de medewerker van het dierenasiel. Indien deze hond reeds gewandeld heeft of niet meer beschikbaar is, zal er een andere hond aangeboden worden.",
  "De kans bestaat, naarmate wandelaars zich aanbieden, dat er op het moment van aanbieden geen hond meer beschikbaar is. Gelieve hier rekening mee te houden.",
  "De honden worden altijd aan de leiband gehouden en mogen in geen enkel geval los lopen! Er wordt afstand gehouden tussen de dieren. De honden worden niet doorgegeven aan andere wandelaars of aan onbekenden.",
  "Het is NIET mogelijk om met verschillende honden samen te wandelen, tenzij afgesproken of toegelaten door de medewerker van het dierenasiel.",
  "Tijdens de wandelingen dient minstens 1 wandelaar ons hesje te dragen dat aangeeft dat u een wandelaar bent van het dierenasiel. Dank voor het begrip!",
  "Tijdens de wandeling mogen de asielhonden niet vergezeld worden door eigen honden. Hier wordt soms een uitzondering gemaakt als het gaat om een effectieve adoptiekeuze, om af te toetsen of er een match is tussen beide honden. Dit gebeurt telkens samen met een medewerker. Hiervoor dient men een effectieve afspraak te maken via mail (dierenasielninove@hotmail.com).",
  "De private eigendommen dienen gerespecteerd te worden.",
  "Het algemeen verkeersreglement is van toepassing op de openbare weg!",
  "Iedere wandelaar is verplicht om poepzakjes bij te hebben. Deze kan je verkrijgen in het asiel. De uitwerpselen dienen onmiddellijk opgeruimd te worden in de mate van het mogelijke. Aan het asiel is een container voorzien waarin de zakjes gedeponeerd kunnen worden.",
  "Het wandelen met onze dieren is op eigen verantwoordelijkheid/risico. Neem geen onbezonnen risico's en vermijd confrontatie met andere dieren op het wandeltraject.",
  "Dierenasiel Ninove vzw staat vrij om wandelaars te weigeren.",
  "Bij het niet naleven van voorgenoemde voorwaarden kan de wandelkaart onmiddellijk worden ingetrokken of kunnen wandelingen geweigerd worden.",
];

/** "5 mei 2026" — zoals de wandelaar de versie te zien krijgt. */
export function walkRegulationsVersionLabel(version: string = WALK_REGULATIONS_VERSION): string {
  const d = new Date(`${version}T12:00:00Z`);
  if (isNaN(d.getTime())) return version;
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels" });
}

export function hasAcceptedCurrentRegulations(walker: { regulationsVersion: string | null }): boolean {
  return walker.regulationsVersion === WALK_REGULATIONS_VERSION;
}

/** DD/MM/JJJJ UU:MM in Belgische tijd. */
function tijdstip(d: Date): string {
  const delen = new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const deel = (type: string) => delen.find((p) => p.type === type)?.value ?? "";
  return `${deel("day")}/${deel("month")}/${deel("year")} ${deel("hour")}:${deel("minute")}`;
}

/** Wat de backoffice op de wandelaarsfiche toont. */
export function regulationsStatusLabel(walker: {
  regulationsRead: boolean;
  regulationsVersion: string | null;
  regulationsAcceptedAt: Date | string | null;
}): string {
  if (hasAcceptedCurrentRegulations(walker) && walker.regulationsAcceptedAt) {
    return `Aanvaard op ${tijdstip(new Date(walker.regulationsAcceptedAt))} (versie van ${walkRegulationsVersionLabel()})`;
  }
  if (walker.regulationsRead) return "Oudere versie aanvaard — wordt gevraagd bij de volgende aanmelding";
  return "Nog niet aanvaard — wordt gevraagd bij de eerste aanmelding";
}
