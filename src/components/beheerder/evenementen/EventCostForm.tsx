"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createEventCost,
  updateEventCost,
  type EventCostRow,
} from "@/lib/actions/event-costs";
import { categoriesForKind, type CostKind } from "@/lib/events/costs";

interface Props {
  eventId: number;
  /** Kant waarop de nieuwe lijn komt (bij bewerken die van de lijn zelf). */
  kind: CostKind;
  line?: EventCostRow;
  onDone: () => void;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

export default function EventCostForm({ eventId, kind, line, onDone }: Props) {
  const router = useRouter();
  const action = line ? updateEventCost : createEventCost;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;
  const sleutel = line?.id ?? "nieuw";

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="kind" value={kind} />
      {line && <input type="hidden" name="id" value={line.id} />}

      {globalError && <p className="mb-2 text-sm text-red-600">{globalError}</p>}

      <div className="grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label htmlFor={`description-${sleutel}`} className={LABEL}>
            Omschrijving <span className="text-red-500">*</span>
          </label>
          <input
            id={`description-${sleutel}`}
            name="description"
            defaultValue={line?.description ?? ""}
            className={INPUT}
            placeholder={kind === "kost" ? "Bijv. Drank bij de brouwer" : "Bijv. Opbrengst tombola"}
          />
          {fieldErrors?.description && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.description[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`category-${sleutel}`} className={LABEL}>
            Categorie <span className="text-red-500">*</span>
          </label>
          <select
            id={`category-${sleutel}`}
            name="category"
            defaultValue={line?.category ?? ""}
            className={INPUT}
          >
            <option value="">Selecteer...</option>
            {categoriesForKind(kind).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          {fieldErrors?.category && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.category[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`budgetAmount-${sleutel}`} className={LABEL}>
            Begroot (€)
          </label>
          <input
            id={`budgetAmount-${sleutel}`}
            name="budgetAmount"
            inputMode="decimal"
            defaultValue={line?.budgetAmount ?? ""}
            className={INPUT}
            placeholder="400"
          />
          {fieldErrors?.budgetAmount && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.budgetAmount[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`actualAmount-${sleutel}`} className={LABEL}>
            Werkelijk (€)
          </label>
          <input
            id={`actualAmount-${sleutel}`}
            name="actualAmount"
            inputMode="decimal"
            defaultValue={line?.actualAmount ?? ""}
            className={INPUT}
            placeholder="560,50"
          />
          {fieldErrors?.actualAmount && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.actualAmount[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`supplier-${sleutel}`} className={LABEL}>
            {kind === "kost" ? "Leverancier" : "Van wie"}
          </label>
          <input
            id={`supplier-${sleutel}`}
            name="supplier"
            defaultValue={line?.supplier ?? ""}
            className={INPUT}
            placeholder={kind === "kost" ? "Bijv. Brouwerij De Ryck" : "Bijv. Garage Van Den Bossche"}
          />
        </div>

        <div className="sm:col-span-6 flex items-center gap-2">
          {/* hidden + checkbox: zonder de hidden komt een uitgevinkt vakje niet mee. */}
          <input type="hidden" name="paid" value="false" />
          <input
            type="checkbox"
            id={`paid-${sleutel}`}
            name="paid"
            value="true"
            defaultChecked={line?.paid ?? false}
            className="h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f]"
          />
          <label htmlFor={`paid-${sleutel}`} className="text-sm text-gray-700">
            {kind === "kost" ? "Betaald" : "Ontvangen"}
          </label>
        </div>
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
