/**
 * Afbeeldingen voor @react-pdf/renderer.
 *
 * `<Image src="https://...">` laadt remote URL's niet betrouwbaar in de
 * server-context; een data-URL werkt overal. Het mime-type komt uit de
 * response-header, met de URL-extensie als terugval, zodat Vercel-Blob-URL's
 * met een random suffix ook herkend worden.
 *
 * Geëxtraheerd uit de zwerfkatten-PDF-route (story 9.3) zodat de affiche
 * (story 10.32) dezelfde afhandeling gebruikt.
 */

/** mime-type dat @react-pdf's <Image> aankan; SVG vergt een aparte <Svg>-flow. */
const SUPPORTED_MIME = /^image\/(png|jpe?g|webp)$/;

/** Mime-type afleiden uit de bestandsextensie in een URL. */
export function mimeFromUrl(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return undefined;
  }
  const match = pathname.match(/\.(png|jpe?g|webp|svg)$/);
  switch (match?.[1]) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return undefined;
  }
}

/** Response-header wint, URL-extensie is de terugval. */
export function resolveImageMime(
  contentTypeHeader: string | null | undefined,
  url: string,
): string | undefined {
  const headerMime = contentTypeHeader?.split(";")[0]?.trim().toLowerCase();
  if (headerMime && headerMime.startsWith("image/")) return headerMime;
  return mimeFromUrl(url);
}

export function isSupportedPdfImageMime(mime: string | undefined): boolean {
  return !!mime && SUPPORTED_MIME.test(mime);
}

/**
 * Haalt een afbeelding op en geeft ze terug als data-URL. Faalt nooit hard:
 * bij een netwerkfout, HTTP-fout of niet-ondersteund formaat komt `undefined`
 * terug en laat de aanroeper de afbeelding gewoon weg.
 */
export async function fetchImageAsDataUrl(
  url: string,
  label = "afbeelding",
): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`${label}: HTTP ${res.status} voor ${url}`);
      return undefined;
    }
    const mime = resolveImageMime(res.headers.get("content-type"), url);
    if (!isSupportedPdfImageMime(mime)) {
      console.warn(`${label} overgeslagen — niet-ondersteund mime: ${mime ?? "onbekend"}`);
      return undefined;
    }
    const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error(`${label} ophalen mislukt:`, err);
    return undefined;
  }
}
