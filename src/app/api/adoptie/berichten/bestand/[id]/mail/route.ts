import { NextResponse } from "next/server";
import { getAdoptionUpdateFile } from "@/lib/queries/adoption-updates";
import { readPrivateFile } from "@/lib/adoption-updates/storage";
import { adoptionRouteAccess } from "@/lib/adoption-updates/http";
import { readEmlView } from "@/lib/email/eml-read";

/**
 * Story 10.74 — een doorgestuurde mail van een adoptant leesbaar in het programma,
 * zoals de mails bij zwerfkatten (10.41). Het document gaat in een `<iframe sandbox>`.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const geweigerd = await adoptionRouteAccess("adoption:read");
  if (geweigerd) return geweigerd;

  const { id } = await params;
  const fileId = Number(id);
  if (!fileId || isNaN(fileId)) return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });

  const rij = await getAdoptionUpdateFile(fileId);
  if (!rij) return NextResponse.json({ error: "Mail niet gevonden" }, { status: 404 });
  if (rij.mimeType !== "message/rfc822") return NextResponse.json({ error: "Dit bestand is geen mail" }, { status: 400 });

  const ruw = await readPrivateFile(rij.pathname);
  if (!ruw) return NextResponse.json({ error: "Mail niet gevonden" }, { status: 404 });

  try {
    return NextResponse.json(await readEmlView(ruw), { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("adoptie-berichten mail: lezen mislukt:", err);
    return NextResponse.json(
      { error: "Deze mail kon niet gelezen worden. Download hem om hem in je mailprogramma te openen." },
      { status: 422 },
    );
  }
}
