import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import PostalMime from "postal-mime";
import { db } from "@/lib/db";
import { strayCatCampaignAttachments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

/**
 * Story 10.41 — een bijlage die ín een geüploade .eml zit openen (bv. een foto of
 * plan van de gemeente), zonder de mail eerst te moeten downloaden.
 */

/** Alleen inline tonen wat een browser veilig kan renderen; de rest downloadt. */
const INLINE_TYPES = /^(image\/|application\/pdf$|text\/plain$)/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  if (!hasPermission(session.role, "stray_cat:read")) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }

  const { id, index } = await params;
  const attachmentId = Number(id);
  const partIndex = Number(index);
  if (!attachmentId || isNaN(attachmentId) || isNaN(partIndex) || partIndex < 0) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(strayCatCampaignAttachments)
    .where(eq(strayCatCampaignAttachments.id, attachmentId))
    .limit(1);

  const record = rows[0];
  if (!record) {
    return NextResponse.json({ error: "Mail niet gevonden" }, { status: 404 });
  }

  try {
    const response = await fetch(record.blobUrl);
    if (!response.ok) throw new Error(`blob fetch ${response.status}`);

    const parsed = await new PostalMime().parse(await response.arrayBuffer());
    const part = parsed.attachments?.[partIndex];
    if (!part) {
      return NextResponse.json({ error: "Bijlage niet gevonden" }, { status: 404 });
    }

    const content = part.content;
    const bytes =
      typeof content === "string"
        ? Buffer.from(content, "binary")
        : Buffer.from(content instanceof Uint8Array ? content : new Uint8Array(content ?? 0));

    const mimeType = part.mimeType || "application/octet-stream";
    const filename = (part.filename || `bijlage-${partIndex + 1}`).replace(/["\\]/g, "_");
    const disposition = INLINE_TYPES.test(mimeType) ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        // Bijlagen van een campagne zijn niet publiek: nooit in een gedeelde cache.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("eml attachment: ophalen mislukt:", err);
    return NextResponse.json({ error: "Kon de bijlage niet openen." }, { status: 502 });
  }
}
