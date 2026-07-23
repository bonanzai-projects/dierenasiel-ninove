"use client";

import { useState, useActionState } from "react";
import { createDeworming, deleteDeworming } from "@/lib/actions/dewormings";
import {
  DEWORMING_TYPES,
  DEWORMING_CATEGORIES,
  DEWORMING_CATEGORY_LABELS,
  type DewormingCategory,
} from "@/lib/validations/dewormings";
import type { Deworming } from "@/types";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p role="alert" className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

interface DewormingSectionProps {
  animalId: number;
  dewormings: Deworming[];
}

export default function DewormingSection({ animalId, dewormings }: DewormingSectionProps) {
  const [view, setView] = useState<"list" | "form">("list");
  // Story 10.31: dezelfde sectie registreert ontworming én vlooienbehandeling.
  const [category, setCategory] = useState<DewormingCategory>("ontworming");
  const [createState, createAction, isPending] = useActionState(createDeworming, null);
  const fieldErrors = createState && !createState.success ? createState.fieldErrors : undefined;
  const globalError = createState && !createState.success ? createState.error : undefined;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            view === "list"
              ? "bg-[#1b4332] text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Overzicht ({dewormings.length})
        </button>
        <button
          type="button"
          onClick={() => setView("form")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            view === "form"
              ? "bg-[#1b4332] text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Nieuwe behandeling
        </button>
      </div>

      {view === "list" ? (
        dewormings.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen ontwormingen of vlooienbehandelingen geregistreerd.</p>
        ) : (
          <div className="space-y-2">
            {dewormings.map((d) => (
              <DewormingRow key={d.id} deworming={d} />
            ))}
          </div>
        )
      ) : (
        <form action={createAction} className="space-y-4">
          {createState?.success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-800">Behandeling geregistreerd!</p>
            </div>
          )}
          {globalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{globalError}</p>
            </div>
          )}

          <input type="hidden" name="animalId" value={animalId} />

          <div>
            <label htmlFor="dew-category" className="block text-sm font-medium text-gray-700">
              Categorie <span className="text-red-500">*</span>
            </label>
            <select
              id="dew-category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DewormingCategory)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500 sm:w-1/2"
            >
              {DEWORMING_CATEGORIES.map((c) => (
                <option key={c} value={c}>{DEWORMING_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <FieldError errors={fieldErrors?.category} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dew-type" className="block text-sm font-medium text-gray-700">
                {category === "vlooien" ? "Product" : "Type"} <span className="text-red-500">*</span>
              </label>
              {category === "vlooien" ? (
                <input
                  type="text"
                  id="dew-type"
                  name="type"
                  required
                  maxLength={50}
                  placeholder="bv. Frontline spot-on"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              ) : (
                <select
                  id="dew-type"
                  name="type"
                  required
                  defaultValue=""
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                >
                  <option value="" disabled>Kies type...</option>
                  {DEWORMING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
              <FieldError errors={fieldErrors?.type} />
            </div>

            <div>
              <label htmlFor="dew-date" className="block text-sm font-medium text-gray-700">
                Datum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dew-date"
                name="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
              <FieldError errors={fieldErrors?.date} />
            </div>
          </div>

          <div>
            <label htmlFor="dew-notes" className="block text-sm font-medium text-gray-700">
              Opmerkingen
            </label>
            <textarea
              id="dew-notes"
              name="notes"
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#1b4332] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
            >
              {isPending
                ? "Bezig met opslaan..."
                : category === "vlooien"
                  ? "Vlooienbehandeling registreren"
                  : "Ontworming registreren"}
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function DewormingRow({ deworming }: { deworming: Deworming }) {
  const [state, formAction, isPending] = useActionState(deleteDeworming, null);

  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              deworming.category === "vlooien"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {DEWORMING_CATEGORY_LABELS[deworming.category as DewormingCategory] ?? deworming.category}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {deworming.type}
          </span>
          <span className="text-sm font-medium text-gray-800">{deworming.date}</span>
        </div>
        {deworming.notes && (
          <p className="text-xs text-gray-500">{deworming.notes}</p>
        )}
        {state && !state.success && (
          <p className="text-xs text-red-600">{state.error}</p>
        )}
      </div>
      <form action={formAction}>
        <input type="hidden" name="id" value={deworming.id} />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Verwijderen"}
        </button>
      </form>
    </div>
  );
}
