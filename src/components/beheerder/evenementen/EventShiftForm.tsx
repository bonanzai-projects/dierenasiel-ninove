"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createEventShift,
  updateEventShift,
  type EventShiftRow,
} from "@/lib/actions/event-shifts";
import { SHIFT_POSTS } from "@/lib/events/shifts";

interface Props {
  eventId: number;
  /** Dag waarop een nieuwe shift standaard komt (de begindatum van het evenement). */
  defaultDate: string;
  shift?: EventShiftRow;
  onDone: () => void;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

export default function EventShiftForm({ eventId, defaultDate, shift, onDone }: Props) {
  const router = useRouter();
  const action = shift ? updateEventShift : createEventShift;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;
  const sleutel = shift?.id ?? "nieuw";

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3"
    >
      <input type="hidden" name="eventId" value={eventId} />
      {shift && <input type="hidden" name="id" value={shift.id} />}

      {globalError && <p className="mb-2 text-sm text-red-600">{globalError}</p>}

      <div className="grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor={`personName-${sleutel}`} className={LABEL}>
            Wie <span className="text-red-500">*</span>
          </label>
          <input
            id={`personName-${sleutel}`}
            name="personName"
            defaultValue={shift?.personName ?? ""}
            className={INPUT}
            placeholder="Naam van de vrijwilliger"
          />
          {fieldErrors?.personName && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.personName[0]}</p>
          )}
        </div>

        <div className="sm:col-span-3">
          <label htmlFor={`post-${sleutel}`} className={LABEL}>
            Waar <span className="text-red-500">*</span>
          </label>
          {/* Voorstellen, geen keurslijf: een marktkraam heeft geen frituur. */}
          <input
            id={`post-${sleutel}`}
            name="post"
            list={`posten-${sleutel}`}
            defaultValue={shift?.post ?? ""}
            className={INPUT}
            placeholder="Bijv. Bar"
          />
          <datalist id={`posten-${sleutel}`}>
            {SHIFT_POSTS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {fieldErrors?.post && <p className="mt-1 text-sm text-red-600">{fieldErrors.post[0]}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`date-${sleutel}`} className={LABEL}>
            Dag <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id={`date-${sleutel}`}
            name="date"
            defaultValue={shift?.date ?? defaultDate}
            className={INPUT}
          />
          {fieldErrors?.date && <p className="mt-1 text-sm text-red-600">{fieldErrors.date[0]}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`startTime-${sleutel}`} className={LABEL}>
            Van
          </label>
          <input
            type="time"
            id={`startTime-${sleutel}`}
            name="startTime"
            defaultValue={shift?.startTime ?? ""}
            className={INPUT}
          />
          {fieldErrors?.startTime && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.startTime[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`endTime-${sleutel}`} className={LABEL}>
            Tot
          </label>
          <input
            type="time"
            id={`endTime-${sleutel}`}
            name="endTime"
            defaultValue={shift?.endTime ?? ""}
            className={INPUT}
          />
          {fieldErrors?.endTime && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.endTime[0]}</p>
          )}
        </div>

        <div className="sm:col-span-6">
          <label htmlFor={`notes-${sleutel}`} className={LABEL}>
            Nota (optioneel)
          </label>
          <input
            id={`notes-${sleutel}`}
            name="notes"
            defaultValue={shift?.notes ?? ""}
            className={INPUT}
            placeholder="Bijv. komt met eigen wagen, kan enkel tot 21u"
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Laat de uren leeg voor iemand die er de hele dag is.
      </p>

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
