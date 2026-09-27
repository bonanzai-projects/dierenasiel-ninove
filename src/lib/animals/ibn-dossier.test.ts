import { describe, it, expect } from "vitest";
import {
  buildIbnDossierPdfData,
  ibnDossierFilename,
  ibnDossierPhotoUrls,
  IBN_DOSSIER_MAX_PHOTOS,
  LEEG,
  type IbnDossierAnimal,
  type IbnDossierNeglect,
} from "./ibn-dossier";

// Story 10.72 — het volledige IBN-dossier van één dier (Sven: "doormailen naar dierenwelzijn of politie").

const dier: IbnDossierAnimal = {
  name: "Bo",
  aliasName: "Shana",
  species: "hond",
  breed: "Chow Chow",
  gender: "teef",
  dateOfBirth: "2024-10-27",
  color: "Ros",
  identificationNr: "981000012345678",
  passportNr: "BE-123",
  dossierNr: "2602093",
  pvNr: "PV-2026-001",
  ibnReason: "Verwaarlozing, geen water",
  ibnDecisionDeadline: "2026-07-25",
  intakeDate: "2026-05-26",
  intakeMetadata: {
    melderNaam: "Politiezone Ninove",
    melderLocatie: "Kerkstraat 1, Ninove",
    melderDatum: "2026-05-25",
    betrokkenInstanties: "Politiezone Ninove, Dierenwelzijn Vlaanderen",
  },
  isInShelter: true,
  outtakeDate: null,
  outtakeReason: null,
  imageUrl: "https://blob.example/bo.jpg",
  images: ["https://blob.example/bo-2.jpg"],
};

const rapport: IbnDossierNeglect = {
  date: "2026-05-27",
  vetName: "Dr. Peeters",
  weightOnArrival: "12 kg",
  healthStatusOnArrival: "Mager, vacht vervilt",
  neglectFindings: "Geen water, geen beschutting",
  treatmentsGiven: null,
  notes: "",
  photos: ["https://blob.example/n1.jpg", "https://blob.example/n2.jpg"],
};

const waarde = (rijen: { label: string; value: string }[], label: string) =>
  rijen.find((r) => r.label === label)?.value;

describe("buildIbnDossierPdfData", () => {
  it("zet de gegevens van het dier in Belgische notatie", () => {
    const d = buildIbnDossierPdfData(dier, rapport, new Date("2026-09-25T10:00:00Z"));
    expect(d.animalName).toBe("Bo");
    expect(d.drawnUpOn).toBe("25/09/2026");
    expect(waarde(d.animal, "Naam")).toBe("Bo");
    expect(waarde(d.animal, "Echte naam")).toBe("Shana");
    expect(waarde(d.animal, "Soort")).toBe("Hond");
    expect(waarde(d.animal, "Geslacht")).toBe("Teef");
    expect(waarde(d.animal, "Geboortedatum")).toBe("27/10/2024");
    expect(waarde(d.animal, "Chipnummer")).toBe("981000012345678");
    expect(waarde(d.animal, "Dossiernummer AnimalShelter")).toBe("2602093");
  });

  it("vat de inbeslagname samen: PV, reden, instanties, deadline en melder", () => {
    const d = buildIbnDossierPdfData(dier, rapport, new Date("2026-09-25T10:00:00Z"));
    expect(waarde(d.seizure, "Datum intake")).toBe("26/05/2026");
    expect(waarde(d.seizure, "PV-nummer politie")).toBe("PV-2026-001");
    expect(waarde(d.seizure, "Reden van inbeslagname")).toBe("Verwaarlozing, geen water");
    expect(waarde(d.seizure, "Betrokken instanties")).toBe("Politiezone Ninove, Dierenwelzijn Vlaanderen");
    expect(waarde(d.seizure, "Beslissingsdeadline")).toBe("25/07/2026");
    expect(waarde(d.seizure, "Melder")).toBe("Politiezone Ninove");
    expect(waarde(d.seizure, "Plaats melding")).toBe("Kerkstraat 1, Ninove");
    expect(waarde(d.seizure, "Datum melding")).toBe("25/05/2026");
    expect(waarde(d.seizure, "Verblijf")).toBe("In het asiel");
  });

  it("toont de uitstroom met datum en reden als het dier het asiel verlaten heeft", () => {
    const d = buildIbnDossierPdfData(
      { ...dier, isInShelter: false, outtakeDate: "2026-08-01", outtakeReason: "terug_eigenaar" },
      rapport,
      new Date("2026-09-25T10:00:00Z"),
    );
    expect(waarde(d.seizure, "Verblijf")).toBe("Uitstroom op 01/08/2026 (Terug naar eigenaar)");
  });

  it("neemt het verwaarlozingsrapport op, lege velden als streepje", () => {
    const d = buildIbnDossierPdfData(dier, rapport, new Date("2026-09-25T10:00:00Z"));
    expect(d.neglect).not.toBeNull();
    expect(waarde(d.neglect!.facts, "Datum onderzoek")).toBe("27/05/2026");
    expect(waarde(d.neglect!.facts, "Dierenarts")).toBe("Dr. Peeters");
    expect(waarde(d.neglect!.facts, "Gewicht bij aankomst")).toBe("12 kg");
    expect(waarde(d.neglect!.texts, "Gezondheidstoestand bij aankomst")).toBe("Mager, vacht vervilt");
    expect(waarde(d.neglect!.texts, "Vaststellingen verwaarlozing")).toBe("Geen water, geen beschutting");
    expect(waarde(d.neglect!.texts, "Uitgevoerde behandelingen")).toBe(LEEG);
    expect(waarde(d.neglect!.texts, "Opmerkingen")).toBe(LEEG);
  });

  it("geeft geen rapport als er geen verwaarlozingsrapport is", () => {
    const d = buildIbnDossierPdfData(dier, null, new Date("2026-09-25T10:00:00Z"));
    expect(d.neglect).toBeNull();
  });

  it("laat nergens null of een leeg vak staan — enkel een streepje", () => {
    const leeg: IbnDossierAnimal = {
      ...dier,
      aliasName: null, breed: null, dateOfBirth: null, color: null, identificationNr: null,
      passportNr: null, dossierNr: null, pvNr: null, ibnReason: "  ", ibnDecisionDeadline: null,
      intakeDate: null, intakeMetadata: null, imageUrl: null, images: null,
    };
    const d = buildIbnDossierPdfData(leeg, null, new Date("2026-09-25T10:00:00Z"));
    for (const rij of [...d.animal, ...d.seizure]) {
      expect(rij.value, rij.label).not.toBe("");
      expect(rij.value, rij.label).not.toContain("null");
    }
    expect(waarde(d.seizure, "PV-nummer politie")).toBe(LEEG);
    expect(waarde(d.seizure, "Reden van inbeslagname")).toBe(LEEG);
    expect(waarde(d.seizure, "Melder")).toBe(LEEG);
  });

  it("gebruikt de Belgische kalenderdag voor 'opgemaakt op', ook vlak na middernacht", () => {
    // 22:30 UTC op 24/09 = 00:30 in Brussel op 25/09 (zomertijd).
    const d = buildIbnDossierPdfData(dier, null, new Date("2026-09-24T22:30:00Z"));
    expect(d.drawnUpOn).toBe("25/09/2026");
  });
});

describe("ibnDossierPhotoUrls", () => {
  it("neemt de hoofdfoto en alle bewijsfoto's van het rapport", () => {
    expect(ibnDossierPhotoUrls(dier, rapport)).toEqual({
      main: "https://blob.example/bo.jpg",
      evidence: ["https://blob.example/n1.jpg", "https://blob.example/n2.jpg"],
      omitted: 0,
    });
  });

  it("valt terug op de eerste foto als er geen hoofdfoto is", () => {
    expect(ibnDossierPhotoUrls({ ...dier, imageUrl: null }, null).main).toBe("https://blob.example/bo-2.jpg");
    expect(ibnDossierPhotoUrls({ ...dier, imageUrl: null, images: [] }, null).main).toBeNull();
  });

  it(`houdt hooguit ${IBN_DOSSIER_MAX_PHOTOS} bewijsfoto's en telt de rest`, () => {
    const veel = Array.from({ length: IBN_DOSSIER_MAX_PHOTOS + 3 }, (_, i) => `https://blob.example/f${i}.jpg`);
    const r = ibnDossierPhotoUrls(dier, { ...rapport, photos: veel });
    expect(r.evidence).toHaveLength(IBN_DOSSIER_MAX_PHOTOS);
    expect(r.omitted).toBe(3);
  });
});

describe("ibnDossierFilename", () => {
  it("bevat het dossiernummer en de naam, zonder rare tekens", () => {
    expect(ibnDossierFilename({ name: "Bo", dossierNr: "2602093" })).toBe("ibn-dossier-2602093-Bo.pdf");
    expect(ibnDossierFilename({ name: "IBN Airedale Terriër", dossierNr: "2602136" })).toBe(
      "ibn-dossier-2602136-IBN_Airedale_Terrier.pdf",
    );
    expect(ibnDossierFilename({ name: "Bo", dossierNr: null })).toBe("ibn-dossier-Bo.pdf");
  });
});
