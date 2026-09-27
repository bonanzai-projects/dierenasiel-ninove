"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { ibnDossierEmail } from "@/lib/email/templates/ibn-dossier";
import { buildIbnDossierDocument, type IbnDossierDocument } from "@/lib/animals/ibn-dossier-document";
import { IBN_DOSSIER_MAILED_ACTION } from "@/lib/animals/ibn-dossier";
import { parseIbnMailInput, type IbnMailInput } from "@/lib/validations/ibn-dossier";
import type { ActionResult } from "@/types";

const MAIL_MISLUKT = "De mail kon niet verstuurd worden. Probeer later opnieuw of download het dossier en mail het zelf.";

/**
 * Story 10.72 — het IBN-dossier van één dier mailen naar politie of
 * Dierenwelzijn (Sven). Antwoorden gaan naar wie het verstuurt: zonder
 * `replyTo` zou een antwoord bij de afzender van de app (Bonanzai) landen.
 */
export async function emailIbnDossier(animalId: number, input: IbnMailInput): Promise<ActionResult> {
  const permCheck = await requirePermission("animal:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const invoer = parseIbnMailInput(input);
  if (!invoer.ok) return { success: false, error: invoer.error };

  let dossier: IbnDossierDocument | null;
  try {
    dossier = await buildIbnDossierDocument(animalId);
  } catch (err) {
    console.error("emailIbnDossier: dossier opbouwen mislukt:", err);
    return { success: false, error: "Het IBN-dossier kon niet opgebouwd worden. Probeer later opnieuw." };
  }
  if (!dossier) return { success: false, error: "Dit dier heeft geen IBN-dossier." };

  const session = await getSession();
  const mail = ibnDossierEmail({
    animalName: dossier.animalName,
    speciesLabel: dossier.speciesLabel,
    dossierNr: dossier.dossierNr,
    pvNr: dossier.pvNr,
    message: invoer.message,
    senderName: session?.name ?? "",
  });

  const result = await sendEmail({
    to: invoer.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(session?.email ? { replyTo: session.email } : {}),
    attachments: [{ filename: dossier.filename, content: dossier.content }],
  });

  if (!result.success) {
    // De Resend-fout kan een adres bevatten; die blijft server-side.
    console.error("emailIbnDossier: versturen mislukt:", result.error);
    return { success: false, error: MAIL_MISLUKT };
  }

  await logAudit(IBN_DOSSIER_MAILED_ACTION, "animal", animalId, null, {
    to: invoer.to,
    filename: dossier.filename,
    resendId: result.id,
  });
  revalidatePath(`/beheerder/dieren/${animalId}`);

  return {
    success: true,
    data: undefined,
    message: `Het IBN-dossier is gemaild naar ${invoer.to.join(", ")}.`,
  };
}
