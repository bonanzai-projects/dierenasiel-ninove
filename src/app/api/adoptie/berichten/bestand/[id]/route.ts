import { NextRequest, NextResponse } from "next/server";
import { getAdoptionUpdateFile } from "@/lib/queries/adoption-updates";
import { getPrivateFile } from "@/lib/adoption-updates/storage";
import { adoptionRouteAccess } from "@/lib/adoption-updates/http";
import { contentDisposition } from "@/lib/http/content-disposition";
import { wantsPdfDownload } from "@/lib/pdf/disposition";

/**
 * Story 10.74 — een bestand na adoptie openen. Enkel met login en
 * `adoption:read`; het komt uit de PRIVATE opslag en gaat nooit in een gedeelde
 * cache. Foto's en PDF tonen, een mail downloadt (lezen gaat via `/mail`).
 */

const TONEN = /^(image\/(jpeg|png|webp)|application\/pdf)$/;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const geweigerd = await adoptionRouteAccess("adoption:read");
  if (geweigerd) return geweigerd;

  const { id } = await params;
  const fileId = Number(id);
  if (!fileId || isNaN(fileId)) return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });

  const rij = await getAdoptionUpdateFile(fileId);
  if (!rij) return NextResponse.json({ error: "Bestand niet gevonden" }, { status: 404 });

  const bestand = await getPrivateFile(rij.pathname);
  if (!bestand) return NextResponse.json({ error: "Bestand niet gevonden" }, { status: 404 });

  const tonen = TONEN.test(rij.mimeType) && !wantsPdfDownload(request.nextUrl.searchParams);

  return new NextResponse(bestand.stream, {
    headers: {
      "Content-Type": rij.mimeType,
      "Content-Disposition": contentDisposition(tonen ? "inline" : "attachment", rij.fileName),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
