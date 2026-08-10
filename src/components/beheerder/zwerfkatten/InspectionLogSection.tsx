"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addInspectionAction } from "@/lib/actions/stray-cat-campaigns";
import type { InspectionWithCages } from "@/lib/queries/stray-cat-campaigns";
import { catchSummary } from "@/lib/stray-cats/inspection-cages";
import type { ActionResult } from "@/types";

interface Props {
  campaignId: number;
  inspections: InspectionWithCages[];
  /** Kooicodes die bij deze campagne uitgezet zijn. */
  deployedCages: string[];
}

async function handleAdd(prev: ActionResult | null, formData: FormData) {
  return addInspectionAction({
    campaignId: Number(formData.get("campaignId")),
    inspectionDate: formData.get("inspectionDate") as string,
    wasSuccessful: formData.get("wasSuccessful") === "on",
    caughtCages: formData.getAll("caughtCages").map(String),
    notes: (formData.get("notes") as string) || "",
  });
}

export default function InspectionLogSection({ campaignId, inspections, deployedCages }: Props) {
  const [state, formAction, isPending] = useActionState(handleAdd, null);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      setShowForm(false);
    }
  }, [state, router]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Kooi-inspecties
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {inspections.length}
          </span>
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            + Kooi-inspectie toevoegen
          </button>
        )}
      </div>
      <p className="mb-4 text-xs italic text-gray-500">
        Log van kooi-rondes: medewerkers van het asiel lopen alle uitgezette kooien af om te kijken of er katten gevangen zijn.
      </p>

      {inspections.length === 0 && !showForm && (
        <p className="py-4 text-center text-sm text-gray-400">
          Nog geen kooi-inspecties geregistreerd.
        </p>
      )}

      {inspections.length > 0 && (
        <ul className="mb-4 divide-y divide-gray-100">
          {inspections.map((entry) => (
            <li
              key={entry.id}
              className="grid grid-cols-[7rem_5.5rem_1fr] items-start gap-3 py-2.5 text-sm"
            >
              <span className="font-medium text-gray-700 tabular-nums">
                {entry.inspectionDate}
              </span>
              <span
                className={`inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  entry.wasSuccessful
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {entry.wasSuccessful ? "✓ vangst" : "— leeg"}
              </span>
              <div className="text-gray-600">
                {entry.cages.length > 0 && (
                  <p className="flex flex-wrap gap-1">
                    {entry.cages.map((cage) => (
                      <span
                        key={cage.cageCode}
                        title={cage.caught ? "vangst" : "geen vangst"}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          cage.caught
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {cage.cageCode}
                      </span>
                    ))}
                  </p>
                )}
                {entry.notes && <p className="mt-0.5">{entry.notes}</p>}
                {(entry.recordedByName || entry.cages.length > 0) && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {catchSummary(entry.cages)}
                    {catchSummary(entry.cages) && entry.recordedByName ? " · " : ""}
                    {entry.recordedByName ? `geregistreerd door ${entry.recordedByName}` : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form action={formAction} className="space-y-3 rounded-lg bg-gray-50 p-4">
          <input type="hidden" name="campaignId" value={campaignId} />
          {state && !state.success && state.error && (
            <div className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{state.error}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="inspectionDate" className="block text-xs font-medium text-gray-700">
                Datum *
              </label>
              <input
                type="date"
                id="inspectionDate"
                name="inspectionDate"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            {deployedCages.length === 0 && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="wasSuccessful"
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Vangst (kat in kooi)
                </label>
              </div>
            )}
          </div>

          {deployedCages.length > 0 && (
            <fieldset>
              <legend className="block text-xs font-medium text-gray-700">
                Vangst per kooi
              </legend>
              <p className="mb-1.5 text-xs text-gray-500">
                Vink de kooien aan waar een kat in zat. Niets aangevinkt = lege ronde.
              </p>
              <div className="flex flex-wrap gap-2">
                {deployedCages.map((code) => (
                  <label
                    key={code}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 hover:border-emerald-500"
                  >
                    <input
                      type="checkbox"
                      name="caughtCages"
                      value={code}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {code}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-gray-700">
              Notities
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Bv. niets in kooien, kat te schuw..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "Bezig..." : "Kooi-inspectie opslaan"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
