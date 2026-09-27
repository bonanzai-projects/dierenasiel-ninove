import { z } from "zod";

/**
 * Story 10.72 — naar wie gaat het IBN-dossier? Eén veld met één of meer adressen
 * (politie én Dierenwelzijn samen kan), gescheiden door komma, puntkomma of spatie.
 */

export const IBN_MAIL_MAX_RECIPIENTS = 5;
export const IBN_MAIL_MAX_MESSAGE = 2000;

const emailSchema = z.email();

export type IbnMailInput = { recipients: string; message: string };

export function parseIbnMailInput(
  input: IbnMailInput,
): { ok: true; to: string[]; message: string } | { ok: false; error: string } {
  const adressen = [
    ...new Set(
      (input.recipients ?? "")
        .split(/[,;\s]+/)
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (adressen.length === 0) return { ok: false, error: "Vul minstens één e-mailadres in." };
  if (adressen.length > IBN_MAIL_MAX_RECIPIENTS) {
    return { ok: false, error: `Hooguit ${IBN_MAIL_MAX_RECIPIENTS} e-mailadressen tegelijk.` };
  }
  const fout = adressen.find((a) => !emailSchema.safeParse(a).success);
  if (fout) return { ok: false, error: `"${fout}" is geen geldig e-mailadres.` };

  const message = (input.message ?? "").trim();
  if (message.length > IBN_MAIL_MAX_MESSAGE) {
    return { ok: false, error: `Het bericht is te lang (max. ${IBN_MAIL_MAX_MESSAGE} tekens).` };
  }

  return { ok: true, to: adressen, message };
}
