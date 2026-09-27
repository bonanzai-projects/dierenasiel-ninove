import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { fetchPdfPhoto } from "./pdf-photo";

// Story 10.72 — bewijsfoto's gaan op volle grootte de Blob in (tot 50 MB); in een
// PDF die bekeken (Vercel: max. 4,5 MB) of gemaild (Resend: max. 40 MB) wordt,
// moeten ze klein.

async function png(breedte: number, hoogte: number): Promise<Buffer> {
  return sharp({ create: { width: breedte, height: hoogte, channels: 3, background: "#8a5a2b" } }).png().toBuffer();
}

function antwoord(body: Buffer | string, status = 200, type = "image/png"): Response {
  return new Response(typeof body === "string" ? body : new Uint8Array(body), {
    status,
    headers: { "content-type": type },
  });
}

async function afmetingen(dataUrl: string) {
  const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  return sharp(Buffer.from(b64, "base64")).metadata();
}

describe("fetchPdfPhoto", () => {
  it("verkleint een grote foto tot max. 1200 px en geeft een JPEG-data-URL terug", async () => {
    const ophalen = vi.fn().mockResolvedValue(antwoord(await png(4000, 3000)));
    const url = await fetchPdfPhoto("https://blob.example/groot.png", { ophalen });

    expect(ophalen).toHaveBeenCalledWith("https://blob.example/groot.png");
    expect(url).toMatch(/^data:image\/jpeg;base64,/);
    const m = await afmetingen(url!);
    expect(m.format).toBe("jpeg");
    expect(Math.max(m.width!, m.height!)).toBe(1200);
    expect(m.width).toBe(1200);
    expect(m.height).toBe(900);
  });

  it("vergroot een kleine foto niet", async () => {
    const ophalen = vi.fn().mockResolvedValue(antwoord(await png(300, 200)));
    const m = await afmetingen((await fetchPdfPhoto("https://blob.example/klein.png", { ophalen }))!);
    expect(m.width).toBe(300);
    expect(m.height).toBe(200);
  });

  it("respecteert een kleinere maximummaat", async () => {
    const ophalen = vi.fn().mockResolvedValue(antwoord(await png(2000, 1000)));
    const m = await afmetingen((await fetchPdfPhoto("https://blob.example/f.png", { ophalen, maxSize: 400 }))!);
    expect(m.width).toBe(400);
  });

  it("geeft niets terug bij een HTTP-fout, zonder te falen", async () => {
    const ophalen = vi.fn().mockResolvedValue(antwoord("weg", 404, "text/plain"));
    expect(await fetchPdfPhoto("https://blob.example/weg.jpg", { ophalen })).toBeUndefined();
  });

  it("geeft niets terug als het geen afbeelding is", async () => {
    const ophalen = vi.fn().mockResolvedValue(antwoord("geen foto", 200, "image/jpeg"));
    expect(await fetchPdfPhoto("https://blob.example/kapot.jpg", { ophalen })).toBeUndefined();
  });

  it("geeft niets terug bij een netwerkfout", async () => {
    const ophalen = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchPdfPhoto("https://blob.example/f.jpg", { ophalen })).toBeUndefined();
  });
});
