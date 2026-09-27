import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAnimalById, mockGetNeglect, mockRender } = vi.hoisted(() => ({
  mockGetAnimalById: vi.fn(),
  mockGetNeglect: vi.fn(),
  mockRender: vi.fn(),
}));

vi.mock("@/lib/queries/animals", () => ({ getAnimalById: mockGetAnimalById }));
vi.mock("@/lib/queries/neglect-reports", () => ({ getNeglectReportByAnimalId: mockGetNeglect }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: mockRender }));
vi.mock("@/components/beheerder/dieren/IbnDossierPdf", () => ({ default: () => null }));

import { buildIbnDossierDocument } from "./ibn-dossier-document";

// Story 10.72 — dier + verwaarlozingsrapport + foto's → één PDF.

const dier = {
  id: 315, name: "Bo", aliasName: null, species: "hond", breed: null, gender: "teef", dateOfBirth: null,
  color: null, identificationNr: null, passportNr: null, dossierNr: "2602093", pvNr: "PV-1",
  ibnReason: null, ibnDecisionDeadline: null, intakeDate: "2026-05-26", intakeReason: "ibn",
  intakeMetadata: null, isInShelter: true, outtakeDate: null, outtakeReason: null,
  imageUrl: "https://blob.example/bo.jpg", images: null,
};

const rapport = {
  id: 1, animalId: 315, date: null, vetName: null, weightOnArrival: null,
  healthStatusOnArrival: "Mager", neglectFindings: "Geen water", treatmentsGiven: null, notes: null,
  photos: ["https://blob.example/n1.jpg", "https://blob.example/weg.jpg"],
};

const laadFoto = vi.fn(async (url: string) => (url.includes("weg") ? undefined : `data:image/jpeg;base64,${url}`));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnimalById.mockResolvedValue(dier);
  mockGetNeglect.mockResolvedValue(rapport);
  mockRender.mockResolvedValue(Buffer.from("%PDF-1.4"));
});

describe("buildIbnDossierDocument", () => {
  it("maakt de PDF met hoofdfoto en de bewijsfoto's die bereikbaar zijn", async () => {
    const doc = await buildIbnDossierDocument(315, laadFoto);

    expect(doc).toMatchObject({
      filename: "ibn-dossier-2602093-Bo.pdf",
      animalName: "Bo",
      speciesLabel: "Hond",
      dossierNr: "2602093",
      pvNr: "PV-1",
    });
    expect(doc!.content.toString()).toBe("%PDF-1.4");

    const props = mockRender.mock.calls[0][0].props;
    expect(props.mainPhoto).toBe("data:image/jpeg;base64,https://blob.example/bo.jpg");
    // De onbereikbare foto valt weg, het dossier faalt niet.
    expect(props.evidencePhotos).toEqual(["data:image/jpeg;base64,https://blob.example/n1.jpg"]);
    expect(props.omittedPhotos).toBe(0);
    expect(props.data.neglect).not.toBeNull();
  });

  it("werkt ook zonder verwaarlozingsrapport en zonder foto", async () => {
    mockGetNeglect.mockResolvedValue(null);
    mockGetAnimalById.mockResolvedValue({ ...dier, imageUrl: null });
    const doc = await buildIbnDossierDocument(315, laadFoto);

    const props = mockRender.mock.calls[0][0].props;
    expect(doc).not.toBeNull();
    expect(props.data.neglect).toBeNull();
    expect(props.mainPhoto).toBeUndefined();
    expect(props.evidencePhotos).toEqual([]);
    expect(laadFoto).not.toHaveBeenCalled();
  });

  it("geeft niets voor een dier dat niet in beslag genomen is", async () => {
    mockGetAnimalById.mockResolvedValue({ ...dier, intakeReason: "afstand" });
    expect(await buildIbnDossierDocument(315, laadFoto)).toBeNull();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("geeft niets voor een onbekend dier", async () => {
    mockGetAnimalById.mockResolvedValue(null);
    expect(await buildIbnDossierDocument(999, laadFoto)).toBeNull();
  });
});
