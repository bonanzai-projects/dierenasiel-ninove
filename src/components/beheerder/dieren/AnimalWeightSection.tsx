"use client";

import { useState, useActionState } from "react";
import { createAnimalWeight, deleteAnimalWeight } from "@/lib/actions/animal-weights";
import {
  formatWeight,
  formatWeightDelta,
  withWeightDeltas,
  weightSummary,
  buildWeightChart,
} from "@/lib/animals/weight";
import { todayInBrussels } from "@/lib/validations/animal-weights";
import type { WeighingWithRecorder } from "@/lib/queries/animal-weights";

interface AnimalWeightSectionProps {
  animalId: number;
  weighings: WeighingWithRecorder[];
}

const CHART_W = 320;
const CHART_H = 60;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p role="alert" className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

export default function AnimalWeightSection({ animalId, weighings }: AnimalWeightSectionProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [createState, createAction, isPending] = useActionState(createAnimalWeight, null);
  const fieldErrors = createState && !createState.success ? createState.fieldErrors : undefined;
  const globalError = createState && !createState.success ? createState.error : undefined;

  const rijen = withWeightDeltas(weighings);
  const samenvatting = weightSummary(weighings);
  const grafiek = buildWeightChart(weighings, CHART_W, CHART_H);

  return (
    <div>
      {/* Kop: huidig gewicht en de evolutie sinds de eerste weging */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p aria-label="Huidig gewicht" className="text-2xl font-bold text-[#1b4332]">
            {formatWeight(samenvatting.latest?.weightKg ?? null)}
          </p>
          {samenvatting.totalChange !== null && (
            <p className="mt-0.5 text-xs text-gray-500">
              {formatWeightDelta(samenvatting.totalChange) || "Geen verschil"} sinds de eerste
              weging ({samenvatting.first?.date})
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setView(view === "form" ? "list" : "form")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            view === "form"
              ? "bg-[#1b4332] text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Weging toevoegen
        </button>
      </div>

      {/* Evolutie — pas zinvol vanaf twee wegingen */}
      {grafiek.dots.length > 1 && (
        <svg
          viewBox={`-4 -4 ${CHART_W + 8} ${CHART_H + 8}`}
          className="mb-4 w-full max-w-md"
          role="img"
          aria-label="Verloop van het gewicht"
        >
          <path d={grafiek.path} fill="none" stroke="#1b4332" strokeWidth="2" />
          {grafiek.dots.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r="3" fill="#1b4332" />
          ))}
        </svg>
      )}

      {view === "form" && (
        <form action={createAction} className="mb-4 space-y-3 rounded-lg border border-gray-200 p-3">
          {createState?.success && (
            <p className="text-sm font-medium text-emerald-700">Weging geregistreerd.</p>
          )}
          {globalError && <p className="text-sm font-medium text-red-700">{globalError}</p>}

          <input type="hidden" name="animalId" value={animalId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="weight-kg" className="block text-sm font-medium text-gray-700">
                Gewicht in kg <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="weight-kg"
                name="weightKg"
                required
                placeholder="bv. 32,5"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
              <FieldError errors={fieldErrors?.weightKg} />
            </div>

            <div>
              <label htmlFor="weight-date" className="block text-sm font-medium text-gray-700">
                Datum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="weight-date"
                name="date"
                required
                defaultValue={todayInBrussels()}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
              <FieldError errors={fieldErrors?.date} />
            </div>
          </div>

          <div>
            <label htmlFor="weight-notes" className="block text-sm font-medium text-gray-700">
              Opmerking
            </label>
            <input
              type="text"
              id="weight-notes"
              name="notes"
              maxLength={500}
              placeholder="bv. voor de ontworming"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#1b4332] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
            >
              {isPending ? "Bezig..." : "Bewaren"}
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      {rijen.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nog geen wegingen geregistreerd.
        </p>
      ) : (
        <ul className="space-y-2">
          {rijen.map((rij) => (
            <WeighingRow key={rij.id} weighing={rij} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WeighingRow({
  weighing,
}: {
  weighing: WeighingWithRecorder & { delta: number | null };
}) {
  const [state, formAction, isPending] = useActionState(deleteAnimalWeight, null);
  const verschil = formatWeightDelta(weighing.delta);

  return (
    <li className="flex items-start justify-between rounded-lg border border-gray-200 px-4 py-2">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{weighing.date}</span>
          <span className="text-sm font-semibold text-[#1b4332]">
            {formatWeight(weighing.weightKg)}
          </span>
          {verschil && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                (weighing.delta ?? 0) > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {verschil}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          {weighing.recordedByName ? `Gewogen door ${weighing.recordedByName}` : ""}
          {weighing.recordedByName && weighing.notes ? " · " : ""}
          {weighing.notes ?? ""}
        </p>
        {state && !state.success && (
          <p className="text-xs text-red-600">{state.error}</p>
        )}
      </div>

      <form action={formAction}>
        <input type="hidden" name="id" value={weighing.id} />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Verwijderen"}
        </button>
      </form>
    </li>
  );
}
