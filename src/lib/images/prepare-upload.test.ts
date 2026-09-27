// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fitWithin, prepareForUpload } from "./prepare-upload";

// Story 10.74 — foto's in de browser verkleinen vóór het opladen (Vercel: max. 4,5 MB per aanvraag).

describe("fitWithin", () => {
  it("verkleint zodat de langste zijde de grens raakt, met behoud van verhouding", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("vergroot nooit", () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
});

describe("prepareForUpload", () => {
  let tekenGebied: { width: number; height: number } | null;
  const drawImage = vi.fn();
  const fillRect = vi.fn();

  beforeEach(() => {
    tekenGebied = null;
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      tekenGebied = { width: this.width, height: this.height };
      return { drawImage, fillRect, fillStyle: "" } as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement["getContext"]);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback, type?: string) {
      cb(new Blob(["jpeg"], { type }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // jsdom kent img.decode() niet; de tests die het nodig hebben, zetten het zelf.
    delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
  });

  function zetDecode(fn: () => Promise<void>) {
    Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, writable: true, value: fn });
  }

  it("laat een mail of PDF ongemoeid", async () => {
    const mail = new File(["From: x"], "nieuws.eml", { type: "message/rfc822" });
    const pdf = new File(["%PDF"], "attest.pdf", { type: "application/pdf" });
    expect(await prepareForUpload(mail)).toBe(mail);
    expect(await prepareForUpload(pdf)).toBe(pdf);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("zet een foto om naar een JPEG van max. 2000 px, rechtgezet volgens de gsm", async () => {
    const foto = new File([new Uint8Array(10)], "IMG_0001.HEIC", { type: "image/heic" });
    const klaar = await prepareForUpload(foto);

    expect(createImageBitmap).toHaveBeenCalledWith(foto, { imageOrientation: "from-image" });
    expect(tekenGebied).toEqual({ width: 2000, height: 1500 });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1500);
    expect(klaar.type).toBe("image/jpeg");
    expect(klaar.name).toBe("IMG_0001.jpg");
  });

  it("valt terug op een gewoon beeld als de browser createImageBitmap met opties niet kent", async () => {
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new TypeError("onbekende optie"));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:foto"), revokeObjectURL: vi.fn() }));
    zetDecode(vi.fn().mockResolvedValue(undefined));
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(3000);
    vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(4000);

    const klaar = await prepareForUpload(new File([new Uint8Array(10)], "IMG_0003.jpg", { type: "image/jpeg" }));

    expect(tekenGebied).toEqual({ width: 1500, height: 2000 });
    expect(klaar.type).toBe("image/jpeg");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });

  it("geeft een duidelijke fout als de browser de foto op geen enkele manier kan lezen", async () => {
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("decode"));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:foto"), revokeObjectURL: vi.fn() }));
    zetDecode(vi.fn().mockRejectedValue(new Error("decode")));
    const foto = new File([new Uint8Array(10)], "IMG_0002.heic", { type: "image/heic" });
    await expect(prepareForUpload(foto)).rejects.toThrow(
      '"IMG_0002.heic" kan deze browser niet openen. Sla de foto op als JPG en probeer opnieuw.',
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });
});
