import PostalMime from "postal-mime";
import {
  buildEmailDocument,
  formatAddresses,
  type EmailAddressLike,
  type InlineAttachment,
} from "./eml-view";

/**
 * Een .eml leesbaar maken in de applicatie (story 10.41, zwerfkatten), sinds
 * story 10.74 gedeeld met de berichten na adoptie. De routes halen het bestand
 * op (elk uit hun eigen opslag) en geven de ruwe bytes hier door.
 */

/** Ingesloten beelden (handtekening, logo) komen als data-URL mee in het document. */
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

/** Alleen inline tonen wat een browser veilig kan renderen; de rest downloadt. */
const INLINE_TYPES = /^(image\/|application\/pdf$|text\/plain$)/i;

interface ParsedAttachment {
  filename?: string | null;
  mimeType?: string | null;
  contentId?: string | null;
  disposition?: string | null;
  content?: ArrayBuffer | Uint8Array | string | null;
}

/** Wat het leesvenster toont: kopgegevens los, de body als één HTML-document voor een `<iframe sandbox srcdoc>`. */
export interface EmlView {
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string | null;
  document: string;
  attachments: { index: number; filename: string; mimeType: string; size: number }[];
}

function byteLength(content: ParsedAttachment["content"]): number {
  if (!content) return 0;
  if (typeof content === "string") return content.length;
  if (content instanceof Uint8Array) return content.byteLength;
  return content.byteLength;
}

function toBuffer(content: ParsedAttachment["content"]): Buffer {
  if (!content) return Buffer.alloc(0);
  if (typeof content === "string") return Buffer.from(content, "binary");
  return Buffer.from(content instanceof Uint8Array ? content : new Uint8Array(content));
}

/** postal-mime geeft `from` als één adres en `to`/`cc` als lijst. */
function asList(value: EmailAddressLike | EmailAddressLike[] | null | undefined): EmailAddressLike[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Gooit als de mail niet te lezen is; de route vertaalt dat naar een nette melding. */
export async function readEmlView(raw: ArrayBuffer): Promise<EmlView> {
  const parsed = await new PostalMime().parse(raw);
  const allAttachments: ParsedAttachment[] = parsed.attachments ?? [];

  // Ingesloten beelden (cid:) horen bij de body; echte bijlagen komen apart in de lijst.
  const inline: InlineAttachment[] = allAttachments
    .filter((a) => a.contentId && byteLength(a.content) <= MAX_INLINE_IMAGE_BYTES)
    .map((a) => ({
      contentId: a.contentId,
      mimeType: a.mimeType,
      contentBase64: toBuffer(a.content).toString("base64"),
    }));

  const attachments = allAttachments
    .map((a, index) => ({ a, index }))
    .filter(({ a }) => !a.contentId || a.disposition === "attachment")
    .map(({ a, index }) => ({
      index,
      filename: a.filename || `bijlage-${index + 1}`,
      mimeType: a.mimeType || "application/octet-stream",
      size: byteLength(a.content),
    }));

  return {
    subject: parsed.subject || "(geen onderwerp)",
    from: formatAddresses(asList(parsed.from as EmailAddressLike | undefined)),
    to: formatAddresses(parsed.to as EmailAddressLike[] | undefined),
    cc: formatAddresses(parsed.cc as EmailAddressLike[] | undefined),
    date: parsed.date ?? null,
    document: buildEmailDocument({ html: parsed.html, text: parsed.text, attachments: inline }),
    attachments,
  };
}

export interface EmlAttachment {
  bytes: Buffer;
  mimeType: string;
  /** Veilig voor een Content-Disposition-header. */
  filename: string;
  disposition: "inline" | "attachment";
}

/** Eén bijlage uit een .eml (op volgnummer); `null` als ze niet bestaat. */
export async function readEmlAttachment(raw: ArrayBuffer, index: number): Promise<EmlAttachment | null> {
  const parsed = await new PostalMime().parse(raw);
  const part = parsed.attachments?.[index];
  if (!part) return null;

  const mimeType = part.mimeType || "application/octet-stream";
  return {
    bytes: toBuffer(part.content),
    mimeType,
    filename: (part.filename || `bijlage-${index + 1}`).replace(/["\\]/g, "_"),
    disposition: INLINE_TYPES.test(mimeType) ? "inline" : "attachment",
  };
}
