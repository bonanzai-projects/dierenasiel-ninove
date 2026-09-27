"use client";

import { useActionState, useEffect, useRef } from "react";
import { createWalkerManual } from "@/lib/actions/walkers";

interface Props {
  onClose: () => void;
}

function hasFieldError(
  state: { success: false; error?: string; fieldErrors?: Record<string, string[]> } | null,
  field: string,
): boolean {
  if (!state || state.success !== false) return false;
  if (state.fieldErrors?.[field]?.length) return true;
  return false;
}

function getFieldError(
  state: { success: false; error?: string; fieldErrors?: Record<string, string[]> } | null,
  field: string,
): string | undefined {
  if (!state || state.success !== false) return undefined;
  return state.fieldErrors?.[field]?.[0];
}

function inputClassName(hasError: boolean): string {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
    hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
  }`;
}

function labelClassName(hasError: boolean): string {
  return `mb-1 block text-sm font-medium ${hasError ? "text-red-600" : "text-gray-700"}`;
}

export default function WalkerCreateForm({ onClose }: Props) {
  const [state, formAction, isPending] = useActionState(createWalkerManual, null);
  const formRef = useRef<HTMLFormElement>(null);

  const errorState = state && !state.success ? state : null;

  const fields = ["firstName", "lastName", "email", "phone", "dateOfBirth", "address"] as const;
  const fieldHasError = Object.fromEntries(
    fields.map((f) => [f, hasFieldError(errorState, f)]),
  ) as Record<(typeof fields)[number], boolean>;
  const fieldError = Object.fromEntries(
    fields.map((f) => [f, getFieldError(errorState, f)]),
  ) as Record<(typeof fields)[number], string | undefined>;

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[#1b4332]">
        Nieuwe wandelaar toevoegen
      </h2>

      <form ref={formRef} action={formAction} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wc-firstName" className={labelClassName(fieldHasError.firstName)}>
              Voornaam *
            </label>
            <input
              id="wc-firstName"
              name="firstName"
              type="text"
              required
              aria-invalid={fieldHasError.firstName || undefined}
              className={inputClassName(fieldHasError.firstName)}
            />
            {fieldError.firstName && (
              <p className="mt-1 text-sm text-red-600">{fieldError.firstName}</p>
            )}
          </div>
          <div>
            <label htmlFor="wc-lastName" className={labelClassName(fieldHasError.lastName)}>
              Achternaam *
            </label>
            <input
              id="wc-lastName"
              name="lastName"
              type="text"
              required
              aria-invalid={fieldHasError.lastName || undefined}
              className={inputClassName(fieldHasError.lastName)}
            />
            {fieldError.lastName && (
              <p className="mt-1 text-sm text-red-600">{fieldError.lastName}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wc-email" className={labelClassName(fieldHasError.email)}>
              E-mail *
            </label>
            <input
              id="wc-email"
              name="email"
              type="email"
              required
              aria-invalid={fieldHasError.email || undefined}
              className={inputClassName(fieldHasError.email)}
            />
            {fieldError.email && (
              <p className="mt-1 text-sm text-red-600">{fieldError.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="wc-phone" className={labelClassName(fieldHasError.phone)}>
              Telefoon *
            </label>
            <input
              id="wc-phone"
              name="phone"
              type="tel"
              required
              aria-invalid={fieldHasError.phone || undefined}
              className={inputClassName(fieldHasError.phone)}
            />
            {fieldError.phone && (
              <p className="mt-1 text-sm text-red-600">{fieldError.phone}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wc-dateOfBirth" className={labelClassName(fieldHasError.dateOfBirth)}>
              Geboortedatum *
            </label>
            <input
              id="wc-dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              aria-invalid={fieldHasError.dateOfBirth || undefined}
              className={inputClassName(fieldHasError.dateOfBirth)}
            />
            {fieldError.dateOfBirth && (
              <p className="mt-1 text-sm text-red-600">{fieldError.dateOfBirth}</p>
            )}
          </div>
          <div>
            <label htmlFor="wc-address" className={labelClassName(fieldHasError.address)}>
              Adres *
            </label>
            <input
              id="wc-address"
              name="address"
              type="text"
              required
              aria-invalid={fieldHasError.address || undefined}
              className={inputClassName(fieldHasError.address)}
            />
            {fieldError.address && (
              <p className="mt-1 text-sm text-red-600">{fieldError.address}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-gray-100 bg-gray-50 p-3">
          {/* Story 10.77: geen vinkje meer — een medewerker aanvaardt niet in naam van de wandelaar. */}
          <p className="text-xs text-gray-500">
            De wandelaar aanvaardt het wandelreglement zelf in de wandelaar-app, vóór de eerste wandeling.
          </p>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="wc-childrenWalkAlong"
              name="childrenWalkAlong"
              value="true"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="wc-childrenWalkAlong" className="text-sm text-gray-700">
              Wandelaar wil kinderen mee laten wandelen (onder eigen begeleiding)
            </label>
          </div>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="wc-autoApprove"
              name="autoApprove"
              value="true"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="wc-autoApprove" className="text-sm text-gray-700">
              Direct goedkeuren (maakt automatisch een gebruikersaccount aan)
            </label>
          </div>
        </div>

        {state && !state.success && state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        {state?.success && state.message && (
          <p className="text-sm text-emerald-600">{state.message}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#1b4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
          >
            {isPending ? "Aanmaken..." : "Wandelaar aanmaken"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}
