"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setPasswordWithToken } from "@/lib/actions/account";
import { BACKOFFICE_ROLES } from "@/lib/constants";

const inputClass =
  "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400";

/** Waar iemand terechtkomt zodra zijn wachtwoord staat. */
export function landingsPagina(role: string): string {
  if (BACKOFFICE_ROLES.includes(role as (typeof BACKOFFICE_ROLES)[number])) return "/beheerder";
  if (role === "wandelaar") return "/wandelaar";
  return "/";
}

export default function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(setPasswordWithToken, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push(landingsPagina(state.data.role));
    }
  }, [state, router]);

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <p className="text-sm text-white/70">
        Kies een wachtwoord van minstens 6 tekens. Je blijft daarna meteen ingelogd.
      </p>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-white/80">
          Nieuw wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
        />
        {state && !state.success && state.fieldErrors?.password && (
          <p className="mt-1 text-xs text-red-300">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-white/80">
          Herhaal je wachtwoord
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
        />
        {state && !state.success && state.fieldErrors?.confirm && (
          <p className="mt-1 text-xs text-red-300">{state.fieldErrors.confirm[0]}</p>
        )}
      </div>

      {state && !state.success && state.error && state.error !== "Validatie mislukt" && (
        <p className="text-sm text-red-300">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-emerald-200">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl border border-[#2d6a4f] bg-[#1b4332] py-3 font-bold text-white shadow-lg transition-all hover:bg-[#14332a] disabled:opacity-50"
      >
        {isPending ? "Even geduld..." : "Wachtwoord instellen"}
      </button>
    </form>
  );
}
