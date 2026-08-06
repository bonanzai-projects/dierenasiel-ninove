"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { copyEventToNextEdition } from "@/lib/actions/event-copy";

interface Props {
  eventId: number;
  defaultName: string;
  defaultDate: string;
  counts: { tasks: number; costs: number; shifts: number };
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-sm font-medium text-gray-700";

/** Story 13.10 — het formulier achter de knop "Volgende editie". */
export default function NextEditionForm({ eventId, defaultName, defaultDate, counts }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(copyEventToNextEdition, null);

  useEffect(() => {
    if (state?.success && state.data?.id) {
      router.push(`/beheerder/evenementen/${state.data.id}`);
    }
  }, [state, router]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;

  const vinkje = (naam: string, aantal: number, label: string, standaard: boolean) => (
    <div className="flex items-start gap-2">
      <input type="hidden" name={naam} value="false" />
      <input
        type="checkbox"
        id={naam}
        name={naam}
        value="true"
        defaultChecked={standaard && aantal > 0}
        disabled={aantal === 0}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f] disabled:opacity-40"
      />
      <label htmlFor={naam} className={aantal === 0 ? "text-sm text-gray-400" : "text-sm text-gray-700"}>
        {label}{" "}
        <span className="text-xs text-gray-500">
          ({aantal === 0 ? "niets te kopiëren" : aantal})
        </span>
      </label>
    </div>
  );

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      {globalError && <p className="text-sm text-red-600">{globalError}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL}>
            Naam <span className="text-red-500">*</span>
          </label>
          <input id="name" name="name" defaultValue={defaultName} className={INPUT} />
          {fieldErrors?.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label htmlFor="date" className={LABEL}>
            Begindatum <span className="text-red-500">*</span>
          </label>
          <input type="date" id="date" name="date" defaultValue={defaultDate} className={INPUT} />
          {fieldErrors?.date && <p className="mt-1 text-sm text-red-600">{fieldErrors.date[0]}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Alle datums schuiven mee op met dezelfde afstand: wat drie maanden vooraf moest
            gebeuren, moet dat opnieuw.
          </p>
        </div>
      </div>

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-gray-700">Wat neem je mee?</legend>
        <div className="space-y-2">
          {vinkje("includeTasks", counts.tasks, "Draaiboek (taken, nog niet afgevinkt)", true)}
          {vinkje("includeCosts", counts.costs, "Begroting (het werkelijke bedrag wordt de nieuwe raming)", true)}
          {vinkje("includeShifts", counts.shifts, "Vrijwilligers (dezelfde namen op dezelfde posten)", false)}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          De evaluatie gaat niet mee — die hoort bij de vorige editie. Ze blijft wel zichtbaar
          op de nieuwe fiche.
        </p>
      </fieldset>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/beheerder/evenementen/${eventId}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Bezig..." : "Volgende editie aanmaken"}
        </button>
      </div>
    </form>
  );
}
