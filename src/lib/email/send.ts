import { getResend } from "./index";

const DEFAULT_FROM_NAME = "Dierenasiel Ninove";

/**
 * Afzender uit configuratie, in het formaat dat Resend verwacht.
 * Env-namen volgen de conventie van de andere Bonanzai-projecten
 * (`FROM_EMAIL` / `FROM_NAME` / `REPLY_TO_EMAIL`).
 */
export function resolveFrom(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const email = env.FROM_EMAIL?.trim();
  if (!email) return null;
  const name = env.FROM_NAME?.trim() || DEFAULT_FROM_NAME;
  return `${name} <${email}>`;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  /** Laat leeg om FROM_EMAIL/FROM_NAME te gebruiken. */
  from?: string;
  /** Platte tekst naast de HTML — mailclients die geen HTML tonen, en filters, houden daarvan. */
  text?: string;
  /** Laat leeg om REPLY_TO_EMAIL te gebruiken. */
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Verstuurt één mail. Throwt nooit — de beller krijgt altijd een resultaat terug
 * en beslist zelf of een mislukte mail erg genoeg is om de handeling te stoppen.
 *
 * Let op: `error` kan een ontvanger noemen. Geef hem nooit ongefilterd door aan
 * een publiek scherm.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "Email service niet geconfigureerd (RESEND_API_KEY ontbreekt)." };
  }

  const from = params.from ?? resolveFrom();
  if (!from) {
    return { success: false, error: "Afzender niet geconfigureerd (FROM_EMAIL ontbreekt)." };
  }

  const replyTo = params.replyTo ?? process.env.REPLY_TO_EMAIL?.trim();

  try {
    const { data, error } = await resend.emails.send({
      to: Array.isArray(params.to) ? params.to : [params.to],
      from,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
