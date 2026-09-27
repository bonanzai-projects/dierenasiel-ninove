import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  return {
    mockReturning, mockValues,
    mockInsert: vi.fn().mockReturnValue({ values: mockValues }),
    mockGetSession: vi.fn(), mockHasPermission: vi.fn(), mockLogAudit: vi.fn(),
    mockGetUpdate: vi.fn(), mockPut: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: h.mockInsert } }));
vi.mock("@/lib/db/schema", () => ({ adoptionUpdateFiles: { id: "adoption_update_files.id" } }));
vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: h.mockHasPermission }));
vi.mock("@/lib/audit", () => ({ logAudit: h.mockLogAudit }));
vi.mock("@/lib/queries/adoption-updates", () => ({ getAdoptionUpdateWithFiles: h.mockGetUpdate }));
vi.mock("@/lib/adoption-updates/storage", () => ({ putPrivateFile: h.mockPut }));

import { POST } from "./route";

// Story 10.74 — een foto, mail of PDF bij een bericht na adoptie, naar de PRIVATE opslag.

function vraag(file: File | null, updateId = "12") {
  const fd = new FormData();
  if (file) fd.append("file", file);
  fd.append("updateId", updateId);
  return POST(new Request("http://localhost/api/adoptie/berichten/upload", { method: "POST", body: fd }));
}

const foto = (naam = "bo.jpg", grootte = 1000) => new File([new Uint8Array(grootte)], naam, { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.mockGetSession.mockResolvedValue({ userId: 3, role: "adoptieconsulent" });
  h.mockHasPermission.mockReturnValue(true);
  h.mockGetUpdate.mockResolvedValue({ id: 12, animalId: 315, contractId: 7, pathnames: [] });
  h.mockPut.mockResolvedValue({ pathname: "adoptie-berichten/315/12/bo-x1y2.jpg" });
  h.mockReturning.mockResolvedValue([{ id: 40 }]);
});

describe("POST /api/adoptie/berichten/upload", () => {
  it("bewaart een foto privé en registreert ze bij het bericht", async () => {
    const res = await vraag(foto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 40, fileName: "bo.jpg", kind: "foto" });

    expect(h.mockHasPermission).toHaveBeenCalledWith("adoptieconsulent", "adoption:write");
    expect(h.mockPut).toHaveBeenCalledWith("adoptie-berichten/315/12/bo.jpg", expect.any(File), "image/jpeg");
    expect(h.mockValues).toHaveBeenCalledWith({
      updateId: 12,
      pathname: "adoptie-berichten/315/12/bo-x1y2.jpg",
      fileName: "bo.jpg",
      mimeType: "image/jpeg",
      fileSize: 1000,
    });
    expect(h.mockLogAudit).toHaveBeenCalledWith("adoption_update.file_add", "animal", 315, null, {
      updateId: 12, fileId: 40, fileName: "bo.jpg",
    });
  });

  it("aanvaardt een doorgestuurde mail, ook als Outlook het type niet meestuurt", async () => {
    const mail = new File(["From: x"], "Nieuws van Bo.eml", { type: "application/octet-stream" });
    const res = await vraag(mail);
    expect(res.status).toBe(200);
    expect(h.mockPut).toHaveBeenCalledWith("adoptie-berichten/315/12/Nieuws_van_Bo.eml", expect.any(File), "message/rfc822");
  });

  it("weigert zonder login (401) en zonder schrijfrecht (403)", async () => {
    h.mockGetSession.mockResolvedValue(null);
    expect((await vraag(foto())).status).toBe(401);
    h.mockGetSession.mockResolvedValue({ userId: 4, role: "medewerker" });
    h.mockHasPermission.mockReturnValue(false);
    expect((await vraag(foto())).status).toBe(403);
    expect(h.mockPut).not.toHaveBeenCalled();
  });

  it("weigert een ander bestandstype", async () => {
    const res = await vraag(new File(["<html>"], "pagina.html", { type: "text/html" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Enkel foto's (JPG, PNG, WebP), doorgestuurde mails (.eml) of PDF.");
    expect(h.mockPut).not.toHaveBeenCalled();
  });

  it("weigert een te groot of leeg bestand", async () => {
    const groot = await vraag(foto("groot.jpg", 4 * 1024 * 1024 + 1));
    expect(groot.status).toBe(400);
    expect((await groot.json()).error).toContain("te groot");
    expect((await vraag(foto("leeg.jpg", 0))).status).toBe(400);
    expect(h.mockPut).not.toHaveBeenCalled();
  });

  it("weigert een 21e bestand bij hetzelfde bericht", async () => {
    h.mockGetUpdate.mockResolvedValue({ id: 12, animalId: 315, contractId: 7, pathnames: Array(20).fill("x") });
    const res = await vraag(foto());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Hooguit 20 bestanden per bericht.");
  });

  it("meldt een onbekend bericht of ontbrekend bestand", async () => {
    h.mockGetUpdate.mockResolvedValue(null);
    expect((await vraag(foto())).status).toBe(404);
    h.mockGetUpdate.mockResolvedValue({ id: 12, animalId: 315, contractId: 7, pathnames: [] });
    expect((await vraag(null)).status).toBe(400);
    expect((await vraag(foto(), "abc")).status).toBe(400);
  });

  it("geeft een nette fout als de opslag faalt, zonder iets te registreren", async () => {
    h.mockPut.mockRejectedValue(new Error("opslag weg"));
    const res = await vraag(foto());
    expect(res.status).toBe(502);
    expect(h.mockInsert).not.toHaveBeenCalled();
  });
});
