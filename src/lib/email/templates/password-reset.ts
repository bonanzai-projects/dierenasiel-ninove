import type { AccountEmail } from "./account-invite";
import { accountEmailHtml, escapeHtml } from "./layout";

interface PasswordResetParams {
  name: string;
  /** De volledige link naar het scherm om een wachtwoord in te stellen. */
  url: string;
}

export function passwordResetEmail(params: PasswordResetParams): AccountEmail {
  const name = escapeHtml(params.name);
  const url = escapeHtml(params.url);

  const html = accountEmailHtml({
    heading: `Hallo ${name},`,
    paragraphs: [
      "Je vroeg een nieuw wachtwoord aan voor de backoffice van Dierenasiel Ninove.",
      "Klik hieronder om er een in te stellen. De link is <strong>1 uur</strong> geldig en werkt één keer.",
    ],
    buttonLabel: "Nieuw wachtwoord instellen",
    buttonUrl: url,
    footnote:
      "Heb jij dit niet aangevraagd? Dan mag je deze mail negeren. Je huidige wachtwoord blijft gewoon werken.",
  });

  const text = [
    `Hallo ${params.name},`,
    "",
    "Je vroeg een nieuw wachtwoord aan voor de backoffice van Dierenasiel Ninove.",
    "Stel er een in via onderstaande link. De link is 1 uur geldig en werkt één keer.",
    "",
    params.url,
    "",
    "Heb jij dit niet aangevraagd? Dan mag je deze mail negeren — je huidige wachtwoord blijft werken.",
  ].join("\n");

  return { subject: "Nieuw wachtwoord voor Dierenasiel Ninove", html, text };
}
