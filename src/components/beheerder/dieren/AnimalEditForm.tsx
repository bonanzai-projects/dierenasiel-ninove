"use client";

import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { updateAnimal } from "@/lib/actions/animals";
import { INTAKE_REASONS } from "@/lib/constants";
import { shouldCollectMelderDetails } from "@/lib/animals/intake-melder";
import NeuteredRadioGroup, { type NeuteredChoice } from "./NeuteredRadioGroup";
import AutoGrowTextarea, { autoGrow } from "@/components/beheerder/shared/AutoGrowTextarea";
import { SHORT_DESCRIPTION_MAX } from "@/lib/validations/animals";
import { snapshotForm, isFormDirty, type FormSnapshot } from "@/lib/forms/form-dirty";
import { setUnsavedChanges } from "@/lib/forms/unsaved-changes";
import type { Animal } from "@/types";
import Link from "next/link";

/** Sleutel waaronder dit formulier zijn "openstaande wijzigingen" meldt. */
const FORM_ID = "animal-edit-form";

/**
 * Story 10.32: een tekst die van de uitgebreide beschrijving mag afwijken
 * (website of affiche). De kopieerknop neemt de werktekst over zodat je niet
 * hoeft te knippen en plakken; leeg laten betekent "gebruik de werktekst".
 *
 * In-/uitklapbaar via <details>: de textarea blijft in de DOM als de zone dicht
 * staat, dus een dichtgeklapte zone wordt gewoon mee opgeslagen. Standaard open
 * zodra er een eigen tekst is — anders blijft die onzichtbaar voor de gebruiker.
 */
function DerivedDescription({
  id,
  title,
  hint,
  defaultValue,
  sourceRef,
}: {
  id: string;
  title: string;
  hint: string;
  defaultValue: string;
  sourceRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isFilled, setIsFilled] = useState(defaultValue.trim().length > 0);

  function copyFromSource() {
    if (!ref.current) return;
    ref.current.value = sourceRef.current?.value ?? "";
    setIsFilled(ref.current.value.trim().length > 0);
    autoGrow(ref.current); // waarde via JS gezet → hoogte zelf bijstellen
    ref.current.focus();
  }

  return (
    <details
      open={defaultValue.trim().length > 0}
      className="group rounded-md border border-gray-200 bg-gray-50 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-xs font-semibold text-gray-700">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7 5l6 5-6 5V5z" />
        </svg>
        {title}
        <span className="ml-auto text-xs font-normal text-gray-400">
          {isFilled ? "eigen tekst" : "leeg — volgt de uitgebreide beschrijving"}
        </span>
      </summary>

      <div className="px-3 pb-3">
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={copyFromSource}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Kopieer uit uitgebreide beschrijving
          </button>
        </div>
        <label htmlFor={id} className="sr-only">
          {title}
        </label>
        <AutoGrowTextarea
          id={id}
          name={id}
          ref={ref}
          rows={10}
          defaultValue={defaultValue}
          onChange={(e) => setIsFilled(e.currentTarget.value.trim().length > 0)}
          className="block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
        />
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      </div>
    </details>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

/**
 * Story 10.33: balk die pas verschijnt zodra er iets gewijzigd is en dan
 * meescrollt. Staat binnen het <form>, dus de knop verstuurt het formulier
 * zonder extra JS-koppeling.
 */
function UnsavedChangesBar({ isPending }: { isPending: boolean }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 mt-2 rounded-t-lg border border-amber-300 bg-amber-50/95 px-4 py-2.5 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.515-2.63L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          Niet-opgeslagen wijzigingen
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/beheerder/dieren"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#1b4332] px-5 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
          >
            {isPending ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnimalEditForm({ animal }: { animal: Animal }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAnimal, null);
  // Story 10.29: tri-state — "true" | "false" | "onbekend" (null in de DB).
  const [neuteredChoice, setNeuteredChoice] = useState<NeuteredChoice>(
    animal.isNeutered === true ? "true" : animal.isNeutered === false ? "false" : "onbekend",
  );
  const isNeutered = neuteredChoice === "true";
  // Story 10.36: reden intake gecontroleerd zodat de IBN-/melder-secties
  // meelopen met de keuze in de dropdown.
  const [intakeReason, setIntakeReason] = useState(animal.intakeReason ?? "");
  const meta = (animal.intakeMetadata ?? {}) as Record<string, string>;
  const showMelderDetails = shouldCollectMelderDetails({
    intakeReason,
    isPickedUpByShelter: animal.isPickedUpByShelter ?? false,
  });
  // Bron voor de kopieerknoppen bij de website- en affichetekst (story 10.32).
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Story 10.33: openstaande wijzigingen bewaken.
  const formRef = useRef<HTMLFormElement>(null);
  const initialSnapshot = useRef<FormSnapshot | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Begintoestand meten zodra het formulier gerenderd is. Het component krijgt
  // een key op animal.updatedAt (story 10.23) en wordt na elke succesvolle
  // opslag opnieuw gemonteerd — de nieuwe begintoestand volgt dus vanzelf.
  useEffect(() => {
    if (formRef.current) initialSnapshot.current = snapshotForm(formRef.current);
  }, []);

  useEffect(() => {
    setUnsavedChanges(FORM_ID, isDirty);
    return () => setUnsavedChanges(FORM_ID, false);
  }, [isDirty]);

  // Waarschuwen bij herladen of sluiten van het tabblad.
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function recomputeDirty() {
    if (!formRef.current) return;
    setIsDirty(isFormDirty(initialSnapshot.current, snapshotForm(formRef.current)));
  }

  // Story 10.23: na succesvolle save de server component opnieuw fetchen
  // zodat de form pre-fills (defaultValue/defaultChecked) de gepersisteerde
  // waarden tonen i.p.v. de stale prop van vóór de save.
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;

  return (
    <form
      action={formAction}
      ref={formRef}
      noValidate
      className="space-y-4"
      onInput={recomputeDirty}
      onChange={recomputeDirty}
    >
      <input type="hidden" name="id" value={animal.id} />

      {/* Geen eigen titel en geen knoppenbalk bovenaan: de naam van het dier
          staat al als paginatitel, en opslaan/annuleren verschijnen onderaan
          zodra er effectief iets gewijzigd is (story 10.33). */}

      {/* Success message */}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-sm font-medium text-emerald-800">
            Wijzigingen succesvol opgeslagen!
          </p>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-medium text-red-800">{globalError}</p>
        </div>
      )}

      {/* Basisgegevens + Identificatie */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#1b4332]">Basisgegevens</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="name" className={`block text-xs font-medium ${fieldErrors?.name ? "text-red-700" : "text-gray-600"}`}>
              Naam <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={animal.name}
              maxLength={100}
              autoComplete="off"
              aria-invalid={!!fieldErrors?.name || undefined}
              className={`mt-0.5 block w-full rounded-md border ${fieldErrors?.name ? "border-red-500" : "border-gray-300"} px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500`}
            />
            <FieldError errors={fieldErrors?.name} />
          </div>

          <div>
            <label htmlFor="aliasName" className="block text-xs font-medium text-gray-600">
              Schuilnaam
            </label>
            <input
              type="text"
              id="aliasName"
              name="aliasName"
              defaultValue={animal.aliasName ?? ""}
              maxLength={100}
              autoComplete="off"
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="IBN alias"
            />
          </div>

          <div>
            <label htmlFor="gender" className={`block text-xs font-medium ${fieldErrors?.gender ? "text-red-700" : "text-gray-600"}`}>
              Geslacht <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              defaultValue={animal.gender ?? ""}
              aria-invalid={!!fieldErrors?.gender || undefined}
              className={`mt-0.5 block w-full rounded-md border ${fieldErrors?.gender ? "border-red-500" : "border-gray-300"} px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500`}
            >
              <option value="">Selecteer...</option>
              <option value="mannelijk">&#9794; Mannelijk</option>
              <option value="vrouwelijk">&#9792; Vrouwelijk</option>
              <option value="onbekend">Onbekend</option>
            </select>
            <FieldError errors={fieldErrors?.gender} />
          </div>

          <div>
            <label htmlFor="breed" className="block text-xs font-medium text-gray-600">
              Ras
            </label>
            <input
              type="text"
              id="breed"
              name="breed"
              defaultValue={animal.breed ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-xs font-medium text-gray-600">
              Kleur
            </label>
            <input
              type="text"
              id="color"
              name="color"
              defaultValue={animal.color ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-xs font-medium text-gray-600">
              Geboortedatum
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              defaultValue={animal.dateOfBirth ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="intakeDate" className={`block text-xs font-medium ${fieldErrors?.intakeDate ? "text-red-700" : "text-gray-600"}`}>
              Intakedatum
            </label>
            <input
              type="date"
              id="intakeDate"
              name="intakeDate"
              defaultValue={animal.intakeDate ?? ""}
              aria-invalid={!!fieldErrors?.intakeDate || undefined}
              className={`mt-0.5 block w-full rounded-md border ${fieldErrors?.intakeDate ? "border-red-500" : "border-gray-300"} px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500`}
            />
            <FieldError errors={fieldErrors?.intakeDate} />
          </div>

          <div>
            <label htmlFor="intakeReason" className="block text-xs font-medium text-gray-600">
              Reden intake
            </label>
            <select
              id="intakeReason"
              name="intakeReason"
              value={intakeReason}
              onChange={(e) => setIntakeReason(e.target.value)}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">Niet opgegeven</option>
              {INTAKE_REASONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <NeuteredRadioGroup value={neuteredChoice} onChange={setNeuteredChoice} />

        {isNeutered && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="neuteredDate" className="block text-xs font-medium text-gray-600">
                  Datum sterilisatie/castratie
                </label>
                <input
                  type="date"
                  id="neuteredDate"
                  name="neuteredDate"
                  defaultValue={animal.neuteredDate ?? ""}
                  className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <input type="hidden" name="neuteredByShelter" value="false" />
                  <input
                    type="checkbox"
                    id="neuteredByShelter"
                    name="neuteredByShelter"
                    value="true"
                    defaultChecked={animal.neuteredByShelter ?? false}
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

        <h2 className="mt-4 border-t border-gray-100 pt-3 text-sm font-bold text-[#1b4332]">Identificatie</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="identificationNr" className="block text-xs font-medium text-gray-600">
              Chipnummer
            </label>
            <input
              type="text"
              id="identificationNr"
              name="identificationNr"
              defaultValue={animal.identificationNr ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <input type="hidden" name="isNewChip" value="false" />
              <input
                type="checkbox"
                id="isNewChip"
                name="isNewChip"
                value="true"
                defaultChecked={animal.isNewChip ?? false}
                className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="isNewChip" className="text-xs text-gray-600">Nieuwe chip</label>
            </div>
          </div>

          <div>
            <label htmlFor="passportNr" className="block text-xs font-medium text-gray-600">
              Paspoortnummer
            </label>
            <input
              type="text"
              id="passportNr"
              name="passportNr"
              defaultValue={animal.passportNr ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <input type="hidden" name="isNewPassport" value="false" />
              <input
                type="checkbox"
                id="isNewPassport"
                name="isNewPassport"
                value="true"
                defaultChecked={animal.isNewPassport ?? false}
                className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="isNewPassport" className="text-xs text-gray-600">Nieuw paspoort</label>
            </div>
          </div>
        </div>

        {/* Barcode — alleen voor honden */}
        {animal.species === "hond" && (
          <div className="mt-3">
            <label htmlFor="barcode" className="block text-xs font-medium text-gray-600">
              Barcode
            </label>
            <input
              type="text"
              id="barcode"
              name="barcode"
              defaultValue={animal.barcode ?? ""}
              readOnly
              className="mt-0.5 block w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-600"
            />
            <p className="mt-0.5 text-xs text-gray-400">Automatisch gegenereerd bij intake</p>
          </div>
        )}
      </div>

      {/* Inbeslagname (IBN) — bewerkbaar op de fiche (story 10.36). Verschijnt
          zodra "Inbeslagname" als reden gekozen is. Staat de sectie niet in het
          formulier, dan laat de action deze kolommen ongemoeid (formData.has). */}
      {intakeReason === "ibn" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-red-700">Inbeslagname (IBN)</h2>

          <div className="mt-3">
            <label htmlFor="ibnReason" className="block text-xs font-medium text-gray-600">
              Reden van inbeslagname
            </label>
            <AutoGrowTextarea
              id="ibnReason"
              name="ibnReason"
              rows={2}
              defaultValue={animal.ibnReason ?? ""}
              placeholder="Waarom is het dier in beslag genomen? Bijv. verwaarlozing, gerechtelijk bevel..."
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="dossierNr" className="block text-xs font-medium text-gray-600">
                Dossiernummer DWV
              </label>
              <input
                type="text"
                id="dossierNr"
                name="dossierNr"
                defaultValue={animal.dossierNr ?? ""}
                className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Bijv. DWV-2026-12345"
              />
            </div>
            <div>
              <label htmlFor="pvNr" className="block text-xs font-medium text-gray-600">
                PV-nummer politie
              </label>
              <input
                type="text"
                id="pvNr"
                name="pvNr"
                defaultValue={animal.pvNr ?? ""}
                className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Bijv. PV-2026-001"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="intakeMetadata.betrokkenInstanties" className="block text-xs font-medium text-gray-600">
                Betrokken instanties
              </label>
              <input
                type="text"
                id="intakeMetadata.betrokkenInstanties"
                name="intakeMetadata.betrokkenInstanties"
                defaultValue={meta.betrokkenInstanties ?? ""}
                className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Bijv. Politiezone Ninove, Dierenwelzijn Vlaanderen"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Beslissingsdeadline (60 dagen):{" "}
            <span className={`font-semibold ${
              animal.ibnDecisionDeadline && new Date(animal.ibnDecisionDeadline) <= new Date()
                ? "text-red-700"
                : "text-gray-800"
            }`}>
              {animal.ibnDecisionDeadline || "—"}
            </span>{" "}
            <span className="text-gray-400">(automatisch berekend bij intake)</span>
          </p>
        </div>
      )}

      {/* Herkomst / melding — naam en adres van wie het dier meldde of bracht.
          Zichtbaar bij ophaling, IBN of vondeling (story 10.35/10.36). */}
      {showMelderDetails && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-amber-800">Herkomst / melding</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="intakeMetadata.melderNaam" className="block text-xs font-medium text-gray-600">
                Naam melder / brenger
              </label>
              <input
                type="text"
                id="intakeMetadata.melderNaam"
                name="intakeMetadata.melderNaam"
                defaultValue={meta.melderNaam ?? ""}
                className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Naam van wie gemeld of gebracht heeft"
              />
            </div>
            <div>
              <label htmlFor="intakeMetadata.melderDatum" className="block text-xs font-medium text-gray-600">
                Datum melding
              </label>
              <input
                type="date"
                id="intakeMetadata.melderDatum"
                name="intakeMetadata.melderDatum"
                defaultValue={meta.melderDatum ?? ""}
                className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="intakeMetadata.melderLocatie" className="block text-xs font-medium text-gray-600">
                Adres / vindplaats
              </label>
              <input
                type="text"
                id="intakeMetadata.melderLocatie"
                name="intakeMetadata.melderLocatie"
                defaultValue={meta.melderLocatie ?? ""}
                className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Adres of plaats waar het dier gevonden of gebracht is"
              />
            </div>
          </div>
        </div>
      )}

      {/* Beschrijving + publicatiekanalen */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#1b4332]">Beschrijving &amp; publicatie kanalen</h2>

        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-6 border-b border-gray-100 pb-3">
            <label className="flex items-center gap-2">
              <input type="hidden" name="isOnWebsite" value="false" />
              <input
                type="checkbox"
                name="isOnWebsite"
                value="true"
                defaultChecked={animal.isOnWebsite ?? false}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Zichtbaar op website</span>
            </label>

            <label className="flex items-center gap-2">
              <input type="hidden" name="isFeatured" value="false" />
              <input
                type="checkbox"
                name="isFeatured"
                value="true"
                defaultChecked={animal.isFeatured ?? false}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">&apos;In de kijker&apos; op website</span>
            </label>

            <label className="flex items-center gap-2">
              <input type="hidden" name="isOnPoster" value="false" />
              <input
                type="checkbox"
                name="isOnPoster"
                value="true"
                defaultChecked={animal.isOnPoster ?? false}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">op affiche</span>
            </label>

            {/* Affiche voor het bord buiten — losstaand van het opslaan van het
                formulier (opent het PDF in een nieuw tabblad). */}
            <a
              href={`/api/dieren/${animal.id}/affiche/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Affiche (PDF)
            </a>
          </div>

          <div>
            <label htmlFor="shortDescription" className="block text-xs font-medium text-gray-600">
              Korte beschrijving
            </label>
            <AutoGrowTextarea
              id="shortDescription"
              name="shortDescription"
              rows={4}
              maxLength={SHORT_DESCRIPTION_MAX}
              defaultValue={animal.shortDescription ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Max. {SHORT_DESCRIPTION_MAX} tekens — dit is de samenvatting op de dierenkaartjes.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-600">
              Uitgebreide beschrijving
            </label>
            <AutoGrowTextarea
              id="description"
              name="description"
              ref={descriptionRef}
              rows={10}
              defaultValue={animal.description ?? ""}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Werktekst — hiervan kan je hieronder overnemen naar de website en de affiche.
            </p>
          </div>

          <DerivedDescription
            id="websiteDescription"
            title="Beschrijving op website"
            hint="Leeg = de uitgebreide beschrijving wordt op de website getoond."
            defaultValue={animal.websiteDescription ?? ""}
            sourceRef={descriptionRef}
          />

          <DerivedDescription
            id="posterDescription"
            title="Beschrijving op affiche"
            hint="Leeg = de uitgebreide beschrijving komt op de affiche voor het bord buiten."
            defaultValue={animal.posterDescription ?? ""}
            sourceRef={descriptionRef}
          />
        </div>
      </div>

      {isDirty && <UnsavedChangesBar isPending={isPending} />}
    </form>
  );
}
