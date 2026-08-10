"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createUser, updateUser, sendUserInvite } from "@/lib/actions/users";
import { BACKOFFICE_ROLES } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/permissions/explain";
import RoleSummary from "./RoleSummary";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean | null;
}

interface Props {
  editUser: User | null;
  onClose: () => void;
}

/**
 * De link zelf tonen wanneer de mail niet vertrok. Zonder dit staat een nieuwe
 * medewerker met een account dat hij niet kan openen — precies wat er met
 * Nathalie gebeurde.
 */
function InviteLinkFallback({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Geen klembord (of geen toestemming): de link staat er gewoon om te selecteren.
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-medium text-amber-900">
        De mail is niet vertrokken. Geef deze link zelf door — hij blijft 7 dagen geldig:
      </p>
      <p className="mt-2 break-all rounded border border-amber-200 bg-white px-2 py-1 font-mono text-xs text-gray-800">
        {url}
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-2 rounded-md border border-amber-600 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
      >
        {copied ? "Gekopieerd" : "Kopieer link"}
      </button>
    </div>
  );
}

export default function UserForm({ editUser, onClose }: Props) {
  const isEdit = !!editUser;
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateUser : createUser,
    null,
  );
  const [inviteState, inviteAction, invitePending] = useActionState(sendUserInvite, null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevStateRef = useRef(state);
  // Enkel om de samenvatting onder het keuzelijstje te tonen — het veld zelf
  // blijft uncontrolled, zodat de herstel-useEffect hieronder blijft werken.
  const [gekozenRol, setGekozenRol] = useState(editUser?.role ?? "");

  const hasFieldError = (field: string): boolean =>
    !!(state && !state.success && state.fieldErrors?.[field]?.length);

  const inputClassName = (field: string): string => {
    const base = "w-full rounded-lg border px-3 py-2 text-sm focus:ring-1";
    if (hasFieldError(field)) {
      return `${base} border-red-500 focus:border-red-500 focus:ring-red-500`;
    }
    return `${base} border-gray-300 focus:border-emerald-500 focus:ring-emerald-500`;
  };

  const labelClassName = (field: string): string => {
    const base = "mb-1 block text-sm font-medium";
    return hasFieldError(field) ? `${base} text-red-600` : `${base} text-gray-700`;
  };

  // Bij het aanmaken houden we het formulier open zolang de link nog getoond
  // moet worden; anders verdwijnt hij samen met het scherm.
  const inviteUrl =
    (state?.success ? state.data?.inviteUrl : undefined) ??
    (inviteState?.success ? inviteState.data?.inviteUrl : undefined);

  useEffect(() => {
    if (state?.success && !inviteUrl) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, inviteUrl, onClose]);

  // React 19 wist de velden van een uncontrolled form na elke server action.
  // De actie geeft de ingevulde waarden terug; die zetten we deterministisch terug.
  useEffect(() => {
    if (state && !state.success && state.values && formRef.current) {
      const form = formRef.current;
      for (const [name, value] of Object.entries(state.values)) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
          field.value = value;
        }
      }
      // Het veld terugzetten via de DOM vuurt geen onChange, dus de samenvatting
      // zou anders bij de vorige rol blijven staan.
      if (state.values.role !== undefined) setGekozenRol(state.values.role);
    }
  }, [state]);

  // Scroll naar het eerste foutveld na een mislukte submit
  useEffect(() => {
    if (
      state &&
      !state.success &&
      state.fieldErrors &&
      state !== prevStateRef.current
    ) {
      const errorFields = Object.keys(state.fieldErrors);
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        const fieldIdMap: Record<string, string> = {
          name: "user-name",
          email: "user-email",
          role: "user-role",
        };
        const elementId = fieldIdMap[firstErrorField];
        if (elementId) {
          const element = document.getElementById(elementId);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
          element?.focus();
        }
      }
    }
    prevStateRef.current = state;
  }, [state]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[#1b4332]">
        {isEdit ? "Gebruiker bewerken" : "Nieuwe gebruiker"}
      </h2>

      <form ref={formRef} action={formAction} noValidate className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editUser.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="user-name" className={labelClassName("name")}>
              Naam *
            </label>
            <input
              id="user-name"
              name="name"
              type="text"
              defaultValue={editUser?.name ?? ""}
              aria-invalid={hasFieldError("name") || undefined}
              className={inputClassName("name")}
            />
            {state && !state.success && state.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-email" className={labelClassName("email")}>
              E-mail *
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              defaultValue={editUser?.email ?? ""}
              aria-invalid={hasFieldError("email") || undefined}
              className={inputClassName("email")}
            />
            {state && !state.success && state.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="user-role" className={labelClassName("role")}>
              Rol *
            </label>
            <select
              id="user-role"
              name="role"
              defaultValue={editUser?.role ?? ""}
              onChange={(event) => setGekozenRol(event.target.value)}
              aria-invalid={hasFieldError("role") || undefined}
              className={inputClassName("role")}
            >
              <option value="">Selecteer een rol...</option>
              {BACKOFFICE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
            {state && !state.success && state.fieldErrors?.role && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.role[0]}</p>
            )}
            <RoleSummary role={gekozenRol} />
          </div>

          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="flex items-center gap-2 pt-2">
                <input type="hidden" name="isActive" value="false" />
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={editUser.isActive ?? true}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Actief</span>
              </div>
            </div>
          )}
        </div>

        {!isEdit && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Je kiest geen wachtwoord. De nieuwe gebruiker krijgt een mail met een link om er zelf
            één in te stellen.
          </p>
        )}

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
            {isPending ? "Opslaan..." : isEdit ? "Bijwerken" : "Aanmaken en uitnodigen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {inviteUrl ? "Sluiten" : "Annuleren"}
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700">Toegang</h3>
          <p className="mt-1 text-xs text-gray-600">
            Kan deze persoon niet inloggen, of kreeg hij nooit een mail? Stuur een nieuwe
            uitnodiging — daarmee stelt hij zelf een wachtwoord in.
          </p>
          <form action={inviteAction} className="mt-2">
            <input type="hidden" name="id" value={editUser.id} />
            <button
              type="submit"
              disabled={invitePending}
              className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {invitePending ? "Versturen..." : "Uitnodiging versturen"}
            </button>
          </form>
          {inviteState && !inviteState.success && inviteState.error && (
            <p className="mt-1 text-xs text-red-600">{inviteState.error}</p>
          )}
          {inviteState?.success && inviteState.message && (
            <p className="mt-1 text-xs text-emerald-600">{inviteState.message}</p>
          )}
        </div>
      )}

      {inviteUrl && <InviteLinkFallback url={inviteUrl} />}
    </div>
  );
}
