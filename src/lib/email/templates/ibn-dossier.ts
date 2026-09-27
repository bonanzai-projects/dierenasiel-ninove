import { escapeHtml } from "./layout";
import { CONTACT, SITE_NAME } from "@/lib/constants";

/**
 * Story 10.72 — de begeleidende mail bij het IBN-dossier voor politie of
 * Dierenwelzijn. Het dossier zit als PDF in bijlage; geen link, want een
 * publieke link naar een juridisch dossier hoort niet in een mail.
 */

interface IbnDossierEmailParams {
  animalName: string;
  speciesLabel: string;
  dossierNr: string | null;
  pvNr: string | null;
  /** Eigen bericht van wie verstuurt; leeg = geen. */
  message: string;
  senderName: string;
}

export interface IbnDossierEmail {
  subject: string;
  html: string;
  text: string;
}

export function ibnDossierEmail(p: IbnDossierEmailParams): IbnDossierEmail {
  const nummers = [p.dossierNr && `dossier ${p.dossierNr}`, p.pvNr && `PV ${p.pvNr}`].filter(Boolean) as string[];
  const subject = `IBN-dossier ${p.animalName}${nummers.length ? ` — ${nummers.join(", ")}` : ""}`;

  const inleiding = `In bijlage vindt u het IBN-dossier van ${p.animalName} (${p.speciesLabel})${
    nummers.length ? `, ${nummers.join(", ")}` : ""
  }: de gegevens van het dier, de inbeslagname, het verwaarlozingsrapport en het gewichtsverloop.`;
  const afsluiter = `Vragen over dit dossier? Antwoord op deze mail, bel ${CONTACT.phone} of mail naar ${CONTACT.emailGeneral}.`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p style="line-height: 1.6;">Beste,</p>
  <p style="line-height: 1.6;">${escapeHtml(inleiding)}</p>
${p.message ? `  <p style="line-height: 1.6; white-space: pre-wrap; border-left: 3px solid #e5e7eb; padding-left: 12px;">${escapeHtml(p.message)}</p>\n` : ""}  <p style="line-height: 1.6;">${escapeHtml(afsluiter)}</p>
  <p>Met vriendelijke groeten,<br>${escapeHtml(p.senderName)}<br><strong>${escapeHtml(SITE_NAME)}</strong></p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 20px;">
  <p style="font-size: 12px; color: #9ca3af;">${escapeHtml(SITE_NAME)} · ${escapeHtml(CONTACT.phone)} · ${escapeHtml(CONTACT.website)}</p>
</body>
</html>`;

  const text = [
    "Beste,",
    "",
    inleiding,
    "",
    ...(p.message ? [p.message, ""] : []),
    afsluiter,
    "",
    "Met vriendelijke groeten,",
    p.senderName,
    SITE_NAME,
  ].join("\n");

  return { subject, html, text };
}
