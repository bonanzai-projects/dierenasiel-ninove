"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createEventMaterial,
  updateEventMaterial,
  type EventMaterialRow,
} from "@/lib/actions/event-materials";
import { MATERIAL_ORIGINS } from "@/lib/events/materials";

interface Props {
  eventId: number;
  material?: EventMaterialRow;
  onDone: () => void;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

export default function EventMaterialForm({ eventId, material, onDone }: Props) {
  const router = useRouter();
  const action = material ? updateEventMaterial : createEventMaterial;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;
  const sleutel = material?.id ?? "nieuw";

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3"
    >
      <input type="hidden" name="eventId" value={eventId} />
      {material && <input type="hidden" name="id" value={material.id} />}

      {globalError && <p className="mb-2 text-sm text-red-600">{globalError}</p>}

      <div className="grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor={`name-${sleutel}`} className={LABEL}>
            Wat <span className="text-red-500">*</span>
          </label>
          <input
            id={`name-${sleutel}`}
            name="name"
            defaultValue={material?.name ?? ""}
            className={INPUT}
            placeholder="Bijv. Tent 4x8, frigo, statafels"
          />
          {fieldErrors?.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name[0]}</p>}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor={`quantity-${sleutel}`} className={LABEL}>
            Aantal
          </label>
          <input
            id={`quantity-${sleutel}`}
            name="quantity"
            inputMode="numeric"
            defaultValue={material?.quantity ?? ""}
            className={INPUT}
          />
          {fieldErrors?.quantity && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.quantity[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`origin-${sleutel}`} className={LABEL}>
            Waar vandaan <span className="text-red-500">*</span>
          </label>
          <select
            id={`origin-${sleutel}`}
            name="origin"
            defaultValue={material?.origin ?? "eigen"}
            className={INPUT}
          >
            {MATERIAL_ORIGINS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {fieldErrors?.origin && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.origin[0]}</p>
          )}
        </div>

        <div className="sm:col-span-3">
          <label htmlFor={`supplier-${sleutel}`} className={LABEL}>
            Van wie
          </label>
          <input
            id={`supplier-${sleutel}`}
            name="supplier"
            defaultValue={material?.supplier ?? ""}
            className={INPUT}
            placeholder="Bijv. Chiro Ninove, gemeente, verhuur Van Damme"
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor={`notes-${sleutel}`} className={LABEL}>
            Nota (optioneel)
          </label>
          <input
            id={`notes-${sleutel}`}
            name="notes"
            defaultValue={material?.notes ?? ""}
            className={INPUT}
            placeholder="Bijv. zelf op te halen op vrijdag"
          />
        </div>

        <div className="sm:col-span-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="hidden" name="arranged" value="false" />
            <input
              type="checkbox"
              id={`arranged-${sleutel}`}
              name="arranged"
              value="true"
              defaultChecked={material?.arranged ?? false}
              className="h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f]"
            />
            <label htmlFor={`arranged-${sleutel}`} className="text-sm text-gray-700">
              Geregeld
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input type="hidden" name="returned" value="false" />
            <input
              type="checkbox"
              id={`returned-${sleutel}`}
              name="returned"
              value="true"
              defaultChecked={material?.returned ?? false}
              className="h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f]"
            />
            <label htmlFor={`returned-${sleutel}`} className="text-sm text-gray-700">
              Terugbezorgd
            </label>
          </div>
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
