"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/account";

const inputClass =
  "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400";

export default function ForgotPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  // Bewust ook na een geslaagde aanvraag hetzelfde scherm: pas als de boodschap
  // er staat, weet de bezoeker dat er iets gebeurd is — zonder te verklappen of
  // dat adres bestaat.
  if (state?.success) {
    return (
      <div>
        <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      <p className="text-sm text-white/70">
        Vul je e-mailadres in. We sturen je een link waarmee je een nieuw wachtwoord kan instellen.
      </p>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-white/80">
          E-mailadres
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          placeholder="naam@voorbeeld.be"
          autoComplete="email"
          className={inputClass}
        />
        {state && !state.success && state.fieldErrors?.email && (
          <p className="mt-1 text-xs text-red-300">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      {state && !state.success && state.error && (
        <p className="text-sm text-red-300">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl border border-[#2d6a4f] bg-[#1b4332] py-3 font-bold text-white shadow-lg transition-all hover:bg-[#14332a] disabled:opacity-50"
      >
        {isPending ? "Even geduld..." : "Stuur me een link"}
      </button>
    </form>
  );
}
