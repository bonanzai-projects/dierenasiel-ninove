import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockPut, mockGet, mockDel } = vi.hoisted(() => ({ mockPut: vi.fn(), mockGet: vi.fn(), mockDel: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: mockPut, get: mockGet, del: mockDel }));

import { putPrivateFile, getPrivateFile, readPrivateFile, deletePrivateFiles } from "./storage";

// Story 10.74 — bestanden van adoptanten gaan ENKEL naar de private opslag, met haar eigen sleutel.

const SLEUTEL = "vercel_blob_rw_privaat_test";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = SLEUTEL;
});

afterEach(() => {
  delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
});

describe("putPrivateFile", () => {
  it("bewaart privé, met de private sleutel en een willekeurig achtervoegsel", async () => {
    mockPut.mockResolvedValue({ pathname: "adoptie-berichten/315/12/bo-abc123.jpg" });
    const r = await putPrivateFile("adoptie-berichten/315/12/bo.jpg", Buffer.from("x"), "image/jpeg");

    expect(mockPut).toHaveBeenCalledWith("adoptie-berichten/315/12/bo.jpg", expect.anything(), {
      access: "private",
      token: SLEUTEL,
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
    expect(r).toEqual({ pathname: "adoptie-berichten/315/12/bo-abc123.jpg" });
  });

  it("weigert te bewaren zonder private sleutel — nooit terugvallen op de publieke opslag", async () => {
    delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "publieke-sleutel";
    await expect(putPrivateFile("a/b.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow(
      "PRIVATE_BLOB_READ_WRITE_TOKEN ontbreekt",
    );
    expect(mockPut).not.toHaveBeenCalled();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });
});

describe("getPrivateFile / readPrivateFile", () => {
  it("haalt een bestand privé op", async () => {
    const stream = new Response("inhoud").body;
    mockGet.mockResolvedValue({ statusCode: 200, stream, blob: { contentType: "image/jpeg", size: 7 } });
    const r = await getPrivateFile("adoptie-berichten/315/12/bo.jpg");
    expect(mockGet).toHaveBeenCalledWith("adoptie-berichten/315/12/bo.jpg", { access: "private", token: SLEUTEL });
    expect(r).toEqual({ stream, contentType: "image/jpeg", size: 7 });
  });

  it("geeft null als het bestand er niet (meer) is", async () => {
    mockGet.mockResolvedValue(null);
    expect(await getPrivateFile("weg.jpg")).toBeNull();
    expect(await readPrivateFile("weg.jpg")).toBeNull();
  });

  it("leest de volledige inhoud, bv. om een mail te tonen", async () => {
    mockGet.mockResolvedValue({ statusCode: 200, stream: new Response("From: x").body, blob: { contentType: "message/rfc822", size: 7 } });
    const inhoud = await readPrivateFile("mail.eml");
    expect(new TextDecoder().decode(inhoud!)).toBe("From: x");
  });
});

describe("deletePrivateFiles", () => {
  it("verwijdert uit de private opslag", async () => {
    await deletePrivateFiles(["a.jpg", "b.eml"]);
    expect(mockDel).toHaveBeenCalledWith(["a.jpg", "b.eml"], { token: SLEUTEL });
  });

  it("doet niets zonder bestanden", async () => {
    await deletePrivateFiles([]);
    expect(mockDel).not.toHaveBeenCalled();
  });
});
