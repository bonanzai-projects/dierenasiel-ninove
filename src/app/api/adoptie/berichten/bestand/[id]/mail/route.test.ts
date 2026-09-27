import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetSession: vi.fn(), mockHasPermission: vi.fn(), mockGetFile: vi.fn(),
  mockReadPrivateFile: vi.fn(), mockReadEmlView: vi.fn(), mockReadEmlAttachment: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: h.mockHasPermission }));
vi.mock("@/lib/queries/adoption-updates", () => ({ getAdoptionUpdateFile: h.mockGetFile }));
vi.mock("@/lib/adoption-updates/storage", () => ({ readPrivateFile: h.mockReadPrivateFile }));
vi.mock("@/lib/email/eml-read", () => ({ readEmlView: h.mockReadEmlView, readEmlAttachment: h.mockReadEmlAttachment }));

import { GET as leesMail } from "./route";
import { GET as leesBijlage } from "./bijlage/[index]/route";

// Story 10.74 — een doorgestuurde mail van een adoptant lezen in het programma (zoals 10.41).

const mailRij = { id: 41, updateId: 12, animalId: 315, contractId: null, pathname: "adoptie-berichten/315/12/m.eml", fileName: "m.eml", mimeType: "message/rfc822" };
const ruw = new ArrayBuffer(8);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.mockGetSession.mockResolvedValue({ userId: 4, role: "medewerker" });
  h.mockHasPermission.mockReturnValue(true);
  h.mockGetFile.mockResolvedValue(mailRij);
  h.mockReadPrivateFile.mockResolvedValue(ruw);
});

const mail = (id = "41") => leesMail(new Request("http://localhost"), { params: Promise.resolve({ id }) });
const bijlage = (index = "0") => leesBijlage(new Request("http://localhost"), { params: Promise.resolve({ id: "41", index }) });

describe("GET /api/adoptie/berichten/bestand/[id]/mail", () => {
  it("geeft de leesbare mail uit de private opslag", async () => {
    h.mockReadEmlView.mockResolvedValue({ subject: "Nieuws van Bo", document: "<p>ok</p>", attachments: [] });
    const res = await mail();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ subject: "Nieuws van Bo" });
    expect(h.mockReadPrivateFile).toHaveBeenCalledWith("adoptie-berichten/315/12/m.eml");
    expect(h.mockHasPermission).toHaveBeenCalledWith("medewerker", "adoption:read");
  });

  it("weigert zonder login of rechten", async () => {
    h.mockGetSession.mockResolvedValue(null);
    expect((await mail()).status).toBe(401);
    h.mockGetSession.mockResolvedValue({ userId: 5, role: "dierenarts" });
    h.mockHasPermission.mockReturnValue(false);
    expect((await mail()).status).toBe(403);
    expect(h.mockReadPrivateFile).not.toHaveBeenCalled();
  });

  it("weigert een bestand dat geen mail is", async () => {
    h.mockGetFile.mockResolvedValue({ ...mailRij, mimeType: "image/jpeg" });
    expect((await mail()).status).toBe(400);
  });

  it("zegt het netjes als de mail niet te lezen is", async () => {
    h.mockReadEmlView.mockRejectedValue(new Error("kapot"));
    const res = await mail();
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("kon niet gelezen worden");
  });
});

describe("GET /api/adoptie/berichten/bestand/[id]/mail/bijlage/[index]", () => {
  it("geeft een bijlage uit de mail, privé", async () => {
    h.mockReadEmlAttachment.mockResolvedValue({ bytes: Buffer.from("PNG"), mimeType: "image/png", filename: "bo.png", disposition: "inline" });
    const res = await bijlage();
    expect(res.status).toBe(200);
    expect(h.mockReadEmlAttachment).toHaveBeenCalledWith(ruw, 0);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toBe(`inline; filename="bo.png"; filename*=UTF-8''bo.png`);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("kan een bijlage aan met een naam buiten Latin-1 (bv. een gekrulde apostrof)", async () => {
    h.mockReadEmlAttachment.mockResolvedValue({ bytes: Buffer.from("JPG"), mimeType: "image/jpeg", filename: "Bo’s eerste week.jpg", disposition: "inline" });
    const res = await bijlage();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toBe(
      `inline; filename="Bo_s eerste week.jpg"; filename*=UTF-8''Bo%E2%80%99s%20eerste%20week.jpg`,
    );
  });

  it("geeft 404 voor een bijlage die niet bestaat en 400 voor een ongeldig volgnummer", async () => {
    h.mockReadEmlAttachment.mockResolvedValue(null);
    expect((await bijlage("3")).status).toBe(404);
    expect((await bijlage("-1")).status).toBe(400);
  });

  it("weigert zonder rechten", async () => {
    h.mockHasPermission.mockReturnValue(false);
    expect((await bijlage()).status).toBe(403);
  });
});
