import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequirePermission, mockBuild } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockBuild: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/animals/ibn-dossier-document", () => ({ buildIbnDossierDocument: mockBuild }));

import { GET } from "./route";

// Story 10.72 — het IBN-dossier van één dier, te bekijken in het programma.

function vraag(id = "315", query = "") {
  return GET(new NextRequest(`http://localhost/api/dieren/${id}/ibn-dossier/pdf${query}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockBuild.mockResolvedValue({ filename: "ibn-dossier-2602093-Bo.pdf", content: Buffer.from("%PDF-1.4") });
});

describe("GET /api/dieren/[id]/ibn-dossier/pdf", () => {
  it("toont de PDF standaard in de browser (inline)", async () => {
    const res = await vraag();
    expect(mockRequirePermission).toHaveBeenCalledWith("animal:read");
    expect(mockBuild).toHaveBeenCalledWith(315);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe('inline; filename="ibn-dossier-2602093-Bo.pdf"');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("%PDF-1.4");
  });

  it("downloadt met ?download=1", async () => {
    const res = await vraag("315", "?download=1");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="ibn-dossier-2602093-Bo.pdf"');
  });

  it("antwoordt 404 voor een dier zonder IBN-dossier", async () => {
    mockBuild.mockResolvedValue(null);
    expect((await vraag()).status).toBe(404);
  });

  it("antwoordt 400 op een ongeldig id", async () => {
    expect((await vraag("abc")).status).toBe(400);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it("weigert zonder rechten", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect((await vraag()).status).toBe(403);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it("antwoordt 500 met een nette melding als de PDF mislukt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockBuild.mockRejectedValue(new Error("kapot"));
    const res = await vraag();
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Er ging iets mis bij het maken van het IBN-dossier.");
  });
});
