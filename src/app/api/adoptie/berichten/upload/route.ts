import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adoptionUpdateFiles } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { getAdoptionUpdateWithFiles } from "@/lib/queries/adoption-updates";
import { putPrivateFile } from "@/lib/adoption-updates/storage";
import { adoptionRouteAccess } from "@/lib/adoption-updates/http";
import {
  ADOPTION_UPDATE_MAX_FILE_BYTES,
  ADOPTION_UPDATE_MAX_FILES,
  adoptionFilePathname,
  classifyAdoptionFile,
} from "@/lib/adoption-updates/rules";

/**
 * Story 10.74 — één bestand bij een bericht na adoptie, naar de PRIVATE opslag.
 * Een route i.p.v. een Server Action: die aanvaardt maar 1 MB. Foto's zijn in de
 * browser al verkleind, dus ze blijven onder de 4,5 MB die Vercel toelaat.
 */

const fout = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const geweigerd = await adoptionRouteAccess("adoption:write");
  if (geweigerd) return geweigerd;

  const formData = await request.formData();
  const file = formData.get("file");
  const updateId = Number(formData.get("updateId"));

  if (!updateId || isNaN(updateId)) return fout("Ongeldig bericht.", 400);
  if (!(file instanceof File)) return fout("Er is geen bestand meegestuurd.", 400);

  const bericht = await getAdoptionUpdateWithFiles(updateId);
  if (!bericht) return fout("Bericht niet gevonden.", 404);
  if (bericht.pathnames.length >= ADOPTION_UPDATE_MAX_FILES) {
    return fout(`Hooguit ${ADOPTION_UPDATE_MAX_FILES} bestanden per bericht.`, 400);
  }

  const soort = classifyAdoptionFile(file.name);
  if (!soort) return fout("Enkel foto's (JPG, PNG, WebP), doorgestuurde mails (.eml) of PDF.", 400);
  if (file.size === 0) return fout(`"${file.name}" is leeg.`, 400);
  if (file.size > ADOPTION_UPDATE_MAX_FILE_BYTES) {
    return fout(`"${file.name}" is te groot (max. ${ADOPTION_UPDATE_MAX_FILE_BYTES / 1024 / 1024} MB).`, 400);
  }

  let pathname: string;
  try {
    ({ pathname } = await putPrivateFile(
      adoptionFilePathname(bericht.animalId, updateId, file.name),
      file,
      soort.mimeType,
    ));
  } catch (err) {
    console.error("adoptie-berichten upload: opslaan mislukt:", err);
    return fout("Het bestand kon niet bewaard worden. Probeer opnieuw.", 502);
  }

  const fileName = file.name.slice(0, 255);
  const [rij] = await db
    .insert(adoptionUpdateFiles)
    .values({ updateId, pathname, fileName, mimeType: soort.mimeType, fileSize: file.size })
    .returning();

  await logAudit("adoption_update.file_add", "animal", bericht.animalId, null, {
    updateId,
    fileId: rij.id,
    fileName,
  });

  return NextResponse.json({ id: rij.id, fileName, kind: soort.kind });
}
