"use client";

import { useActionState, useEffect, useRef } from "react";
import { changeOwnPassword } from "@/lib/actions/account";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changeOwnPassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const veldFout = (veld: string) =>
    state && !state.success ? state.fieldErrors?.[veld]?.[0] : undefined;

  return (
    <form ref={formRef} action={formAction} noValidate className="max-w-md space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-gray-700">
          Huidig wachtwoord
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
        {veldFout("currentPassword") && (
          <p className="mt-1 text-xs text-red-600">{veldFout("currentPassword")}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Nieuw wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        {veldFout("password") && (
          <p className="mt-1 text-xs text-red-600">{veldFout("password")}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
          Herhaal nieuw wachtwoord
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        {veldFout("confirm") && (
          <p className="mt-1 text-xs text-red-600">{veldFout("confirm")}</p>
        )}
      </div>

      {state && !state.success && state.error && state.error !== "Validatie mislukt" && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {state?.success && state.message && (
        <p className="text-sm text-emerald-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#1b4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
      >
        {isPending ? "Bezig..." : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}
