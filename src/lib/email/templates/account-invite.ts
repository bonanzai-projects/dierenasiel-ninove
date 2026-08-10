import { accountEmailHtml, escapeHtml } from "./layout";

interface AccountInviteParams {
  name: string;
  /** De volledige link naar het scherm om een wachtwoord in te stellen. */
  url: string;
  /** Naam van wie de uitnodiging verstuurde — enkel als die gekend is. */
  invitedBy?: string;
}

export interface AccountEmail {
  subject: string;
  html: string;
  text: string;
}

export function accountInviteEmail(params: AccountInviteParams): AccountEmail {
  const name = escapeHtml(params.name);
  const url = escapeHtml(params.url);
  const door = params.invitedBy?.trim();

  const intro = door
    ? `${escapeHtml(door)} heeft een account voor je aangemaakt in de backoffice van Dierenasiel Ninove.`
    : `Er is een account voor je aangemaakt in de backoffice van Dierenasiel Ninove.`;

  const html = accountEmailHtml({
    heading: `Hallo ${name},`,
    paragraphs: [
      intro,
      "Kies zelf een wachtwoord — dan kan je meteen aan de slag.",
      "Deze link blijft <strong>7 dagen</strong> geldig en werkt één keer.",
    ],
    buttonLabel: "Wachtwoord instellen",
    buttonUrl: url,
    footnote:
      "Kreeg je deze mail onverwacht? Dan mag je ze negeren — zonder deze link gebeurt er niets.",
  });

  const introText = door
    ? `${door} heeft een account voor je aangemaakt in de backoffice van Dierenasiel Ninove.`
    : `Er is een account voor je aangemaakt in de backoffice van Dierenasiel Ninove.`;

  const text = [
    `Hallo ${params.name},`,
    "",
    introText,
    "Kies zelf een wachtwoord via onderstaande link — dan kan je meteen aan de slag.",
    "",
    params.url,
    "",
    "Deze link blijft 7 dagen geldig en werkt één keer.",
    "Kreeg je deze mail onverwacht? Dan mag je ze negeren.",
  ].join("\n");

  return { subject: "Je account voor Dierenasiel Ninove", html, text };
}
