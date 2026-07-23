import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mimeFromUrl,
  resolveImageMime,
  isSupportedPdfImageMime,
  fetchImageAsDataUrl,
} from "./pdf-image";

describe("mimeFromUrl", () => {
  it("leidt het mime-type af uit de extensie", () => {
    expect(mimeFromUrl("https://blob.vercel.com/foo.png")).toBe("image/png");
    expect(mimeFromUrl("https://blob.vercel.com/foo.jpg")).toBe("image/jpeg");
    expect(mimeFromUrl("https://blob.vercel.com/foo.jpeg")).toBe("image/jpeg");
    expect(mimeFromUrl("https://blob.vercel.com/foo.webp")).toBe("image/webp");
    expect(mimeFromUrl("https://blob.vercel.com/foo.svg")).toBe("image/svg+xml");
  });

  it("negeert de querystring en let niet op hoofdletters", () => {
    expect(mimeFromUrl("https://blob.vercel.com/Foo.PNG?v=2")).toBe("image/png");
  });

  it("geeft undefined zonder herkenbare extensie of bij een ongeldige URL", () => {
    expect(mimeFromUrl("https://blob.vercel.com/foo")).toBeUndefined();
    expect(mimeFromUrl("geen-url")).toBeUndefined();
  });
});

describe("resolveImageMime", () => {
  it("geeft voorrang aan de response-header", () => {
    expect(resolveImageMime("image/webp", "https://x.dev/foo.png")).toBe("image/webp");
    expect(resolveImageMime("image/png; charset=binary", "https://x.dev/foo")).toBe("image/png");
  });

  it("valt terug op de URL-extensie bij een niet-bruikbare header", () => {
    expect(resolveImageMime("application/octet-stream", "https://x.dev/foo.png")).toBe("image/png");
    expect(resolveImageMime(null, "https://x.dev/foo.jpg")).toBe("image/jpeg");
  });
});

describe("isSupportedPdfImageMime", () => {
  it("aanvaardt png, jpeg en webp", () => {
    expect(isSupportedPdfImageMime("image/png")).toBe(true);
    expect(isSupportedPdfImageMime("image/jpeg")).toBe(true);
    expect(isSupportedPdfImageMime("image/webp")).toBe(true);
  });

  it("weigert svg en onbekend", () => {
    expect(isSupportedPdfImageMime("image/svg+xml")).toBe(false);
    expect(isSupportedPdfImageMime(undefined)).toBe(false);
  });
});

describe("fetchImageAsDataUrl", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(impl: () => Promise<unknown>) {
    global.fetch = vi.fn().mockImplementation(impl) as unknown as typeof fetch;
  }

  it("geeft een data-URL terug voor een geldige afbeelding", async () => {
    mockFetch(async () => ({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new TextEncoder().encode("hallo").buffer,
    }));

    const result = await fetchImageAsDataUrl("https://x.dev/foo.png");

    expect(result).toBe(`data:image/png;base64,${Buffer.from("hallo").toString("base64")}`);
  });

  it("geeft undefined bij een HTTP-fout", async () => {
    mockFetch(async () => ({ ok: false, status: 404, headers: { get: () => null } }));

    expect(await fetchImageAsDataUrl("https://x.dev/foo.png")).toBeUndefined();
  });

  it("geeft undefined bij een niet-ondersteund formaat (svg)", async () => {
    mockFetch(async () => ({
      ok: true,
      headers: { get: () => "image/svg+xml" },
      arrayBuffer: async () => new ArrayBuffer(8),
    }));

    expect(await fetchImageAsDataUrl("https://x.dev/foo.svg")).toBeUndefined();
  });

  it("geeft undefined bij een netwerkfout in plaats van te crashen", async () => {
    mockFetch(async () => { throw new Error("ECONNREFUSED"); });

    expect(await fetchImageAsDataUrl("https://x.dev/foo.png")).toBeUndefined();
  });
});
