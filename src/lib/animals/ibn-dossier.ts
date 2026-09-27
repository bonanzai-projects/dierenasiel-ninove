import { GENDER_LABELS, SPECIES_LABELS } from "@/lib/constants";
import { formatBelgianDate } from "./owner-return";

/**
 * Story 10.72 — het volledige IBN-dossier van één dier, om te bekijken of te
 * mailen naar politie of Dierenwelzijn (Sven). Keuze Johan: identiteit, foto,
 * de inbeslagname en het verwaarlozingsrapport — medisch, gewicht en gedrag
 * bewust niet.
 *
 * Pure logica zonder databank: wat de PDF toont, als rijen label/waarde.
 */

/** Wat niet ingevuld is. Een streepje i.p.v. een leeg vak: de lezer ziet dat het ontbreekt. */
export const LEEG = "—";

/** Meer foto's maken de PDF te zwaar om te bekijken (Vercel: max. 4,5 MB per antwoord). */
export const IBN_DOSSIER_MAX_PHOTOS = 24;

/** Logboek-actie per verzending; "Eerder verstuurd" op de fiche leest ze terug. */
export const IBN_DOSSIER_MAILED_ACTION = "animal.ibn_dossier_emailed";

const OUTTAKE_LABELS: Record<string, string> = {
  adoptie: "Adoptie",
  terug_eigenaar: "Terug naar eigenaar",
  euthanasie: "Euthanasie",
};

export interface IbnDossierAnimal {
  name: string;
  aliasName: string | null;
  species: string;
  breed: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  color: string | null;
  identificationNr: string | null;
  passportNr: string | null;
  dossierNr: string | null;
  pvNr: string | null;
  ibnReason: string | null;
  ibnDecisionDeadline: string | null;
  intakeDate: string | null;
  intakeMetadata: unknown;
  isInShelter: boolean | null;
  outtakeDate: string | null;
  outtakeReason: string | null;
  imageUrl: string | null;
  images: string[] | null;
}

export interface IbnDossierNeglect {
  date: string | null;
  vetName: string | null;
  weightOnArrival: string | null;
  healthStatusOnArrival: string;
  neglectFindings: string;
  treatmentsGiven: string | null;
  notes: string | null;
  photos: string[] | null;
}

export interface DossierRij {
  label: string;
  value: string;
}

export interface IbnDossierPdfData {
  animalName: string;
  dossierNr: string | null;
  drawnUpOn: string;
  animal: DossierRij[];
  seizure: DossierRij[];
  /** null = er is (nog) geen verwaarlozingsrapport. */
  neglect: { facts: DossierRij[]; texts: DossierRij[] } | null;
}

const tekst = (v: string | null | undefined): string => {
  const t = (v ?? "").trim();
  return t === "" ? LEEG : t;
};

const datum = (iso: string | null | undefined): string => tekst(formatBelgianDate(iso));

/** De melder-velden uit `intakeMetadata` (jsonb) — alles wat geen tekst is, telt als leeg. */
function melder(meta: unknown) {
  const m = (meta && typeof meta === "object" ? meta : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null);
  return {
    naam: s("melderNaam"),
    locatie: s("melderLocatie"),
    datum: s("melderDatum"),
    instanties: s("betrokkenInstanties"),
  };
}

/** DD/MM/JJJJ zoals de kalender in België het aangeeft — niet de UTC-dag van de server. */
function belgischeDag(nu: Date): string {
  const delen = new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(nu);
  const deel = (type: string) => delen.find((p) => p.type === type)?.value ?? "";
  return `${deel("day")}/${deel("month")}/${deel("year")}`;
}

function verblijf(a: IbnDossierAnimal): string {
  if (a.outtakeDate || a.isInShelter === false) {
    const reden = a.outtakeReason ? OUTTAKE_LABELS[a.outtakeReason] ?? a.outtakeReason : null;
    const wanneer = a.outtakeDate ? ` op ${formatBelgianDate(a.outtakeDate)}` : "";
    return `Uitstroom${wanneer}${reden ? ` (${reden})` : ""}`;
  }
  return "In het asiel";
}

export function buildIbnDossierPdfData(
  a: IbnDossierAnimal,
  n: IbnDossierNeglect | null,
  nu: Date = new Date(),
): IbnDossierPdfData {
  const m = melder(a.intakeMetadata);
  const geslacht = a.gender ? GENDER_LABELS[a.gender] ?? a.gender : null;

  return {
    animalName: a.name,
    dossierNr: a.dossierNr?.trim() || null,
    drawnUpOn: belgischeDag(nu),
    animal: [
      { label: "Naam", value: tekst(a.name) },
      { label: "Echte naam", value: tekst(a.aliasName) },
      { label: "Soort", value: tekst(SPECIES_LABELS[a.species] ?? a.species) },
      { label: "Ras", value: tekst(a.breed) },
      { label: "Geslacht", value: tekst(geslacht) },
      { label: "Geboortedatum", value: datum(a.dateOfBirth) },
      { label: "Kleur", value: tekst(a.color) },
      { label: "Chipnummer", value: tekst(a.identificationNr) },
      { label: "Paspoortnummer", value: tekst(a.passportNr) },
      { label: "Dossiernummer AnimalShelter", value: tekst(a.dossierNr) },
    ],
    seizure: [
      { label: "Datum intake", value: datum(a.intakeDate) },
      { label: "PV-nummer politie", value: tekst(a.pvNr) },
      { label: "Reden van inbeslagname", value: tekst(a.ibnReason) },
      { label: "Betrokken instanties", value: tekst(m.instanties) },
      { label: "Beslissingsdeadline", value: datum(a.ibnDecisionDeadline) },
      { label: "Melder", value: tekst(m.naam) },
      { label: "Plaats melding", value: tekst(m.locatie) },
      { label: "Datum melding", value: datum(m.datum) },
      { label: "Verblijf", value: verblijf(a) },
    ],
    neglect: n
      ? {
          facts: [
            { label: "Datum onderzoek", value: datum(n.date) },
            { label: "Dierenarts", value: tekst(n.vetName) },
            { label: "Gewicht bij aankomst", value: tekst(n.weightOnArrival) },
          ],
          texts: [
            { label: "Gezondheidstoestand bij aankomst", value: tekst(n.healthStatusOnArrival) },
            { label: "Vaststellingen verwaarlozing", value: tekst(n.neglectFindings) },
            { label: "Uitgevoerde behandelingen", value: tekst(n.treatmentsGiven) },
            { label: "Opmerkingen", value: tekst(n.notes) },
          ],
        }
      : null,
  };
}

/** Welke foto's in het dossier komen: de hoofdfoto en de bewijsfoto's van het rapport. */
export function ibnDossierPhotoUrls(
  a: Pick<IbnDossierAnimal, "imageUrl" | "images">,
  n: Pick<IbnDossierNeglect, "photos"> | null,
): { main: string | null; evidence: string[]; omitted: number } {
  const bewijs = (n?.photos ?? []).filter((u) => !!u);
  return {
    main: a.imageUrl || a.images?.find((u) => !!u) || null,
    evidence: bewijs.slice(0, IBN_DOSSIER_MAX_PHOTOS),
    omitted: Math.max(0, bewijs.length - IBN_DOSSIER_MAX_PHOTOS),
  };
}

/** `ibn-dossier-<dossiernr>-<naam>.pdf` — accenten weg, enkel veilige tekens. */
export function ibnDossierFilename(a: { name: string; dossierNr: string | null }): string {
  const veilig = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9\-_\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  const delen = [a.dossierNr ? veilig(a.dossierNr) : "", veilig(a.name)].filter(Boolean);
  return `ibn-dossier-${delen.join("-")}.pdf`;
}
