"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createEventTask,
  updateEventTask,
  type EventTaskRow,
} from "@/lib/actions/event-tasks";

interface EventTaskFormProps {
  eventId: number;
  /** Fase waarin de nieuwe taak komt (bij bewerken die van de taak zelf). */
  phase: string;
  task?: EventTaskRow;
  onDone: () => void;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

export default function EventTaskForm({ eventId, phase, task, onDone }: EventTaskFormProps) {
  const router = useRouter();
  const action = task ? updateEventTask : createEventTask;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;

  return (
    <form action={formAction} noValidate className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="phase" value={phase} />
      {task && <input type="hidden" name="id" value={task.id} />}

      {globalError && <p className="mb-2 text-sm text-red-600">{globalError}</p>}

      <div className="grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label htmlFor={`title-${task?.id ?? "nieuw"}`} className={LABEL}>
            Taak <span className="text-red-500">*</span>
          </label>
          <input
            id={`title-${task?.id ?? "nieuw"}`}
            name="title"
            defaultValue={task?.title ?? ""}
            className={INPUT}
            placeholder="Bijv. Drank bestellen bij de brouwer"
          />
          {fieldErrors?.title && <p className="mt-1 text-sm text-red-600">{fieldErrors.title[0]}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`date-${task?.id ?? "nieuw"}`} className={LABEL}>
            Datum
          </label>
          <input
            type="date"
            id={`date-${task?.id ?? "nieuw"}`}
            name="date"
            defaultValue={task?.date ?? ""}
            className={INPUT}
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor={`time-${task?.id ?? "nieuw"}`} className={LABEL}>
            Uur
          </label>
          <input
            type="time"
            id={`time-${task?.id ?? "nieuw"}`}
            name="time"
            defaultValue={task?.time ?? ""}
            className={INPUT}
          />
          {fieldErrors?.time && <p className="mt-1 text-sm text-red-600">{fieldErrors.time[0]}</p>}
        </div>

        <div className="sm:col-span-3">
          <label htmlFor={`responsible-${task?.id ?? "nieuw"}`} className={LABEL}>
            Wie
          </label>
          <input
            id={`responsible-${task?.id ?? "nieuw"}`}
            name="responsible"
            defaultValue={task?.responsible ?? ""}
            className={INPUT}
            placeholder="Naam van de vrijwilliger"
          />
        </div>

        <div className="sm:col-span-6">
          <label htmlFor={`notes-${task?.id ?? "nieuw"}`} className={LABEL}>
            Nota (optioneel)
          </label>
          <input
            id={`notes-${task?.id ?? "nieuw"}`}
            name="notes"
            defaultValue={task?.notes ?? ""}
            className={INPUT}
            placeholder="Bijv. telefoonnummer, afgesproken prijs"
          />
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
