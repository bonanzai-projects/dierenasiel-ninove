import sharp from "sharp";

/**
 * Story 10.72 — een foto ophalen en verkleinen voor een PDF.
 *
 * Bewijsfoto's gaan op volle grootte de Blob in (tot 50 MB). Ongewijzigd in een
 * PDF maken ze die te zwaar om te bekijken (Vercel: max. 4,5 MB per antwoord)
 * of te mailen (Resend: max. 40 MB). Daarom: langste zijde hooguit `maxSize`
 * pixels, als JPEG. `rotate()` draait gsm-foto's volgens hun EXIF-stand, zodat
 * ze niet op hun zij in het dossier staan.
 *
 * Apart van `pdf-image.ts`: zo komt `sharp` enkel in de routes die hem nodig hebben.
 * Faalt nooit hard — een onbereikbare of kapotte foto valt weg (`undefined`).
 */

interface Opties {
  maxSize?: number;
  /** Injecteerbaar voor tests: een vervangen globale `fetch` breekt het laden van @react-pdf. */
  ophalen?: typeof fetch;
  label?: string;
}

export async function fetchPdfPhoto(
  url: string,
  { maxSize = 1200, ophalen = fetch, label = "foto" }: Opties = {},
): Promise<string | undefined> {
  try {
    const res = await ophalen(url);
    if (!res.ok) {
      console.error(`${label}: HTTP ${res.status} voor ${url}`);
      return undefined;
    }
    const origineel = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(origineel)
      .rotate()
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (err) {
    console.error(`${label} ophalen/verkleinen mislukt:`, err);
    return undefined;
  }
}
