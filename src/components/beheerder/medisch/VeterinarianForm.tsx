"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createVeterinarian, updateVeterinarian, type VeterinarianRow } from "@/lib/actions/veterinarians";

interface Props {
  veterinarian?: VeterinarianRow;
  onDone: () => void;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

type Veld =
  | "name"
  | "practice"
  | "street"
  | "houseNumber"
  | "postalCode"
  | "city"
  | "phone"
  | "mobile"
  | "email"
  | "orderNumber"
  | "notes";

/** Story 10.81 — één dierenarts toevoegen of bijwerken (zelfde opzet als de leveranciers, 13.16). */
export default function VeterinarianForm({ veterinarian, onDone }: Props) {
  const router = useRouter();
  const action = veterinarian ? updateVeterinarian : createVeterinarian;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;
  // React 19 zet een formulier na een server action terug op zijn beginwaarden, ook bij
  // een fout. De action stuurt de ingevulde waarden terug; `key` laat ze opnieuw landen.
  const terug = state && !state.success ? state.values : undefined;
  const waarde = (veld: Veld) => terug?.[veld] ?? veterinarian?.[veld] ?? "";
  const sleutel = veterinarian?.id ?? "nieuw";

  function fout(veld: Veld) {
    const f = fieldErrors?.[veld];
    return f ? <p className="mt-1 text-sm text-red-600">{f[0]}</p> : null;
  }

  function invoer(veld: Veld, label: string, kolommen: string, extra: { type?: string; placeholder?: string } = {}) {
    return (
      <div className={kolommen}>
        <label htmlFor={`vet-${veld}-${sleutel}`} className={LABEL}>
          {label}
          {veld === "name" && <span className="text-red-500"> *</span>}
        </label>
        <input
          id={`vet-${veld}-${sleutel}`}
          name={veld}
          type={extra.type ?? "text"}
          defaultValue={waarde(veld)}
          placeholder={extra.placeholder}
          className={INPUT}
        />
        {fout(veld)}
      </div>
    );
  }

  return (
    <form
      key={JSON.stringify(terug ?? {})}
      action={formAction}
      noValidate
      className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3"
    >
      {veterinarian && <input type="hidden" name="id" value={veterinarian.id} />}
      {globalError && <p className="mb-2 text-sm text-red-600">{globalError}</p>}

      <div className="grid gap-2 sm:grid-cols-6">
        {invoer("name", "Naam", "sm:col-span-3", { placeholder: "Bijv. Dr. Ine Wouters" })}
        {invoer("practice", "Praktijk", "sm:col-span-3", { placeholder: "Bijv. Dierenkliniek De Dender" })}
        {invoer("street", "Straat", "sm:col-span-4", { placeholder: "Bijv. Kerkstraat" })}
        {invoer("houseNumber", "Nr", "sm:col-span-2", { placeholder: "Bijv. 12" })}
        {invoer("postalCode", "Postcode", "sm:col-span-2", { placeholder: "Bijv. 9400" })}
        {invoer("city", "Gemeente", "sm:col-span-4", { placeholder: "Bijv. Ninove" })}
        {invoer("phone", "Telefoon", "sm:col-span-2", { type: "tel", placeholder: "Bijv. 054 12 34 56" })}
        {invoer("mobile", "Gsm", "sm:col-span-2", { type: "tel", placeholder: "Bijv. 0470 12 34 56" })}
        {invoer("orderNumber", "Ordenummer", "sm:col-span-2", { placeholder: "Nr. bij de Orde der Dierenartsen" })}
        {invoer("email", "E-mail", "sm:col-span-6", { type: "email", placeholder: "Bijv. info@dedender.be" })}
        {invoer("notes", "Notitie (optioneel)", "sm:col-span-6", { placeholder: "Bijv. contractdierenarts, komt op dinsdag" })}
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-white"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#1b4332] px-4 py-1 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
