// Backoffice roles with access to /beheerder routes
export const BACKOFFICE_ROLES = [
  "beheerder",
  "medewerker",
  "dierenarts",
  "adoptieconsulent",
  "coördinator",
] as const;

export const TODO_TYPES = [
  "vaccinatie",
  "paspoort",
  "chip",
  "operatie",
  "castratie",
  "sterilisatie",
  "ontworming",
  "vlooienbehandeling",
  "bloedonderzoek",
  "tandencontrole",
  "gewichtscontrole",
  "gedragstest",
  "fotosessie",
  "adoptievoorbereiding",
  "anders",
] as const;

export const TODO_TYPE_LABELS: Record<(typeof TODO_TYPES)[number], string> = {
  vaccinatie: "Vaccinatie",
  paspoort: "Paspoort",
  chip: "Chip",
  operatie: "Operatie",
  castratie: "Castratie",
  sterilisatie: "Sterilisatie",
  ontworming: "Ontworming",
  vlooienbehandeling: "Vlooienbehandeling",
  bloedonderzoek: "Bloedonderzoek",
  tandencontrole: "Tandencontrole",
  gewichtscontrole: "Gewichtscontrole",
  gedragstest: "Gedragstest",
  fotosessie: "Fotosessie",
  adoptievoorbereiding: "Adoptievoorbereiding",
  anders: "Anders",
};

export const TODO_PRIORITIES = [
  "laag",
  "normaal",
  "hoog",
  "dringend",
] as const;

export const TODO_PRIORITY_LABELS: Record<(typeof TODO_PRIORITIES)[number], string> = {
  laag: "Laag",
  normaal: "Normaal",
  hoog: "Hoog",
  dringend: "Dringend",
};

export const SITE_NAME = "Dierenasiel Ninove VZW";
export const SITE_TAGLINE =
  "Het Dierenasiel Ninove (Denderwindeke) geeft nieuwe kansen aan dieren die een nieuwe thuis zoeken.";
export const ENTERPRISE_NUMBER = "BE 0420.668.808";
export const IBAN = "BE98 0680 7888 7093";
export const HK_NUMBER = "HK 30408195";

const WIX = "https://static.wixstatic.com/media";

export const SHELTER_LOCATIONS = {
  dogs: {
    label: "Honden (nieuw gebouw)",
    address: "Minnenhofstraat 24",
    city: "9400 Denderwindeke (Ninove)",
    coords: { lat: 50.79356, lng: 4.02095 },
    email: "honden@dierenasielninove.be",
  },
  cats: {
    label: "Katten & andere dieren",
    address: "Kerkveld 29",
    city: "9400 Denderwindeke (Ninove)",
    coords: { lat: 50.81, lng: 3.96 },
    email: "info@dierenasielninove.be",
  },
} as const;

/**
 * Briefhoofd van elk officieel document (PDF's, contracten, rapporten).
 *
 * Stond in zeventien componenten letterlijk overgetypt. Bij een verhuis of een
 * naamswijziging zou je ze allemaal moeten vinden — en één vergeten rapport
 * draagt dan jarenlang het verkeerde adres.
 *
 * Het adres is dat van de hondenvestiging (`SHELTER_LOCATIONS.dogs`), zonder de
 * toevoeging "(Ninove)" die op de website wél gebruikt wordt: op een brief hoort
 * de postgemeente te staan. Een test bewaakt dat straat en huisnummer met
 * `SHELTER_LOCATIONS` blijven overeenkomen.
 */
export const PDF_LETTERHEAD = {
  name: SITE_NAME,
  address: `${SHELTER_LOCATIONS.dogs.address}, 9400 Denderwindeke`,
} as const;

export const CONTACT = {
  phone: "054/32 16 79",
  phoneHref: "tel:+3254321679",
  emailGeneral: "info@dierenasielninove.be",
  emailDogs: "honden@dierenasielninove.be",
  emailLegacy: "dierenasielninove@hotmail.com",
  website: "www.dierenasielninove.be",
  facebook: "https://www.facebook.com/dierenasielninove",
  trooper:
    "https://www.trooper.be/nl/trooperverenigingen/dierenasielninove",
} as const;

export const VISITING_HOURS = {
  days: "Maandag tot zaterdag",
  hours: "15:00 - 18:00",
  closed: "Zondag gesloten",
  walkingDays: "Maandag, woensdag, vrijdag, zaterdag",
  walkingHours: "10:00 - 12:00",
} as const;

export const NAV_ITEMS = [
  { label: "Over ons", href: "/over-ons" },
  { label: "Honden", href: "/honden-ter-adoptie" },
  { label: "Katten", href: "/katten-ter-adoptie" },
  { label: "Andere dieren", href: "/andere-dieren" },
  { label: "Nieuws", href: "/nieuws" },
  { label: "Steun ons", href: "/steun-ons" },
  { label: "Contact", href: "/contact" },
] as const;

export const FOOTER_LINKS = {
  navigation: [
    { label: "Over ons", href: "/over-ons" },
    { label: "Onze dieren", href: "/honden-ter-adoptie" },
    { label: "Adoptieprocedure", href: "/adoptieprocedure" },
    { label: "Nieuws", href: "/nieuws" },
    { label: "Contact", href: "/contact" },
  ],
  dieren: [
    { label: "Honden", href: "/honden-ter-adoptie" },
    { label: "Katten", href: "/katten-ter-adoptie" },
    { label: "Andere dieren", href: "/andere-dieren" },
  ],
  info: [
    { label: "Wandelreglement", href: "/wandelreglement" },
    { label: "Wandelaar worden", href: "/wandelaar-registratie" },
    { label: "Dier afstaan", href: "/een-dier-afstaan" },
    { label: "Dierenverwaarlozing", href: "/dierenverwaarlozing" },
    { label: "Lid worden", href: "/lid-worden" },
    { label: "Vrijwilligerswerk", href: "/vrijwilligerswerk" },
    { label: "Steun ons", href: "/steun-ons" },
    { label: "Kennelsponsor", href: "/kennelsponsor" },
    { label: "Eetfestijn", href: "/eetfestijn" },
  ],
} as const;

export const TEAM_MEMBERS = [
  {
    name: "Martine Van Den Steen",
    role: "Uitbaatster",
    imageUrl: `${WIX}/0f1711_b56f1deb573e41da890993629e7f246b~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/0f1711_b56f1deb573e41da890993629e7f246b~mv2.jpg`,
  },
  {
    name: "Katrien Reygaerts",
    role: "Bestuurslid",
    imageUrl: `${WIX}/12c6b4_dc0a15e8183149009ad48498ed78e7ca~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_dc0a15e8183149009ad48498ed78e7ca~mv2.jpg`,
  },
  {
    name: "Peter",
    role: "Bestuurslid",
    imageUrl: `${WIX}/12c6b4_343d35f913ea48ec825a8d5720490946~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_343d35f913ea48ec825a8d5720490946~mv2.jpg`,
  },
  {
    name: "Dierenarts Nadia",
    role: "Dierenarts",
    imageUrl: `${WIX}/0f1711_9769fda894074bd9b38872dd84244ede~mv2_d_2048_1418_s_2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/0f1711_9769fda894074bd9b38872dd84244ede~mv2_d_2048_1418_s_2.jpg`,
  },
  {
    name: "Chloe",
    role: "Medewerkster katten",
    imageUrl: `${WIX}/12c6b4_5c81bc249f574c2aa1aa4c22fa0a13a4~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_5c81bc249f574c2aa1aa4c22fa0a13a4~mv2.jpg`,
  },
  {
    name: "Sven",
    role: "Medewerker honden",
    imageUrl: `${WIX}/12c6b4_e633094b8a674fa49956e1a0f2a08349~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_e633094b8a674fa49956e1a0f2a08349~mv2.jpg`,
  },
] as const;

export const VOLUNTEERS = [
  {
    name: "Natasja",
    imageUrl: `${WIX}/12c6b4_443fdf3e6e9d4ad7aad9e002fed1564a~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_443fdf3e6e9d4ad7aad9e002fed1564a~mv2.jpg`,
  },
  {
    name: "Nathalie",
    imageUrl: `${WIX}/12c6b4_89d6488334d5474f9d4417c97894ea32~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_89d6488334d5474f9d4417c97894ea32~mv2.jpg`,
  },
  {
    name: "Ward",
    imageUrl: `${WIX}/12c6b4_cfeea0d9299c4638a848f947b9b95bd9~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_cfeea0d9299c4638a848f947b9b95bd9~mv2.jpg`,
  },
  {
    name: "Lars",
    imageUrl: `${WIX}/12c6b4_b4437b82cf7f4593a207c88da348f5fd~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_b4437b82cf7f4593a207c88da348f5fd~mv2.jpg`,
  },
  {
    name: "Els",
    imageUrl: `${WIX}/12c6b4_d771ab8df3654964a6ef47f2185d42f4~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_d771ab8df3654964a6ef47f2185d42f4~mv2.jpg`,
  },
  {
    name: "Christel",
    imageUrl: `${WIX}/12c6b4_01781dce640e47519ce3dfa608efa2f3~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_01781dce640e47519ce3dfa608efa2f3~mv2.jpg`,
  },
  {
    name: "Joris",
    imageUrl: `${WIX}/12c6b4_0266b52ef24949dfa76262a87465ef3b~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_0266b52ef24949dfa76262a87465ef3b~mv2.jpg`,
  },
  {
    name: "Shirley",
    imageUrl: `${WIX}/12c6b4_44c6e102fe60463190faf89fb6fe3b07~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_44c6e102fe60463190faf89fb6fe3b07~mv2.jpg`,
  },
  {
    name: "David",
    imageUrl: `${WIX}/12c6b4_1cd34dab47d4485caf8bec2e5e362064~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_1cd34dab47d4485caf8bec2e5e362064~mv2.jpg`,
  },
  {
    name: "Marie-Josee",
    imageUrl: `${WIX}/12c6b4_721c049250a641099b2c6592ac0ab381~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_721c049250a641099b2c6592ac0ab381~mv2.jpg`,
  },
  {
    name: "Annemie",
    imageUrl: `${WIX}/12c6b4_bcc691f6a97a476690fc130099235b10~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_bcc691f6a97a476690fc130099235b10~mv2.jpg`,
  },
  {
    name: "Luc",
    imageUrl: `${WIX}/12c6b4_967244ff54ee417da9c7c7a2a0911bc0~mv2.jpg/v1/fill/w_400,h_334,al_c,q_80,enc_auto/12c6b4_967244ff54ee417da9c7c7a2a0911bc0~mv2.jpg`,
  },
] as const;

export const REPORT_DEFINITIONS = [
  // Dierenbeheer
  { id: "R1", label: "Overzicht dieren in asiel", description: "Alle dieren met filters op soort, status, kennel en workflow-fase.", category: "Dierenbeheer", exportFormats: ["PDF", "CSV"] as const, route: "/beheerder/rapporten/dierenoverzicht", story: "7.1" },
  { id: "R4", label: "Gedragsfiches per hond", description: "Gedragsfiches met checklist en opmerkingen per hond.", category: "Dierenbeheer", exportFormats: ["PDF"] as const, route: "/beheerder/rapporten/gedragsfiches", story: "7.1" },
  { id: "R8", label: "Kennel-bezetting", description: "Overzicht van kennelbezetting per zone.", category: "Dierenbeheer", exportFormats: ["PDF"] as const, route: "/beheerder/rapporten/kennels", story: "7.3" },
  { id: "R12", label: "IBN-dossiers", description: "Overzicht van alle IBN-dossiers met deadlines.", category: "Dierenbeheer", exportFormats: ["PDF"] as const, route: "/beheerder/rapporten/ibn-dossiers", story: "7.3" },
  // Medisch
  { id: "R2", label: "Dierenarts-bezoeken", description: "Overzicht van alle dierenarts-bezoeken.", category: "Medisch", exportFormats: ["PDF"] as const, route: "/beheerder/rapporten/dierenbezoeken", story: "7.2" },
  { id: "R5", label: "Medicatie-opvolging", description: "Actieve medicaties en toedieningslogboek.", category: "Medisch", exportFormats: ["PDF", "CSV"] as const, route: "/beheerder/rapporten/medicatie", story: "7.2" },
  { id: "R11", label: "Bezoekrapporten contractdierenarts", description: "Maandelijkse inspectierapporten conform KB 27/04/2007.", category: "Medisch", exportFormats: ["PDF"] as const, route: "/beheerder/rapporten/bezoekrapporten", story: "7.2" },
  // Adoptie
  { id: "R3", label: "Adoptiecontracten", description: "Overzicht van alle adoptiecontracten.", category: "Adoptie", exportFormats: ["PDF", "CSV"] as const, route: "/beheerder/rapporten/adoptiecontracten", story: "7.3" },
  { id: "R6", label: "Te adopteren dieren", description: "Lijst van dieren beschikbaar voor adoptie.", category: "Adoptie", exportFormats: ["PDF"] as const, route: "/beheerder/rapporten/adopteren", story: "7.3" },
  // Publicatie
  { id: "R7", label: "Website-publicatie", description: "Dieren gepubliceerd op de website.", category: "Publicatie", exportFormats: ["CSV"] as const, route: "/beheerder/rapporten/website-publicatie", story: "7.3" },
  // Wandelaars
  { id: "R9", label: "Wandelactiviteit", description: "Wandelstatistieken en activiteitsoverzicht.", category: "Wandelaars", exportFormats: ["PDF", "CSV"] as const, route: "/beheerder/rapporten/wandelactiviteit", story: "7.4" },
  { id: "R10", label: "Wandelaar-hond koppeling", description: "Overzicht van wandelaar-hond combinaties.", category: "Wandelaars", exportFormats: ["CSV"] as const, route: "/beheerder/rapporten/wandelaar-hond-koppeling", story: "7.4" },
  // Workflow
  { id: "R13", label: "Workflow-overzicht", description: "Overzicht van workflow-fases per dier.", category: "Workflow", exportFormats: ["PDF", "CSV"] as const, route: "/beheerder/rapporten/workflow-overzicht", story: "7.4" },
  // Zwerfkattenbeleid
  { id: "R14", label: "Zwerfkattenbeleid", description: "Campagne-statistieken per gemeente en periode met FIV/FeLV en uitkomstverdeling.", category: "Zwerfkattenbeleid", exportFormats: ["PDF", "CSV"] as const, route: "/beheerder/rapporten/zwerfkatten", story: "9.3" },
] as const;

export type ReportDefinition = (typeof REPORT_DEFINITIONS)[number];

export const REPORT_CATEGORIES = ["Dierenbeheer", "Medisch", "Adoptie", "Publicatie", "Wandelaars", "Workflow", "Zwerfkattenbeleid"] as const;

// Shared label maps — single source of truth for Dutch display labels
export const SPECIES_LABELS: Record<string, string> = { hond: "Hond", kat: "Kat", konijn: "Konijn", cavia: "Cavia", ezel: "Ezel", kip: "Kip", hangbuikvarken: "Hangbuikvarken" };
export const GENDER_LABELS: Record<string, string> = { reu: "Reu", teef: "Teef", mannetje: "Mannetje", vrouwtje: "Vrouwtje", kater: "Kater", poes: "Poes" };

/**
 * Geslachtsopties per soort — één bron van waarheid voor zowel het intake- als
 * het bewerkformulier, zodat het geslacht op de fiche exact overeenkomt met wat
 * bij de intake ingegeven werd (Sven-feedback 2026-07-25). De waarden zijn
 * dezelfde die overal gebruikt worden (seed, publieke site, rapporten,
 * `GENDER_LABELS`). "ander" dekt alle overige soorten.
 */
export const GENDER_OPTIONS_BY_SPECIES: Record<string, { value: string; label: string }[]> = {
  hond: [
    { value: "reu", label: GENDER_LABELS.reu },
    { value: "teef", label: GENDER_LABELS.teef },
  ],
  kat: [
    { value: "kater", label: GENDER_LABELS.kater },
    { value: "poes", label: GENDER_LABELS.poes },
  ],
  ander: [
    { value: "mannetje", label: GENDER_LABELS.mannetje },
    { value: "vrouwtje", label: GENDER_LABELS.vrouwtje },
  ],
};

/** Geeft de geslachtsopties voor een soort; valt terug op "ander" voor overige soorten. */
export function genderOptionsForSpecies(species: string | null | undefined) {
  return GENDER_OPTIONS_BY_SPECIES[species ?? ""] ?? GENDER_OPTIONS_BY_SPECIES.ander;
}
export const STATUS_LABELS: Record<string, string> = { beschikbaar: "Beschikbaar", gereserveerd: "Gereserveerd", geadopteerd: "Geadopteerd", in_behandeling: "In behandeling" };
export const BEHAVIOR_VERZORGERS_ITEMS = [
  { key: "verzorgers_algemeenAgressief", label: "Algemeen agressief" },
  { key: "verzorgers_agressiefSpeelgoed", label: "Agressief rond speelgoed" },
  { key: "verzorgers_agressiefVoederkom", label: "Agressief rond voederkom" },
  { key: "verzorgers_agressiefMand", label: "Agressief rond mand" },
  { key: "verzorgers_gemakkelijkWandeling", label: "Gemakkelijk tijdens wandeling" },
  { key: "verzorgers_speeltGraag", label: "Speelt graag" },
] as const;

export const BEHAVIOR_HONDEN_ITEMS = [
  { key: "honden_algemeenAgressief", label: "Algemeen agressief" },
  { key: "honden_agressiefSpeelgoed", label: "Agressief rond speelgoed" },
  { key: "honden_agressiefVoederkom", label: "Agressief rond voederkom" },
  { key: "honden_agressiefMand", label: "Agressief rond mand" },
  { key: "honden_speeltGraag", label: "Speelt graag" },
] as const;

export const ANONYMIZED_VALUE = "[verwijderd]";

/** GDPR retention period in days (5 years = 1825 days, NFR-GDPR-01) */
export const RETENTION_DAYS = 1825;

export const MAILING_TEMPLATES = [
  { id: "follow_up_1_week", label: "Opvolging 1 week na adoptie", description: "Hoe gaat het met uw nieuwe huisdier?" },
  { id: "follow_up_1_month", label: "Opvolging 1 maand na adoptie", description: "Update over uw geadopteerd dier." },
  { id: "general_info", label: "Algemene informatie", description: "Nieuws en updates van het asiel." },
] as const;

export type MailingTemplateId = (typeof MAILING_TEMPLATES)[number]["id"];

// Zwerfkattenbeleid — campaign statuses
export const CAMPAIGN_STATUSES = [
  "open",
  "kooien_geplaatst",
  "in_behandeling",
  "afgerond",
] as const;

export const CAMPAIGN_STATUS_LABELS: Record<(typeof CAMPAIGN_STATUSES)[number], string> = {
  open: "Open",
  kooien_geplaatst: "Kooien geplaatst",
  in_behandeling: "In behandeling",
  afgerond: "Afgerond",
};

// FIV/FeLV test statuses
export const FIV_FELV_STATUSES = [
  "positief",
  "negatief",
  "niet_getest",
] as const;

export const FIV_FELV_STATUS_LABELS: Record<(typeof FIV_FELV_STATUSES)[number], string> = {
  positief: "Positief",
  negatief: "Negatief",
  niet_getest: "Niet getest",
};

// Campaign outcomes
export const CAMPAIGN_OUTCOMES = [
  "gecastreerd_uitgezet",
  "gesteriliseerd_uitgezet",
  "geadopteerd",
] as const;

export const CAMPAIGN_OUTCOME_LABELS: Record<(typeof CAMPAIGN_OUTCOMES)[number], string> = {
  gecastreerd_uitgezet: "Gecastreerd & uitgezet",
  gesteriliseerd_uitgezet: "Gesteriliseerd & uitgezet",
  geadopteerd: "Geadopteerd",
};

// Vaste lijst kooinummers voor zwerfkat-campagnes (Story 10.7 schietversie).
// Na feedback van Sven kan dit uitgebreid worden of beheerbaar gemaakt via UI.
export const CAGE_NUMBERS: readonly string[] = Array.from({ length: 20 }, (_, i) => `K${i + 1}`);

// Intake-redenen — bron van waarheid voor dropdown-opties bij dier-intake en -bewerk,
// plus label-rendering in de dierenlijst-kolom. DB-value "zwerfhond" wordt in de UI als
// "Vondeling" getoond (bewuste mismatch — uniformisering uit Story 10.21).
export const INTAKE_REASONS = [
  { value: "afstand", label: "Afstand door eigenaar" },
  { value: "ibn", label: "Inbeslagname (IBN)" },
  { value: "zwerfhond", label: "Vondeling" },
  // Story 10.30: komt overeen met "tijd opv" in Sven's as-is asielrapport.
  { value: "tijdelijke_opvang", label: "Tijdelijke opvang" },
] as const;

export type IntakeReason = (typeof INTAKE_REASONS)[number]["value"];

export function getIntakeReasonLabel(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const match = INTAKE_REASONS.find((r) => r.value === value);
  return match?.label ?? "—";
}

export const SITE_LOGO_URL = `${WIX}/12c6b4_08c41b8c45754289bb6e258b78f15349~mv2.png/v1/crop/x_31,y_0,w_542,h_542/fill/w_311,h_311,al_c,q_85,enc_auto/logo4.png`;
export const TROOPER_BANNER_URL = `${WIX}/12c6b4_8d3f482b7e164f8f9cd83d69f6813524~mv2.png/v1/fill/w_453,h_172,al_c,q_85,enc_auto/349181460_663508265641046_5119675185064921168_n.png`;
