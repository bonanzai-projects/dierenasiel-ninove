import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { strayCatCampaignAttachments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { readEmlView } from "@/lib/email/eml-read";

/**
 * Story 10.41 — een geüploade .eml leesbaar maken in de applicatie i.p.v. hem
 * te moeten downloaden en in een mailclient te openen (Sven-feedback 2026-07-26).
 *
 * Levert de kopgegevens los (zodat de UI ze in de huisstijl toont) en de body als
 * één kant-en-klaar HTML-document voor een `<iframe sandbox srcdoc>`. Het lezen
 * zelf zit sinds story 10.74 in `@/lib/email/eml-read` (gedeeld met adoptie).
 */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  if (!hasPermission(session.role, "stray_cat:read")) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }

  const { id } = await params;
  const attachmentId = Number(id);
  if (!attachmentId || isNaN(attachmentId)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(strayCatCampaignAttachments)
    .where(eq(strayCatCampaignAttachments.id, attachmentId))
    .limit(1);

  const attachment = rows[0];
  if (!attachment) {
    return NextResponse.json({ error: "Mail niet gevonden" }, { status: 404 });
  }

  let raw: ArrayBuffer;
  try {
    const response = await fetch(attachment.blobUrl);
    if (!response.ok) throw new Error(`blob fetch ${response.status}`);
    raw = await response.arrayBuffer();
  } catch (err) {
    console.error("eml view: ophalen mislukt:", err);
    return NextResponse.json(
      { error: "Kon de mail niet ophalen. Probeer het later opnieuw." },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(await readEmlView(raw));
  } catch (err) {
    console.error("eml view: parsen mislukt:", err);
    return NextResponse.json(
      { error: "Deze mail kon niet gelezen worden. Download hem om hem in je mailprogramma te openen." },
      { status: 422 },
    );
  }
}
