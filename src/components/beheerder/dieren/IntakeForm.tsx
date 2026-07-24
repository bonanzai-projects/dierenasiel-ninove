"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { createAnimalIntake } from "@/lib/actions/animals";
import { INTAKE_REASONS, GENDER_OPTIONS_BY_SPECIES } from "@/lib/constants";
import { shouldCollectMelderDetails } from "@/lib/animals/intake-melder";
import NeuteredRadioGroup, { type NeuteredChoice } from "./NeuteredRadioGroup";

const SPECIES_OPTIONS = [
  { value: "hond", label: "Hond" },
  { value: "kat", label: "Kat" },
  { value: "ander", label: "Ander" },
];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p role="alert" className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

function hasError(fieldErrors: Record<string, string[]> | undefined, field: string): boolean {
  return !!fieldErrors?.[field]?.length;
}

const INPUT_BASE = "mt-1 block w-full rounded-lg border px-3 py-2 text-sm";
const INPUT_NORMAL = `${INPUT_BASE} border-gray-300 focus:border-emerald-500 focus:ring-emerald-500`;
const INPUT_ERROR = `${INPUT_BASE} border-red-500 focus:border-red-500 focus:ring-red-500`;

export default function IntakeForm() {
  const [state, formAction, isPending] = useActionState(createAnimalIntake, null);
  const [species, setSpecies] = useState("");
  const [intakeReason, setIntakeReason] = useState("");
  const [isPickedUp, setIsPickedUp] = useState(false);
  // Story 10.29: nieuwe intake start op "onbekend" — bij vondelingen/IBN weet
  // het asiel de sterilisatiestatus doorgaans nog niet.
  const [neuteredChoice, setNeuteredChoice] = useState<NeuteredChoice>("onbekend");
  const isNeutered = neuteredChoice === "true";
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setSpecies("");
      setIntakeReason("");
      setIsPickedUp(false);
      setNeuteredChoice("onbekend");
    }
  }, [state]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;
  // Na een validatiefout geeft de action de ingevoerde waarden terug; React 19
  // reset uncontrolled velden na een action, dus we voeden ze terug als
  // defaultValue zodat de invoer niet verloren gaat (Sven-feedback 2026-07-24).
  const submitted = state && !state.success ? state.values : undefined;
  const keep = (field: string) => submitted?.[field] ?? undefined;

  // React 19 reset uncontrolled velden na een action. Enkel op defaultValue
  // vertrouwen is timing-gevoelig, dus we zetten de teruggegeven waarden ná de
  // reset deterministisch terug in de DOM-velden (Sven-feedback 2026-07-24).
  useEffect(() => {
    if (!submitted || !formRef.current) return;
    const form = formRef.current;
    for (const [name, value] of Object.entries(submitted)) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.value = value;
      }
    }
  }, [submitted]);

  // Scroll to first field with error after server action returns errors
  useEffect(() => {
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const firstErrorEl = formRef.current?.querySelector("[data-field-error]");
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [fieldErrors]);

  function fieldClass(field: string): string {
    return hasError(fieldErrors, field) ? INPUT_ERROR : INPUT_NORMAL;
  }

  function labelClass(field: string): string {
    return `block text-sm font-medium ${hasError(fieldErrors, field) ? "text-red-600" : "text-gray-700"}`;
  }

  const today = new Date().toISOString().split("T")[0];
  // Melder-velden verschijnen bij ophaling, IBN of vondeling (ook wanneer
  // iemand het dier zelf komt brengen) — Sven-feedback 2026-07-24.
  const showMelderDetails = shouldCollectMelderDetails({
    intakeReason,
    isPickedUpByShelter: isPickedUp,
  });

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-8">
      {/* Success message */}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Dier succesvol geregistreerd!
          </p>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{globalError}</p>
        </div>
      )}

      {/* Basic info */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#1b4332]">
          Basisgegevens
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Naam */}
          <div {...(hasError(fieldErrors, "name") ? { "data-field-error": true } : {})}>
            <label htmlFor="name" className={labelClass("name")}>
              Naam <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={keep("name")}
              aria-invalid={hasError(fieldErrors, "name") || undefined}
              className={fieldClass("name")}
              placeholder="Bijv. Rex"
            />
            <FieldError errors={fieldErrors?.name} />
          </div>

          {/* Soort */}
          <div {...(hasError(fieldErrors, "species") ? { "data-field-error": true } : {})}>
            <label htmlFor="species" className={labelClass("species")}>
              Soort <span className="text-red-500">*</span>
            </label>
            <select
              id="species"
              name="species"
              aria-invalid={hasError(fieldErrors, "species") || undefined}
              className={fieldClass("species")}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="">Selecteer soort...</option>
              {SPECIES_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors?.species} />
          </div>

          {/* Geslacht */}
          <div {...(hasError(fieldErrors, "gender") ? { "data-field-error": true } : {})}>
            <label htmlFor="gender" className={labelClass("gender")}>
              Geslacht <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              aria-invalid={hasError(fieldErrors, "gender") || undefined}
              className={fieldClass("gender")}
              disabled={!species}
            >
              <option value="">Selecteer geslacht...</option>
              {species &&
                GENDER_OPTIONS_BY_SPECIES[species]?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
            <FieldError errors={fieldErrors?.gender} />
          </div>

          {/* Ras */}
          <div {...(hasError(fieldErrors, "breed") ? { "data-field-error": true } : {})}>
            <label htmlFor="breed" className={labelClass("breed")}>
              Ras
            </label>
            <input
              type="text"
              id="breed"
              name="breed"
              defaultValue={keep("breed")}
              aria-invalid={hasError(fieldErrors, "breed") || undefined}
              className={fieldClass("breed")}
              placeholder="Bijv. Mechelse Herder"
            />
            <FieldError errors={fieldErrors?.breed} />
          </div>

          {/* Kleur */}
          <div {...(hasError(fieldErrors, "color") ? { "data-field-error": true } : {})}>
            <label htmlFor="color" className={labelClass("color")}>
              Kleur
            </label>
            <input
              type="text"
              id="color"
              name="color"
              defaultValue={keep("color")}
              aria-invalid={hasError(fieldErrors, "color") || undefined}
              className={fieldClass("color")}
              placeholder="Bijv. bruin"
            />
            <FieldError errors={fieldErrors?.color} />
          </div>

          {/* Geboortedatum */}
          <div {...(hasError(fieldErrors, "dateOfBirth") ? { "data-field-error": true } : {})}>
            <label htmlFor="dateOfBirth" className={labelClass("dateOfBirth")}>
              Geboortedatum
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              defaultValue={keep("dateOfBirth")}
              aria-invalid={hasError(fieldErrors, "dateOfBirth") || undefined}
              className={fieldClass("dateOfBirth")}
            />
            <FieldError errors={fieldErrors?.dateOfBirth} />
          </div>
        </div>
      </div>

      {/* Identification */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#1b4332]">
          Identificatie
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Chipnummer */}
          <div {...(hasError(fieldErrors, "identificationNr") ? { "data-field-error": true } : {})}>
            <label htmlFor="identificationNr" className={labelClass("identificationNr")}>
              Chipnummer
            </label>
            <input
              type="text"
              id="identificationNr"
              name="identificationNr"
              defaultValue={keep("identificationNr")}
              aria-invalid={hasError(fieldErrors, "identificationNr") || undefined}
              className={fieldClass("identificationNr")}
              placeholder="Bijv. 981100004567890"
            />
            <FieldError errors={fieldErrors?.identificationNr} />
          </div>

          {/* Paspoortnummer */}
          <div {...(hasError(fieldErrors, "passportNr") ? { "data-field-error": true } : {})}>
            <label htmlFor="passportNr" className={labelClass("passportNr")}>
              Paspoortnummer
            </label>
            <input
              type="text"
              id="passportNr"
              name="passportNr"
              defaultValue={keep("passportNr")}
              aria-invalid={hasError(fieldErrors, "passportNr") || undefined}
              className={fieldClass("passportNr")}
              placeholder="Bijv. BE-123456"
            />
            <FieldError errors={fieldErrors?.passportNr} />
          </div>
        </div>
      </div>

      {/* Intake details */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#1b4332]">
          Intake
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Intake datum */}
          <div {...(hasError(fieldErrors, "intakeDate") ? { "data-field-error": true } : {})}>
            <label htmlFor="intakeDate" className={labelClass("intakeDate")}>
              Intake datum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="intakeDate"
              name="intakeDate"
              defaultValue={keep("intakeDate") ?? today}
              aria-invalid={hasError(fieldErrors, "intakeDate") || undefined}
              className={fieldClass("intakeDate")}
            />
            <FieldError errors={fieldErrors?.intakeDate} />
          </div>

          {/* Reden binnenkomst */}
          <div {...(hasError(fieldErrors, "intakeReason") ? { "data-field-error": true } : {})}>
            <label htmlFor="intakeReason" className={labelClass("intakeReason")}>
              Reden binnenkomst
            </label>
            <select
              id="intakeReason"
              name="intakeReason"
              value={intakeReason}
              onChange={(e) => setIntakeReason(e.target.value)}
              aria-invalid={hasError(fieldErrors, "intakeReason") || undefined}
              className={fieldClass("intakeReason")}
            >
              <option value="">Selecteer reden...</option>
              {INTAKE_REASONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors?.intakeReason} />
          </div>
        </div>

        {/* IBN-specifieke velden */}
        {intakeReason === "ibn" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-800">
              Inbeslagname (IBN) gegevens
            </h3>
            <p className="mt-1 text-xs text-red-600">
              Bij een IBN-intake wordt automatisch een deadline van 60 dagen berekend.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div {...(hasError(fieldErrors, "dossierNr") ? { "data-field-error": true } : {})}>
                <label htmlFor="dossierNr" className={labelClass("dossierNr")}>
                  Dossiernummer DWV <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="dossierNr"
                  name="dossierNr"
                  defaultValue={keep("dossierNr")}
                  aria-invalid={hasError(fieldErrors, "dossierNr") || undefined}
                  className={fieldClass("dossierNr")}
                  placeholder="Bijv. DWV-2026-12345"
                />
                <FieldError errors={fieldErrors?.dossierNr} />
              </div>
              <div {...(hasError(fieldErrors, "pvNr") ? { "data-field-error": true } : {})}>
                <label htmlFor="pvNr" className={labelClass("pvNr")}>
                  PV-nummer politie <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="pvNr"
                  name="pvNr"
                  defaultValue={keep("pvNr")}
                  aria-invalid={hasError(fieldErrors, "pvNr") || undefined}
                  className={fieldClass("pvNr")}
                  placeholder="Bijv. PV-2026-001"
                />
                <FieldError errors={fieldErrors?.pvNr} />
              </div>
            </div>
            <div className="mt-3" {...(hasError(fieldErrors, "ibnReason") ? { "data-field-error": true } : {})}>
              <label htmlFor="ibnReason" className={labelClass("ibnReason")}>
                Reden van inbeslagname
              </label>
              <textarea
                id="ibnReason"
                name="ibnReason"
                defaultValue={keep("ibnReason")}
                rows={2}
                aria-invalid={hasError(fieldErrors, "ibnReason") || undefined}
                className={fieldClass("ibnReason")}
                placeholder="Waarom is het dier in beslag genomen? Bijv. verwaarlozing, gerechtelijk bevel..."
              />
              <FieldError errors={fieldErrors?.ibnReason} />
            </div>
          </div>
        )}

        {/* Shelter pickup toggle */}
        <div className="mt-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isPickedUpByShelter"
              value="true"
              checked={isPickedUp}
              onChange={(e) => setIsPickedUp(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Opgehaald door het asiel (na melding)
            </span>
          </label>
        </div>

        {/* Melder details - bij ophaling, IBN of vondeling */}
        {showMelderDetails && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-800">
              Melding details
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div {...(hasError(fieldErrors, "intakeMetadata.melderNaam") ? { "data-field-error": true } : {})}>
                <label htmlFor="intakeMetadata.melderNaam" className={labelClass("intakeMetadata.melderNaam")}>
                  Naam melder / brenger
                </label>
                <input
                  type="text"
                  id="intakeMetadata.melderNaam"
                  name="intakeMetadata.melderNaam"
                  defaultValue={keep("intakeMetadata.melderNaam")}
                  aria-invalid={hasError(fieldErrors, "intakeMetadata.melderNaam") || undefined}
                  className={fieldClass("intakeMetadata.melderNaam")}
                  placeholder="Naam van wie gemeld of gebracht heeft"
                />
                <FieldError errors={fieldErrors?.["intakeMetadata.melderNaam"]} />
              </div>
              <div {...(hasError(fieldErrors, "intakeMetadata.melderDatum") ? { "data-field-error": true } : {})}>
                <label htmlFor="intakeMetadata.melderDatum" className={labelClass("intakeMetadata.melderDatum")}>
                  Datum melding
                </label>
                <input
                  type="date"
                  id="intakeMetadata.melderDatum"
                  name="intakeMetadata.melderDatum"
                  defaultValue={keep("intakeMetadata.melderDatum")}
                  aria-invalid={hasError(fieldErrors, "intakeMetadata.melderDatum") || undefined}
                  className={fieldClass("intakeMetadata.melderDatum")}
                />
                <FieldError errors={fieldErrors?.["intakeMetadata.melderDatum"]} />
              </div>
              <div className="sm:col-span-2" {...(hasError(fieldErrors, "intakeMetadata.melderLocatie") ? { "data-field-error": true } : {})}>
                <label htmlFor="intakeMetadata.melderLocatie" className={labelClass("intakeMetadata.melderLocatie")}>
                  Adres / vindplaats
                </label>
                <input
                  type="text"
                  id="intakeMetadata.melderLocatie"
                  name="intakeMetadata.melderLocatie"
                  defaultValue={keep("intakeMetadata.melderLocatie")}
                  aria-invalid={hasError(fieldErrors, "intakeMetadata.melderLocatie") || undefined}
                  className={fieldClass("intakeMetadata.melderLocatie")}
                  placeholder="Adres of plaats waar het dier gevonden of gebracht is"
                />
                <FieldError errors={fieldErrors?.["intakeMetadata.melderLocatie"]} />
              </div>
              {intakeReason === "ibn" && (
                <div className="sm:col-span-2" {...(hasError(fieldErrors, "intakeMetadata.betrokkenInstanties") ? { "data-field-error": true } : {})}>
                  <label htmlFor="intakeMetadata.betrokkenInstanties" className={labelClass("intakeMetadata.betrokkenInstanties")}>
                    Betrokken instanties
                  </label>
                  <input
                    type="text"
                    id="intakeMetadata.betrokkenInstanties"
                    name="intakeMetadata.betrokkenInstanties"
                  defaultValue={keep("intakeMetadata.betrokkenInstanties")}
                    aria-invalid={hasError(fieldErrors, "intakeMetadata.betrokkenInstanties") || undefined}
                    className={fieldClass("intakeMetadata.betrokkenInstanties")}
                    placeholder="Bijv. Politiezone Ninove, Dierenwelzijn Vlaanderen"
                  />
                  <FieldError errors={fieldErrors?.["intakeMetadata.betrokkenInstanties"]} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sterilisatie / Castratie — Story 10.23 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#1b4332]">
          Sterilisatie / Castratie
        </h2>

        <NeuteredRadioGroup value={neuteredChoice} onChange={setNeuteredChoice} />

        {isNeutered && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="neuteredDate" className="block text-sm font-medium text-gray-700">
                  Datum sterilisatie/castratie
                </label>
                <input
                  type="date"
                  id="neuteredDate"
                  name="neuteredDate"
                  className={INPUT_NORMAL}
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <input type="hidden" name="neuteredByShelter" value="false" />
                  <input
                    type="checkbox"
                    id="neuteredByShelter"
                    name="neuteredByShelter"
                    value="true"
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="neuteredByShelter" className="text-sm text-gray-700">
                    Door het asiel uitgevoerd
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#1b4332]">
          Beschrijving
        </h2>

        <div className="mt-4 space-y-4">
          <div {...(hasError(fieldErrors, "shortDescription") ? { "data-field-error": true } : {})}>
            <label htmlFor="shortDescription" className={labelClass("shortDescription")}>
              Korte beschrijving
            </label>
            <input
              type="text"
              id="shortDescription"
              name="shortDescription"
              defaultValue={keep("shortDescription")}
              maxLength={300}
              aria-invalid={hasError(fieldErrors, "shortDescription") || undefined}
              className={fieldClass("shortDescription")}
              placeholder="Korte samenvatting (max 300 tekens)"
            />
            <FieldError errors={fieldErrors?.shortDescription} />
          </div>

          <div {...(hasError(fieldErrors, "description") ? { "data-field-error": true } : {})}>
            <label htmlFor="description" className={labelClass("description")}>
              Uitgebreide beschrijving
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={keep("description")}
              rows={4}
              aria-invalid={hasError(fieldErrors, "description") || undefined}
              className={fieldClass("description")}
              placeholder="Beschrijf het dier, karakter, bijzonderheden..."
            />
            <FieldError errors={fieldErrors?.description} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <a
          href="/beheerder"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuleren
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1b4332] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Bezig met registreren..." : "Dier registreren"}
        </button>
      </div>
    </form>
  );
}
