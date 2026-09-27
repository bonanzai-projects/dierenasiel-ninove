import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequirePermission, mockGetReport, mockGetVet, mockRender } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockGetReport: vi.fn(),
  mockGetVet: vi.fn(),
  mockRender: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/queries/vet-inspection-reports", () => ({ getVetInspectionReportById: mockGetReport }));
vi.mock("@/lib/queries/veterinarians", () => ({ getVeterinarianById: mockGetVet }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: mockRender }));
vi.mock("@/components/beheerder/medisch/InspectionReportPdf", () => ({ default: () => null }));

import { GET } from "./route";

// Story 10.71 — het bezoekrapport verschijnt in het programma; downloaden enkel op vraag.

function vraag(query = "") {
  return GET(new NextRequest(`http://localhost/api/rapporten/bezoekrapport/7/pdf${query}`), {
    params: Promise.resolve({ id: "7" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockRender.mockResolvedValue(Buffer.from("%PDF-1.4"));
  mockGetReport.mockResolvedValue({ id: 7, visitDate: "2026-09-01", vetName: "Dr. Peeters" });
});

describe("GET /api/rapporten/bezoekrapport/[id]/pdf", () => {
  it("toont de PDF standaard in de browser (inline)", async () => {
    const res = await vraag();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'inline; filename="bezoekrapport-2026-09-01-Dr_Peeters.pdf"',
    );
  });

  it("downloadt met ?download=1, onder dezelfde bestandsnaam", async () => {
    const res = await vraag("?download=1");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="bezoekrapport-2026-09-01-Dr_Peeters.pdf"',
    );
  });

  it("weigert zonder rechten", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const res = await vraag();
    expect(res.status).toBe(403);
  });

  // Story 10.81 — Sven: "volledige gegevens van de dierenarts moeten erop komen".
  it("geeft de fiche van de gekozen dierenarts mee aan de PDF", async () => {
    const fiche = { id: 3, name: "Dr. Peeters", city: "Ninove" };
    mockGetReport.mockResolvedValue({ id: 7, visitDate: "2026-09-01", vetName: "Dr. Peeters", veterinarianId: 3 });
    mockGetVet.mockResolvedValue(fiche);
    await vraag();
    expect(mockGetVet).toHaveBeenCalledWith(3);
    expect(mockRender.mock.calls[0][0].props.veterinarian).toEqual(fiche);
  });

  it("zonder gekozen dierenarts: enkel de naam", async () => {
    await vraag();
    expect(mockGetVet).not.toHaveBeenCalled();
    expect(mockRender.mock.calls[0][0].props.veterinarian).toBeNull();
  });
});
