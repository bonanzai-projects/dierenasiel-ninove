import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import IbnDossierPdf from "@/components/beheerder/dieren/IbnDossierPdf";
import { getAnimalById } from "@/lib/queries/animals";
import { getNeglectReportByAnimalId } from "@/lib/queries/neglect-reports";
import { getWeightsByAnimalId } from "@/lib/queries/animal-weights";
import { fetchPdfPhoto } from "@/lib/reports/pdf-photo";
import { SPECIES_LABELS } from "@/lib/constants";
import { buildIbnDossierPdfData, ibnDossierFilename, ibnDossierPhotoUrls } from "./ibn-dossier";

/**
 * Story 10.72 — het IBN-dossier van één dier als PDF: gedeeld door de
 * bekijk-route en de mail naar politie of Dierenwelzijn, zodat beide exact
 * hetzelfde document tonen.
 */

export interface IbnDossierDocument {
  filename: string;
  content: Buffer;
  animalName: string;
  speciesLabel: string;
  dossierNr: string | null;
  pvNr: string | null;
}

type LaadFoto = (url: string) => Promise<string | undefined>;

const standaardLaadFoto: LaadFoto = (url) => fetchPdfPhoto(url, { label: "ibn-dossier foto" });

/**
 * `null` = geen IBN-dossier: het dier bestaat niet of is niet in beslag genomen.
 * `laadFoto` is injecteerbaar voor tests (zie react-pdf-gotchas: geen globale fetch vervangen).
 */
export async function buildIbnDossierDocument(
  animalId: number,
  laadFoto: LaadFoto = standaardLaadFoto,
): Promise<IbnDossierDocument | null> {
  const animal = await getAnimalById(animalId);
  if (!animal || animal.intakeReason !== "ibn") return null;

  // Story 10.79: ook de wegingen, voor het gewichtsverloop.
  const [rapport, wegingen] = await Promise.all([
    getNeglectReportByAnimalId(animalId),
    getWeightsByAnimalId(animalId),
  ]);
  const urls = ibnDossierPhotoUrls(animal, rapport);

  const [mainPhoto, ...bewijs] = await Promise.all([
    urls.main ? laadFoto(urls.main) : Promise.resolve(undefined),
    ...urls.evidence.map((u) => laadFoto(u)),
  ]);

  const element = createElement(IbnDossierPdf, {
    data: buildIbnDossierPdfData(animal, rapport, new Date(), wegingen),
    mainPhoto,
    evidencePhotos: bewijs.filter((src): src is string => !!src),
    omittedPhotos: urls.omitted,
  });
  // Zelfde cast als de andere PDF-routes: @react-pdf typeert renderToBuffer op <Document>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = await renderToBuffer(element as any);

  return {
    filename: ibnDossierFilename(animal),
    content,
    animalName: animal.name,
    speciesLabel: SPECIES_LABELS[animal.species] ?? animal.species,
    dossierNr: animal.dossierNr?.trim() || null,
    pvNr: animal.pvNr?.trim() || null,
  };
}
