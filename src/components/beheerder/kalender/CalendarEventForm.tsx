"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCalendarEvent, updateCalendarEvent, type CalendarEventRow } from "@/lib/actions/calendar-events";
import { CALENDAR_MANUAL_CATEGORIES } from "@/lib/calendar/categories";

interface AnimalOption {
  id: number;
  name: string;
}

interface CalendarEventFormProps {
  mode: "create" | "edit";
  event?: CalendarEventRow;
  animals: AnimalOption[];
}

const INPUT = "mt-0.5 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

export default function CalendarEventForm({ mode, event, animals }: CalendarEventFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createCalendarEvent : updateCalendarEvent;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) router.push("/beheerder/kalender");
  }, [state, router]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;

  return (
    <form action={formAction} noValidate className="space-y-4">
      {mode === "edit" && event && <input type="hidden" name="id" value={event.id} />}

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-medium text-red-800">{globalError}</p>
        </div>
      )}

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={LABEL}>
              Titel <span className="text-red-500">*</span>
            </label>
            <input id="title" name="title" defaultValue={event?.title ?? ""} className={INPUT} placeholder="Bijv. Eetfestijn, stage Lisa, afstand kat Minoes" />
            <FieldError errors={fieldErrors?.title} />
          </div>

          <div>
            <label htmlFor="category" className={LABEL}>
              Categorie <span className="text-red-500">*</span>
            </label>
            <select id="category" name="category" defaultValue={event?.category ?? ""} className={INPUT}>
              <option value="">Selecteer...</option>
              {CALENDAR_MANUAL_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors?.category} />
          </div>

          <div>
            <label htmlFor="animalId" className={LABEL}>
              Gekoppeld dier (optioneel)
            </label>
            <select id="animalId" name="animalId" defaultValue={event?.animalId ? String(event.animalId) : ""} className={INPUT}>
              <option value="">Geen</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className={LABEL}>
              Datum <span className="text-red-500">*</span>
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

          <div className="sm:col-span-2">
            <label htmlFor="location" className={LABEL}>
              Locatie (optioneel)
            </label>
            <input id="location" name="location" defaultValue={event?.location ?? ""} className={INPUT} placeholder="Bijv. Parochiezaal, asiel" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={LABEL}>
              Omschrijving (optioneel)
            </label>
            <textarea id="description" name="description" rows={3} defaultValue={event?.description ?? ""} className={INPUT} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link href="/beheerder/kalender" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annuleren
        </Link>
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#1b4332] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50">
          {isPending ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
