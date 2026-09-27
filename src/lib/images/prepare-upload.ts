import { PHOTO_MAX_SIZE_PX } from "@/lib/adoption-updates/rules";

/**
 * Story 10.74 — een foto in de browser verkleinen vóór het opladen.
 *
 * - Een Vercel-functie aanvaardt max. 4,5 MB per aanvraag; een gsm-foto is vaak groter.
 * - Opnieuw bewaren als JPEG zet de foto recht volgens de gsm (`imageOrientation`)
 *   en laat de EXIF-gegevens weg, zoals de GPS-plaats van de woning van de adoptant.
 * - Een HEIC-foto van een iPhone lukt waar de browser ze kan lezen (Safari); de
 *   iPhone zelf levert bij het kiezen uit de galerij meestal al een JPEG.
 *
 * Mails en PDF's gaan ongewijzigd door.
 */

const FOTO = /\.(jpe?g|png|webp|heic|heif)$/i;

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const schaal = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * schaal), height: Math.round(height * schaal) };
}

function alsJpg(naam: string): string {
  const punt = naam.lastIndexOf(".");
  return `${punt > 0 ? naam.slice(0, punt) : naam}.jpg`;
}

interface Beeld {
  bron: CanvasImageSource;
  width: number;
  height: number;
  vrijgeven: () => void;
}

/**
 * Eerst `createImageBitmap` met EXIF-stand. Kent de browser die optie niet (oudere
 * Safari), dan een gewoon `<img>`: dat leest alles wat de browser kan tonen en zet
 * de foto in moderne browsers zelf recht.
 */
async function lees(file: File): Promise<Beeld> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { bron: bitmap, width: bitmap.width, height: bitmap.height, vrijgeven: () => bitmap.close?.() };
  } catch {
    // Verder met een gewoon beeld.
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { bron: img, width: img.naturalWidth, height: img.naturalHeight, vrijgeven: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(`"${file.name}" kan deze browser niet openen. Sla de foto op als JPG en probeer opnieuw.`);
  }
}

export async function prepareForUpload(
  file: File,
  { maxSize = PHOTO_MAX_SIZE_PX, quality = 0.85 }: { maxSize?: number; quality?: number } = {},
): Promise<File> {
  if (!FOTO.test(file.name) && !file.type.startsWith("image/")) return file;

  const beeld = await lees(file);
  const { width, height } = fitWithin(beeld.width, beeld.height, maxSize);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    beeld.vrijgeven();
    throw new Error(`"${file.name}" kon niet verkleind worden.`);
  }

  // Een PNG met doorzichtige delen wordt anders zwart in een JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(beeld.bron, 0, 0, width, height);
  beeld.vrijgeven();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error(`"${file.name}" kon niet verkleind worden.`);

  return new File([blob], alsJpg(file.name), { type: "image/jpeg" });
}
