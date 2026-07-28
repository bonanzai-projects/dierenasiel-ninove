"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvent, updateEvent, type EventRow } from "@/lib/actions/events";
import { EVENT_TYPES, EVENT_STATUSES } from "@/lib/events/types";

interface EventFormProps {
  mode: "create" | "edit";
  event?: EventRow;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

export default function EventForm({ mode, event }: EventFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createEvent : updateEvent;
  const [state, formAction, isPending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      router.push(`/beheerder/evenementen/${state.data.id}`);
    }
  }, [state, router]);

  // React 19 leegt ongecontroleerde velden ná een Server Action, ook bij een
  // fout. De actie geeft de ingevulde waarden terug; die zetten we hier terug.
  const values = state && !state.success ? state.values : undefined;
  useEffect(() => {
    if (!values || !formRef.current) return;
    for (const [naam, waarde] of Object.entries(values)) {
      const veld = formRef.current.elements.namedItem(naam);
      if (veld instanceof HTMLInputElement || veld instanceof HTMLTextAreaElement || veld instanceof HTMLSelectElement) {
        veld.value = waarde;
      }
    }
  }, [values]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      {mode === "edit" && event && <input type="hidden" name="id" value={event.id} />}

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-medium text-red-800">{globalError}</p>
        </div>
      )}

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={LABEL}>
              Naam <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              defaultValue={event?.name ?? ""}
              className={INPUT}
              placeholder="Bijv. Eetkermis 2026"
            />
            <FieldError errors={fieldErrors?.name} />
          </div>

          <div>
            <label htmlFor="type" className={LABEL}>
              Type <span className="text-red-500">*</span>
            </label>
            <select id="type" name="type" defaultValue={event?.type ?? ""} className={INPUT}>
              <option value="">Selecteer...</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors?.type} />
          </div>

          <div>
            <label htmlFor="status" className={LABEL}>
              Status <span className="text-red-500">*</span>
            </label>
            <select id="status" name="status" defaultValue={event?.status ?? "gepland"} className={INPUT}>
              {EVENT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors?.status} />
          </div>

          <div>
            <label htmlFor="date" className={LABEL}>
              Begindatum <span className="text-red-500">*</span>
            </label>
            <input type="date" id="date" name="date" defaultValue={event?.date ?? ""} className={INPUT} />
            <FieldError errors={fieldErrors?.date} />
          </div>

          <div>
            <label htmlFor="endDate" className={LABEL}>
              Einddatum (optioneel)
            </label>
            <input type="date" id="endDate" name="endDate" defaultValue={event?.endDate ?? ""} className={INPUT} />
            <FieldError errors={fieldErrors?.endDate} />
          </div>

          <div>
            <label htmlFor="startTime" className={LABEL}>
              Beginuur (leeg = hele dag)
            </label>
            <input type="time" id="startTime" name="startTime" defaultValue={event?.startTime ?? ""} className={INPUT} />
            <FieldError errors={fieldErrors?.startTime} />
          </div>

          <div>
            <label htmlFor="endTime" className={LABEL}>
              Einduur (optioneel)
            </label>
            <input type="time" id="endTime" name="endTime" defaultValue={event?.endTime ?? ""} className={INPUT} />
            <FieldError errors={fieldErrors?.endTime} />
          </div>

          <div>
            <label htmlFor="location" className={LABEL}>
              Locatie (optioneel)
            </label>
            <input
              id="location"
              name="location"
              defaultValue={event?.location ?? ""}
              className={INPUT}
              placeholder="Bijv. Parochiezaal Ninove"
            />
          </div>

          <div>
            <label htmlFor="responsible" className={LABEL}>
              Verantwoordelijke (optioneel)
            </label>
            <input
              id="responsible"
              name="responsible"
              defaultValue={event?.responsible ?? ""}
              className={INPUT}
              placeholder="Wie trekt dit evenement?"
            />
          </div>

          <div>
            <label htmlFor="expectedVisitors" className={LABEL}>
              Verwachte bezoekers (optioneel)
            </label>
            <input
              type="number"
              min={1}
              id="expectedVisitors"
              name="expectedVisitors"
              defaultValue={event?.expectedVisitors ?? ""}
              className={INPUT}
            />
            <FieldError errors={fieldErrors?.expectedVisitors} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={LABEL}>
              Omschrijving (optioneel)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={event?.description ?? ""}
              className={INPUT}
              placeholder="Wat is het opzet? Waarvoor dient de opbrengst?"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          href={mode === "edit" && event ? `/beheerder/evenementen/${event.id}` : "/beheerder/evenementen"}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1b4332] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
