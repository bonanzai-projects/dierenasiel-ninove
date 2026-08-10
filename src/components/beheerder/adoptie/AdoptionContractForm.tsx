"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { PDF_LETTERHEAD } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { createAdoptionContract } from "@/lib/actions/adoption-contracts";

interface AdoptantData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  rijksregister: string;
}

interface AnimalData {
  name: string;
  species: string;
  breed: string;
  dateOfBirth: string;
  gender: string;
  color: string;
  identificationNr: string;
  passportNr: string;
  description: string;
  isNeutered: boolean;
}

interface Props {
  candidateId: number | null;
  animalId: number | null;
  adoptant: AdoptantData;
  animal: AnimalData;
  // Story 10.20+: rechtstreekse-flow heeft geen kandidaat — andere redirect.
  onSuccessRedirect?: string;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "payconiq", label: "Payconiq" },
  { value: "overschrijving", label: "Overschrijving" },
];

export default function AdoptionContractForm({
  candidateId,
  animalId,
  adoptant,
  animal,
  onSuccessRedirect,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createAdoptionContract, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Adoptant state
  const [adoptantFirstName, setAdoptantFirstName] = useState(adoptant.firstName);
  const [adoptantLastName, setAdoptantLastName] = useState(adoptant.lastName);
  const [adoptantEmail, setAdoptantEmail] = useState(adoptant.email);
  const [adoptantPhone, setAdoptantPhone] = useState(adoptant.phone);
  const [adoptantAddress, setAdoptantAddress] = useState(adoptant.address);
  const [adoptantBirthDate, setAdoptantBirthDate] = useState(adoptant.dateOfBirth);
  const [adoptantIdNumber, setAdoptantIdNumber] = useState(adoptant.rijksregister);

  // Dier state
  const [animalName, setAnimalName] = useState(animal.name);
  const [animalSpecies, setAnimalSpecies] = useState(animal.species);
  const [animalBreed, setAnimalBreed] = useState(animal.breed);
  const [animalBirthDate, setAnimalBirthDate] = useState(animal.dateOfBirth);
  const [animalGender, setAnimalGender] = useState(animal.gender);
  const [animalColor, setAnimalColor] = useState(animal.color);
  const [animalChipNr, setAnimalChipNr] = useState(animal.identificationNr);
  const [animalPassportNr, setAnimalPassportNr] = useState(animal.passportNr);
  const [animalDescription, setAnimalDescription] = useState(animal.description);
  const [animalNeutered, setAnimalNeutered] = useState(animal.isNeutered);

  // Contract state
  const [contractDate, setContractDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]?.value ?? "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (state?.success) {
      if (onSuccessRedirect) router.push(onSuccessRedirect);
      else if (candidateId) router.push(`/beheerder/adoptie/${candidateId}`);
      else router.push("/beheerder/adoptie?tab=contracten");
    }
  }, [state, router, candidateId, onSuccessRedirect]);

  // Story 10.4 patroon: scroll + focus naar het eerste veld met aria-invalid="true"
  // na een gefaalde submit. Respecteert prefers-reduced-motion.
  useEffect(() => {
    if (!state || state.success) return;
    const form = formRef.current;
    if (!form) return;
    const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!firstInvalid) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    firstInvalid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    firstInvalid.focus({ preventScroll: true });
  }, [state]);

  function submitContract(overrideCatWarnings: boolean) {
    const fd = new FormData();
    fd.append("json", JSON.stringify({
      animalId,
      candidateId,
      contractDate,
      paymentAmount,
      paymentMethod,
      notes: notes || undefined,
      adoptantFirstName,
      adoptantLastName,
      adoptantEmail,
      adoptantPhone,
      adoptantAddress,
      adoptantBirthDate,
      adoptantIdNumber,
      animalName,
      animalSpecies,
      animalBreed,
      animalBirthDate,
      animalGender,
      animalColor,
      animalChipNr,
      animalPassportNr,
      animalDescription,
      animalNeutered,
      overrideCatWarnings,
    }));
    startTransition(() => action(fd));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitContract(false);
  }

  // Story 10.20+: kattenwaarschuwing → confirm-popup; bij OK opnieuw submitten
  // met overrideCatWarnings=true zodat de actie de waarschuwing negeert.
  useEffect(() => {
    if (!state || state.success) return;
    const warning = (state as { warning?: string }).warning;
    if (warning !== "cat-prerequisites") return;
    const msg = `${state.error}.\n\nWeet je zeker dat je dit contract toch wil opmaken?`;
    if (typeof window !== "undefined" && window.confirm(msg)) {
      submitContract(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldErrors = state && !state.success ? (state as { fieldErrors?: Record<string, string[]> }).fieldErrors : undefined;
  const stateWarning = state && !state.success ? (state as { warning?: string }).warning : undefined;
  const speciesLabel = animalSpecies === "hond" ? "hond" : animalSpecies === "kat" ? "kat" : "ander dier";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {state && !state.success && stateWarning === "cat-prerequisites" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            <strong>Waarschuwing:</strong> {state.error}. Je kan deze waarschuwing overrulen via de popup bij &quot;Contract opmaken&quot;.
          </p>
        </div>
      )}
      {state && !state.success && stateWarning !== "cat-prerequisites" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{state.error}</p>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold text-[#1b4332]">
              Adoptiecontract {speciesLabel}
            </h2>
            <p className="text-xs text-gray-500">{PDF_LETTERHEAD.name} — {PDF_LETTERHEAD.address}</p>
          </div>
          <div>
            <label htmlFor="contractDate" className={`block text-xs font-medium ${fieldErrors?.contractDate ? "text-red-700" : "text-gray-500"}`}>
              Contractdatum *
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="date"
                id="contractDate"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                required
                aria-invalid={!!fieldErrors?.contractDate}
                className={`rounded-md border ${fieldErrors?.contractDate ? "border-red-500" : "border-gray-300"} px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
              <button
                type="button"
                onClick={() => setContractDate(new Date().toISOString().split("T")[0])}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Vandaag
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sectie: Gegevens adoptant */}
      <Section title="Gegevens adoptant">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Naam *" value={adoptantLastName} onChange={setAdoptantLastName} error={fieldErrors?.adoptantLastName?.[0]} />
          <Field label="Voornaam *" value={adoptantFirstName} onChange={setAdoptantFirstName} error={fieldErrors?.adoptantFirstName?.[0]} />
          <Field label="Adres" value={adoptantAddress} onChange={setAdoptantAddress} fullWidth />
          <Field label="Telefoon" value={adoptantPhone} onChange={setAdoptantPhone} />
          <Field label="E-mail" value={adoptantEmail} onChange={setAdoptantEmail} type="email" />
          <Field label="Geboortedatum" value={adoptantBirthDate} onChange={setAdoptantBirthDate} placeholder="bv. 15/05/1985" />
          <Field label="Rijksregister-/ID-nr" value={adoptantIdNumber} onChange={setAdoptantIdNumber} />
        </div>
      </Section>

      {/* Sectie: Gegevens dier */}
      <Section title={`Gegevens van het ${speciesLabel}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Naam *" value={animalName} onChange={setAnimalName} error={fieldErrors?.animalName?.[0]} />
          <div>
            <label className="block text-[11px] font-medium uppercase text-gray-500">Species</label>
            <select
              value={animalSpecies}
              onChange={(e) => setAnimalSpecies(e.target.value)}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">Kies...</option>
              <option value="hond">Hond</option>
              <option value="kat">Kat</option>
              <option value="konijn">Konijn</option>
              <option value="vogel">Vogel</option>
              <option value="ander">Ander</option>
            </select>
          </div>
          <Field label="Ras" value={animalBreed} onChange={setAnimalBreed} />
          <Field label="Geboortedatum" value={animalBirthDate} onChange={setAnimalBirthDate} placeholder="bv. 2022-04-15" />
          <Field label="Geslacht" value={animalGender} onChange={setAnimalGender} />
          <Field label="Kleur" value={animalColor} onChange={setAnimalColor} />
          <Field label="Identificatie-nr (chip)" value={animalChipNr} onChange={setAnimalChipNr} />
          <Field label="Paspoort-nr" value={animalPassportNr} onChange={setAnimalPassportNr} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="animalNeutered"
              type="checkbox"
              checked={animalNeutered}
              onChange={(e) => setAnimalNeutered(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="animalNeutered" className="text-sm text-gray-700">
              Gesteriliseerd / gecastreerd
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium uppercase text-gray-500">Beschrijving</label>
            <textarea
              value={animalDescription}
              onChange={(e) => setAnimalDescription(e.target.value)}
              rows={2}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </div>
      </Section>

      {/* Sectie: Prijs/betaling */}
      <Section title="Prijs en betaling">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="paymentAmount" className={`block text-xs font-medium ${fieldErrors?.paymentAmount ? "text-red-700" : "text-gray-500"}`}>
              Bedrag (EUR) *
            </label>
            <input
              type="text"
              id="paymentAmount"
              name="paymentAmount"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="bv. 150.00"
              aria-invalid={!!fieldErrors?.paymentAmount}
              className={`mt-1 block w-full rounded-md border ${fieldErrors?.paymentAmount ? "border-red-500" : "border-gray-300"} px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            />
          </div>
          <div>
            <label htmlFor="paymentMethod" className={`block text-xs font-medium ${fieldErrors?.paymentMethod ? "text-red-700" : "text-gray-500"}`}>
              Betaalwijze *
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              aria-invalid={!!fieldErrors?.paymentMethod}
              className={`mt-1 block w-full rounded-md border ${fieldErrors?.paymentMethod ? "border-red-500" : "border-gray-300"} px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Sectie: Opmerkingen */}
      <Section title="Opmerkingen">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Eventuele extra afspraken..."
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </Section>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="font-heading text-sm font-bold text-gray-700">Adoptievoorwaarden &amp; handtekening</h2>
        <p className="mt-2 text-xs text-gray-600">
          De volledige adoptievoorwaarden en de handtekenzones (asiel + adoptant) verschijnen op de PDF na opmaak.
        </p>
      </div>

      {candidateId && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Let op: na opslaan wordt het dier automatisch als &quot;geadopteerd&quot; gemarkeerd en de kandidaat-status bijgewerkt naar &quot;adopted&quot;.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#1b4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {pending ? "Opslaan..." : "Contract opmaken"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="rounded-t-xl bg-[#1b4332] px-4 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  fullWidth,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fullWidth?: boolean;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className={`block text-[11px] font-medium uppercase ${error ? "text-red-700" : "text-gray-500"}`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`mt-0.5 block w-full rounded-md border ${error ? "border-red-500" : "border-gray-300"} px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500`}
      />
      {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
