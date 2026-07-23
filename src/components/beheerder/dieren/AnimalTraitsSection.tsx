"use client";

import { useActionState } from "react";
import { saveAnimalTraits } from "@/lib/actions/animal-traits";
import {
  ANIMAL_TRAITS,
  ANIMAL_TRAIT_VALUES,
  ANIMAL_TRAIT_VALUE_LABELS,
  type AnimalTraits,
} from "@/lib/animals/animal-traits";

/**
 * Story 10.32 — de omgangseigenschappen van het dier, beheerd op de plek waar
 * alle andere diergegevens staan. Deze waarden verschijnen op de affiche voor
 * het bord buiten; ras, geslacht, steriel en geboortedatum komen van het dier
 * zelf en worden dus in het gewone bewerkformulier onderhouden.
 */
export default function AnimalTraitsSection({
  animalId,
  traits,
}: {
  animalId: number;
  traits: AnimalTraits;
}) {
  const [state, formAction, isPending] = useActionState(saveAnimalTraits, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="animalId" value={animalId} />

      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">
            {state.message ?? "Opgeslagen!"}
          </p>
        </div>
      )}
      {state && !state.success && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{state.error}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ANIMAL_TRAITS.map((trait) => (
          <div key={trait.key}>
            <label
              htmlFor={`trait_${trait.key}`}
              className="block text-xs font-medium text-gray-600"
            >
              {trait.label}
            </label>
            <select
              id={`trait_${trait.key}`}
              name={`trait_${trait.key}`}
              defaultValue={traits[trait.key] ?? "niet_gekend"}
              className="mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              {ANIMAL_TRAIT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {ANIMAL_TRAIT_VALUE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1b4332] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Bezig met opslaan..." : "Eigenschappen opslaan"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Deze eigenschappen verschijnen op de affiche voor het bord buiten. De
        affiche zelf genereer je via de knop &laquo;Affiche (PDF)&raquo; op het
        tabblad &laquo;Overzicht&raquo;, bij de publicatiekanalen. De naam,
        foto&apos;s, ras, geslacht, steriel, geboortedatum en beschrijving komen
        eveneens van het dier zelf.
      </p>
    </form>
  );
}
