import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequirePermission, mockGetReports } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockGetReports: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/queries/reports", () => ({ getVetInspectionReportsFiltered: mockGetReports }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4")) }));
vi.mock("@/components/beheerder/rapporten/InspectionListPdf", () => ({ default: () => null }));

import { GET } from "./route";

// Story 10.71 — het R11-overzicht verschijnt in het programma; downloaden enkel op vraag.

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetReports.mockResolvedValue({ reports: [], total: 0 });
});

describe("GET /api/rapporten/bezoekrapporten/pdf", () => {
  it("toont de PDF standaard in de browser (inline)", async () => {
    const res = await GET(new NextRequest("http://localhost/api/rapporten/bezoekrapporten/pdf?van=2026-01-01"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/^inline; filename="bezoekrapporten-\d{4}-\d{2}-\d{2}\.pdf"$/);
  });

  it("downloadt met ?download=1, en houdt de datums als filter", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13&download=1"),
    );
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="bezoekrapporten-/);
    expect(mockGetReports).toHaveBeenCalledWith({ dateFrom: "2026-01-01", dateTo: "2026-09-13" });
  });
});
