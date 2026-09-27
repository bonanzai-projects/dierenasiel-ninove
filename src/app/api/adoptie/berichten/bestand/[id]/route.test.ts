import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({
  mockGetSession: vi.fn(), mockHasPermission: vi.fn(), mockGetFile: vi.fn(), mockGetPrivateFile: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: h.mockHasPermission }));
vi.mock("@/lib/queries/adoption-updates", () => ({ getAdoptionUpdateFile: h.mockGetFile }));
vi.mock("@/lib/adoption-updates/storage", () => ({ getPrivateFile: h.mockGetPrivateFile }));

import { GET } from "./route";

// Story 10.74 — een bestand na adoptie openen: enkel met login én adoptierechten.

function vraag(id = "40", query = "") {
  return GET(new NextRequest(`http://localhost/api/adoptie/berichten/bestand/${id}${query}`), {
    params: Promise.resolve({ id }),
  });
}

const rij = (extra = {}) => ({
  id: 40, updateId: 12, animalId: 315, contractId: null,
  pathname: "adoptie-berichten/315/12/bo-x1.jpg", fileName: "bo.jpg", mimeType: "image/jpeg", ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetSession.mockResolvedValue({ userId: 4, role: "medewerker" });
  h.mockHasPermission.mockReturnValue(true);
  h.mockGetFile.mockResolvedValue(rij());
  h.mockGetPrivateFile.mockResolvedValue({ stream: new Response("JPEGDATA").body, contentType: "image/jpeg", size: 8 });
});

describe("GET /api/adoptie/berichten/bestand/[id]", () => {
  it("toont een foto uit de private opslag, nooit in een gedeelde cache", async () => {
    const res = await vraag();
    expect(h.mockHasPermission).toHaveBeenCalledWith("medewerker", "adoption:read");
    expect(h.mockGetPrivateFile).toHaveBeenCalledWith("adoptie-berichten/315/12/bo-x1.jpg");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("JPEGDATA");
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Content-Disposition")).toBe(`inline; filename="bo.jpg"; filename*=UTF-8''bo.jpg`);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("downloadt met ?download=1, en een mail altijd als bestand", async () => {
    expect((await vraag("40", "?download=1")).headers.get("Content-Disposition")).toMatch(/^attachment;/);
    h.mockGetFile.mockResolvedValue(rij({ fileName: "Nieuws van Bo.eml", mimeType: "message/rfc822" }));
    expect((await vraag()).headers.get("Content-Disposition")).toBe(
      `attachment; filename="Nieuws van Bo.eml"; filename*=UTF-8''Nieuws%20van%20Bo.eml`,
    );
  });

  it("maakt een bestandsnaam met rare tekens veilig voor de header", async () => {
    h.mockGetFile.mockResolvedValue(rij({ fileName: 'Café "Bo".jpg' }));
    expect((await vraag()).headers.get("Content-Disposition")).toBe(
      `inline; filename="Caf_ _Bo_.jpg"; filename*=UTF-8''Caf%C3%A9%20%22Bo%22.jpg`,
    );
  });

  it("weigert zonder login (401) en zonder adoptierechten (403)", async () => {
    h.mockGetSession.mockResolvedValue(null);
    expect((await vraag()).status).toBe(401);
    h.mockGetSession.mockResolvedValue({ userId: 5, role: "dierenarts" });
    h.mockHasPermission.mockReturnValue(false);
    expect((await vraag()).status).toBe(403);
    expect(h.mockGetPrivateFile).not.toHaveBeenCalled();
  });

  it("geeft 400 bij een ongeldig id en 404 als het bestand er niet is", async () => {
    expect((await vraag("abc")).status).toBe(400);
    h.mockGetFile.mockResolvedValue(null);
    expect((await vraag()).status).toBe(404);
    h.mockGetFile.mockResolvedValue(rij());
    h.mockGetPrivateFile.mockResolvedValue(null);
    expect((await vraag()).status).toBe(404);
  });
});
