/**
 * Gedeelde opmaak voor de accountmails. Bewust met een `<table>` en kleuren die
 * letterlijk in het bestand staan: mailclients kennen geen CSS-variabelen en de
 * oudere onder hen (Outlook) leggen een layout met flexbox of grid gewoon naast
 * zich neer.
 */

const GREEN = "#1b4332";
const INK = "#333333";
const MUTED = "#9ca3af";
const BORDER = "#e5e7eb";

/** Alles wat van buiten komt, gaat hierdoor voor het in de HTML belandt. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutParams {
  /** Titel bovenaan de mail. */
  heading: string;
  /** Alinea's onder de titel — al ontsnapt of bewust als HTML bedoeld. */
  paragraphs: string[];
  buttonLabel: string;
  /** Al ontsnapte URL. */
  buttonUrl: string;
  /** Kleine tekst onderaan, na de scheidingslijn. */
  footnote: string;
}

export function accountEmailHtml(params: LayoutParams): string {
  const body = params.paragraphs
    .map((p) => `      <p style="margin: 0 0 14px; line-height: 1.6;">${p}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid ${BORDER}; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; color: ${INK};">
          <tr>
            <td style="padding: 28px 32px;">
              <h2 style="margin: 0 0 16px; color: ${GREEN}; font-size: 20px;">${params.heading}</h2>
${body}
              <p style="margin: 24px 0;">
                <a href="${params.buttonUrl}" style="display: inline-block; background-color: ${GREEN}; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 12px 26px; border-radius: 8px;">${params.buttonLabel}</a>
              </p>
              <p style="margin: 0 0 4px; font-size: 13px; color: ${MUTED};">Werkt de knop niet? Kopieer dan deze link naar je browser:</p>
              <p style="margin: 0; font-size: 13px; word-break: break-all;"><a href="${params.buttonUrl}" style="color: ${GREEN};">${params.buttonUrl}</a></p>
              <hr style="border: none; border-top: 1px solid ${BORDER}; margin: 24px 0 14px;">
              <p style="margin: 0; font-size: 12px; color: ${MUTED};">${params.footnote}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
