"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveEventEvaluation,
  type EventEvaluationRow,
} from "@/lib/actions/event-evaluations";
import { evaluationFigures, hasEvaluationContent } from "@/lib/events/evaluation";
import type { CostAmounts } from "@/lib/events/costs";

interface Props {
  eventId: number;
  evaluation: EventEvaluationRow | null;
  costs: CostAmounts[];
  shiftCount: number;
  tasksDone: number;
  tasksTotal: number;
  canWrite: boolean;
}

const INPUT =
  "mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500";
const LABEL = "block text-xs font-medium text-gray-600";

/**
 * Story 13.9 — wat je een jaar later wil terugvinden.
 *
 * De cijfers bovenaan volgen vanzelf uit de fiche (netto-resultaat, bezetting,
 * afgewerkt draaiboek); de rest vult Sven zelf in — hij schrijft de evaluatie
 * (vraag 23). Geen bestuursverslag: het bestuur zijn Martine en Katrien (vraag 24).
 */
export default function EventEvaluationPanel({
  eventId,
  evaluation,
  costs,
  shiftCount,
  tasksDone,
  tasksTotal,
  canWrite,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(saveEventEvaluation, null);
  const [bewerkt, setBewerkt] = useState(false);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      setBewerkt(false);
    }
  }, [state, router]);

  const cijfers = evaluationFigures({
    costs,
    shiftCount,
    tasksDone,
    tasksTotal,
    evaluation,
  });
  const ingevuld = hasEvaluationContent(evaluation);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const globalError = state && !state.success ? state.error : undefined;

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[#1b4332]">Evaluatie</h2>
        {canWrite && !bewerkt && (
          <button
            type="button"
            onClick={() => setBewerkt(true)}
            className="text-sm font-medium text-[#2d6a4f] hover:underline"
          >
            {ingevuld ? "Evaluatie bewerken" : "+ Evaluatie invullen"}
          </button>
        )}
      </div>

      {/* Cijfers die vanzelf uit de fiche volgen. */}
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {cijfers.map((c) => (
          <div key={c.label}>
            <dt className="text-[10px] uppercase tracking-wide text-gray-500">{c.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-gray-900">{c.waarde}</dd>
          </div>
        ))}
      </dl>

      {globalError && <p className="mt-2 text-sm text-red-600">{globalError}</p>}

      {bewerkt ? (
        <form action={formAction} noValidate className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
          <input type="hidden" name="eventId" value={eventId} />

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label htmlFor="visitors" className={LABEL}>Bezoekers</label>
              <input id="visitors" name="visitors" inputMode="numeric" defaultValue={evaluation?.visitors ?? ""} className={INPUT} />
              {fieldErrors?.visitors && <p className="mt-1 text-sm text-red-600">{fieldErrors.visitors[0]}</p>}
            </div>
            <div>
              <label htmlFor="ticketsUsed" className={LABEL}>Kaarten gebruikt</label>
              <input id="ticketsUsed" name="ticketsUsed" inputMode="numeric" defaultValue={evaluation?.ticketsUsed ?? ""} className={INPUT} />
              {fieldErrors?.ticketsUsed && <p className="mt-1 text-sm text-red-600">{fieldErrors.ticketsUsed[0]}</p>}
            </div>
            <div>
              <label htmlFor="paidPlates" className={LABEL}>Betalende borden</label>
              <input id="paidPlates" name="paidPlates" inputMode="numeric" defaultValue={evaluation?.paidPlates ?? ""} className={INPUT} />
              {fieldErrors?.paidPlates && <p className="mt-1 text-sm text-red-600">{fieldErrors.paidPlates[0]}</p>}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="wentWell" className={LABEL}>Wat liep goed</label>
              <textarea id="wentWell" name="wentWell" rows={3} defaultValue={evaluation?.wentWell ?? ""} className={INPUT} />
            </div>
            <div>
              <label htmlFor="couldBeBetter" className={LABEL}>Wat kon beter</label>
              <textarea id="couldBeBetter" name="couldBeBetter" rows={3} defaultValue={evaluation?.couldBeBetter ?? ""} className={INPUT} />
            </div>
            <div>
              <label htmlFor="agreements" className={LABEL}>Afspraken voor volgende keer</label>
              <textarea id="agreements" name="agreements" rows={3} defaultValue={evaluation?.agreements ?? ""} className={INPUT} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBewerkt(false)}
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
      ) : ingevuld ? (
        <div className="mt-4 space-y-3">
          {[
            { titel: "Wat liep goed", tekst: evaluation?.wentWell },
            { titel: "Wat kon beter", tekst: evaluation?.couldBeBetter },
            { titel: "Afspraken voor volgende keer", tekst: evaluation?.agreements },
          ]
            .filter((b) => (b.tekst ?? "").trim() !== "")
            .map((b) => (
              <div key={b.titel}>
                <h3 className="text-xs font-medium text-gray-500">{b.titel}</h3>
                <p className="whitespace-pre-wrap text-sm text-gray-900">{b.tekst}</p>
              </div>
            ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-400">
          Nog geen evaluatie ingevuld. Wat je hier noteert, staat er volgend jaar nog — bij de
          voorbereiding van de volgende editie.
        </p>
      )}
    </section>
  );
}
