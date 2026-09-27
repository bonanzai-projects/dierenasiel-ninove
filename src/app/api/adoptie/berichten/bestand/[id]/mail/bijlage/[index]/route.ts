import { NextResponse } from "next/server";
import { getAdoptionUpdateFile } from "@/lib/queries/adoption-updates";
import { readPrivateFile } from "@/lib/adoption-updates/storage";
import { adoptionRouteAccess, contentDisposition } from "@/lib/adoption-updates/http";
import { readEmlAttachment } from "@/lib/email/eml-read";

/**
 * Story 10.74 — een bijlage die ín een doorgestuurde mail van een adoptant zit
 * (vaak een foto), openen zonder de mail te downloaden.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const geweigerd = await adoptionRouteAccess("adoption:read");
  if (geweigerd) return geweigerd;

  const { id, index } = await params;
  const fileId = Number(id);
  const partIndex = Number(index);
  if (!fileId || isNaN(fileId) || isNaN(partIndex) || partIndex < 0) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  const rij = await getAdoptionUpdateFile(fileId);
  if (!rij || rij.mimeType !== "message/rfc822") {
    return NextResponse.json({ error: "Mail niet gevonden" }, { status: 404 });
  }

  const ruw = await readPrivateFile(rij.pathname);
  if (!ruw) return NextResponse.json({ error: "Mail niet gevonden" }, { status: 404 });

  try {
    const part = await readEmlAttachment(ruw, partIndex);
    if (!part) return NextResponse.json({ error: "Bijlage niet gevonden" }, { status: 404 });

    return new NextResponse(new Uint8Array(part.bytes), {
      headers: {
        "Content-Type": part.mimeType,
        // Een naam uit een mail kan tekens buiten Latin-1 bevatten (bv. ’); die mogen niet rauw in een header.
        "Content-Disposition": contentDisposition(part.disposition, part.filename),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("adoptie-berichten mailbijlage: lezen mislukt:", err);
    return NextResponse.json({ error: "Kon de bijlage niet openen." }, { status: 502 });
  }
}
