/**
 * Een geüploade .eml-mail leesbaar maken in de applicatie (Story 10.41).
 *
 * De body van een mail is niet-vertrouwde HTML van buitenaf. Twee lagen bescherming:
 *  1. hier: scripts, event-handlers, javascript:-links, iframes/forms/objecten eruit;
 *  2. in de UI: het document draait in een `<iframe sandbox>` zonder scriptrechten.
 *
 * Alles hieronder is puur (geen I/O), zodat het los getest kan worden. Het parsen
 * van het MIME-formaat zelf gebeurt met `postal-mime` in de API-route.
 */

export interface EmailAddressLike {
  name?: string | null;
  address?: string | null;
}

export interface InlineAttachment {
  contentId?: string | null;
  mimeType?: string | null;
  contentBase64: string;
}

/** Tags die nooit uit een mail mogen komen (inhoud inbegrepen). */
const FORBIDDEN_WITH_CONTENT = /<(script|iframe|object|embed|applet|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
/** Idem, maar zelfsluitend of zonder afsluitende tag. */
const FORBIDDEN_STANDALONE = /<\/?(script|iframe|object|embed|applet|form|link|meta|base)\b[^>]*>/gi;
/** `onclick="…"`, `onerror='…'`, `onload=…` */
const EVENT_HANDLERS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
/** `javascript:` / `vbscript:` in href, src, … */
const SCRIPT_URLS = /(?:javascript|vbscript)\s*:/gi;

/** Maakt de HTML-body van een mail veilig om te tonen. */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(FORBIDDEN_WITH_CONTENT, "")
    .replace(FORBIDDEN_STANDALONE, "")
    .replace(EVENT_HANDLERS, "")
    .replace(SCRIPT_URLS, "#");
}

/**
 * Outlook verwijst naar ingesloten beelden (logo's, screenshots in de handtekening)
 * met `src="cid:…"`. Zonder vervanging toont de mail gebroken afbeeldingen.
 */
export function inlineCidImages(html: string, attachments: InlineAttachment[] = []): string {
  if (!html || attachments.length === 0) return html || "";

  const byId = new Map<string, InlineAttachment>();
  for (const att of attachments) {
    const id = (att.contentId ?? "").replace(/^<|>$/g, "").trim().toLowerCase();
    if (id) byId.set(id, att);
  }
  if (byId.size === 0) return html;

  return html.replace(/(["'])cid:([^"']+)\1/gi, (match, quote: string, rawId: string) => {
    const att = byId.get(rawId.trim().toLowerCase());
    if (!att) return match;
    return `${quote}data:${att.mimeType || "application/octet-stream"};base64,${att.contentBase64}${quote}`;
  });
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Platte-tekstmail → veilige HTML met behoud van de regelindeling. */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  return escapeHtml(text).replace(/\r\n|\r|\n/g, "<br>");
}

/** "Naam <adres>, Naam2 <adres2>" — voor de Van/Aan/Cc-regels boven de mail. */
export function formatAddresses(addresses: EmailAddressLike[] | null | undefined): string {
  if (!addresses?.length) return "";
  return addresses
    .map((a) => {
      const name = a.name?.trim();
      const address = a.address?.trim();
      if (name && address) return `${name} <${address}>`;
      return address || name || "";
    })
    .filter(Boolean)
    .join(", ");
}

/** Basisopmaak zodat een mail zonder eigen stijlen leesbaar blijft. */
const DOCUMENT_STYLES = `
  :root { color-scheme: light; }
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #111827;
    background: #ffffff;
    overflow-wrap: break-word;
  }
  img, table { max-width: 100%; }
  img { height: auto; }
  table { border-collapse: collapse; }
  blockquote {
    margin: 0 0 0 8px;
    padding-left: 12px;
    border-left: 3px solid #d1d5db;
    color: #4b5563;
  }
  a { color: #047857; }
`;

export interface EmailBodySource {
  html?: string | null;
  text?: string | null;
  attachments?: InlineAttachment[];
}

/**
 * Bouwt het volledige document voor het `srcdoc` van de sandbox-iframe.
 * HTML heeft voorrang; anders de platte tekst; anders een nette melding.
 */
export function buildEmailDocument({ html, text, attachments = [] }: EmailBodySource): string {
  let body: string;
  if (html && html.trim()) {
    body = inlineCidImages(sanitizeEmailHtml(html), attachments);
  } else if (text && text.trim()) {
    body = plainTextToHtml(text);
  } else {
    body = `<p style="color:#6b7280">Deze mail bevat geen leesbare inhoud (mogelijk enkel bijlagen).</p>`;
  }

  // `<base target="_blank">`: links uit de mail openen in een nieuw tabblad
  // i.p.v. in het ingesloten kader.
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank"><style>${DOCUMENT_STYLES}</style></head><body>${body}</body></html>`;
}
