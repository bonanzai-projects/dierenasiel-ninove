import { describe, it, expect, beforeAll } from "vitest";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import IbnDossierPdf from "./IbnDossierPdf";
import { buildIbnDossierPdfData, type IbnDossierAnimal, type IbnDossierNeglect } from "@/lib/animals/ibn-dossier";

/**
 * Story 10.72 — het IBN-dossier rendert effectief (fonts, stijlen, foto's) en toont
 * wat politie of Dierenwelzijn moet zien, ook als er nog niets ingevuld is.
 */

const dier: IbnDossierAnimal = {
  name: "Bo", aliasName: "Shana", species: "hond", breed: "Chow Chow", gender: "teef",
  dateOfBirth: "2024-10-27", color: "Ros", identificationNr: "981000012345678", passportNr: null,
  dossierNr: "2602093", pvNr: "PV-2026-001", ibnReason: "Verwaarlozing", ibnDecisionDeadline: "2026-07-25",
  intakeDate: "2026-05-26", intakeMetadata: { betrokkenInstanties: "Politiezone Ninove" },
  isInShelter: true, outtakeDate: null, outtakeReason: null, imageUrl: null, images: null,
};

const rapport: IbnDossierNeglect = {
  date: "2026-05-27", vetName: "Dr. Peeters", weightOnArrival: "12 kg",
  healthStatusOnArrival: "Mager, vacht vervilt", neglectFindings: "Geen water, geen beschutting",
  treatmentsGiven: "Ontvlooid", notes: null, photos: [],
};

const nu = new Date("2026-09-25T10:00:00Z");

/** Alle tekst in de elementenboom (zelfde techniek als OwnerReturnPdf.test). */
function tekstVan(node: ReactNode): string {
  const stukken: string[] = [];
  const loop = (n: ReactNode): void => {
    if (typeof n === "string" || typeof n === "number") { stukken.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(loop); return; }
    if (!isValidElement(n)) return;
    if (typeof n.type === "function") { loop((n.type as (p: unknown) => ReactNode)(n.props)); return; }
    const props = n.props as { children?: ReactNode };
    if (props.children !== undefined) loop(props.children);
  };
  loop(node);
  return stukken.join(" ");
}

let foto: string;
beforeAll(async () => {
  const jpeg = await sharp({ create: { width: 60, height: 40, channels: 3, background: "#8a5a2b" } }).jpeg().toBuffer();
  foto = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
});

describe("IbnDossierPdf", () => {
  it("toont de inbeslagname en het verwaarlozingsrapport", () => {
    const t = tekstVan(IbnDossierPdf({ data: buildIbnDossierPdfData(dier, rapport, nu), evidencePhotos: [] }));
    expect(t).toContain("IBN-dossier");
    expect(t).toContain("PV-2026-001");
    expect(t).toContain("2602093");
    expect(t).toContain("Politiezone Ninove");
    expect(t).toContain("Geen water, geen beschutting");
    expect(t).toContain("25/09/2026");
    expect(t).not.toContain("Nog geen verwaarlozingsrapport");
  });

  it("zegt uitdrukkelijk dat het verwaarlozingsrapport ontbreekt", () => {
    const t = tekstVan(IbnDossierPdf({ data: buildIbnDossierPdfData(dier, null, nu), evidencePhotos: [] }));
    expect(t).toContain("Nog geen verwaarlozingsrapport ingevuld.");
  });

  it("vermeldt hoeveel bewijsfoto's niet in het dossier staan", () => {
    const t = tekstVan(
      IbnDossierPdf({ data: buildIbnDossierPdfData(dier, rapport, nu), evidencePhotos: [foto], omittedPhotos: 3 }),
    );
    expect(t).toContain("3 foto's niet opgenomen");
  });

  it("rendert een volledig dossier met foto's als PDF", async () => {
    const buffer = await renderToBuffer(
      createElement(IbnDossierPdf, {
        data: buildIbnDossierPdfData(dier, rapport, nu),
        mainPhoto: foto,
        evidencePhotos: [foto, foto, foto, foto],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);

  it("rendert ook een dossier waarin bijna niets ingevuld is", async () => {
    const leeg = { ...dier, aliasName: null, breed: null, pvNr: null, ibnReason: null, intakeMetadata: null };
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(IbnDossierPdf, { data: buildIbnDossierPdfData(leeg, null, nu), evidencePhotos: [] }) as any,
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});

// Story 10.79 — het gewichtsverloop in het IBN-dossier.
describe("IbnDossierPdf — gewichtsverloop", () => {
  const wegingen = [
    { id: 5, date: "2026-06-20", weightKg: "14.200", notes: "na behandeling" },
    { id: 4, date: "2026-06-01", weightKg: "13.000", notes: null },
  ];
  const rapportMetGewicht = { ...rapport, weightOnArrival: "12 kg" };

  it("toont de samenvatting en de wegingen in de tijd", () => {
    const t = tekstVan(
      IbnDossierPdf({ data: buildIbnDossierPdfData(dier, rapportMetGewicht, nu, wegingen), evidencePhotos: [] }),
    );
    expect(t).toContain("Gewichtsverloop");
    expect(t).toContain("Van 12 kg op 27/05/2026 naar 14,2 kg op 20/06/2026: +2,2 kg");
    expect(t).toContain("Bij aankomst (verwaarlozingsrapport)");
    expect(t).toContain("+1,2 kg");
    expect(t).toContain("na behandeling");
  });

  it("zegt het als er nog niet gewogen is", () => {
    const t = tekstVan(
      IbnDossierPdf({ data: buildIbnDossierPdfData(dier, { ...rapport, weightOnArrival: null }, nu), evidencePhotos: [] }),
    );
    expect(t).toContain("Nog geen wegingen geregistreerd.");
  });

  it("rendert met een grafiekje als PDF", async () => {
    const buffer = await renderToBuffer(
      createElement(IbnDossierPdf, {
        data: buildIbnDossierPdfData(dier, rapportMetGewicht, nu, wegingen),
        evidencePhotos: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});