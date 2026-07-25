import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import PostalMime from "postal-mime";
import { db } from "@/lib/db";
import { strayCatCampaignAttachments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  buildEmailDocument,
  formatAddresses,
  type EmailAddressLike,
  type InlineAttachment,
} from "@/lib/email/eml-view";

/**
 * Story 10.41 — een geüploade .eml leesbaar maken in de applicatie i.p.v. hem
 * te moeten downloaden en in een mailclient te openen (Sven-feedback 2026-07-26).
 *
 * Levert de kopgegevens los (zodat de UI ze in de huisstijl toont) en de body als
 * één kant-en-klaar HTML-document voor een `<iframe sandbox srcdoc>`.
 */

/** Ingesloten beelden (handtekening, logo) komen als data-URL mee in het document. */
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

interface ParsedAttachment {
  filename?: string | null;
  mimeType?: string | null;
  contentId?: string | null;
  disposition?: string | null;
  content?: ArrayBuffer | Uint8Array | string | null;
}

function byteLength(content: ParsedAttachment["content"]): number {
  if (!content) return 0;
  if (typeof content === "string") return content.length;
  if (content instanceof Uint8Array) return content.byteLength;
  return content.byteLength;
}

function toBase64(content: ParsedAttachment["content"]): string {
  if (!content) return "";
  if (typeof content === "string") return Buffer.from(content, "binary").toString("base64");
  const view = content instanceof Uint8Array ? content : new Uint8Array(content);
  return Buffer.from(view).toString("base64");
}

/** postal-mime geeft `from` als één adres en `to`/`cc` als lijst. */
function asList(value: EmailAddressLike | EmailAddressLike[] | null | undefined): EmailAddressLike[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

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
    const parsed = await new PostalMime().parse(raw);
    const allAttachments: ParsedAttachment[] = parsed.attachments ?? [];

    // Ingesloten beelden (cid:) horen bij de body; echte bijlagen komen apart in de lijst.
    const inline: InlineAttachment[] = allAttachments
      .filter((a) => a.contentId && byteLength(a.content) <= MAX_INLINE_IMAGE_BYTES)
      .map((a) => ({
        contentId: a.contentId,
        mimeType: a.mimeType,
        contentBase64: toBase64(a.content),
      }));

    const visibleAttachments = allAttachments
      .map((a, index) => ({ a, index }))
      .filter(({ a }) => !a.contentId || a.disposition === "attachment")
      .map(({ a, index }) => ({
        index,
        filename: a.filename || `bijlage-${index + 1}`,
        mimeType: a.mimeType || "application/octet-stream",
        size: byteLength(a.content),
      }));

    return NextResponse.json({
      subject: parsed.subject || "(geen onderwerp)",
      from: formatAddresses(asList(parsed.from as EmailAddressLike | undefined)),
      to: formatAddresses(parsed.to as EmailAddressLike[] | undefined),
      cc: formatAddresses(parsed.cc as EmailAddressLike[] | undefined),
      date: parsed.date ?? null,
      document: buildEmailDocument({
        html: parsed.html,
        text: parsed.text,
        attachments: inline,
      }),
      attachments: visibleAttachments,
    });
  } catch (err) {
    console.error("eml view: parsen mislukt:", err);
    return NextResponse.json(
      { error: "Deze mail kon niet gelezen worden. Download hem om hem in je mailprogramma te openen." },
      { status: 422 },
    );
  }
}
