"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEventShift, type EventShiftRow } from "@/lib/actions/event-shifts";
import { formatShiftTime, groupShiftsByDay, shiftSummary } from "@/lib/events/shifts";
import EventShiftForm from "./EventShiftForm";

interface Props {
  eventId: number;
  shifts: EventShiftRow[];
  /** Begindatum van het evenement — de dag die een nieuwe shift standaard krijgt. */
  eventDate: string;
  canWrite: boolean;
}

/**
 * Story 13.6 — het blad "wie staat waar", maar dan één dat niet verloren gaat.
 * Per dag, en binnen een dag per post: zo lees je het aan de toog.
 */
export default function EventShiftsPanel({ eventId, shifts, eventDate, canWrite }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [nieuw, setNieuw] = useState(false);
  const [bewerktId, setBewerktId] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const dagen = groupShiftsByDay(shifts as never[]) as unknown as {
    date: string;
    label: string;
    posten: { post: string; shifts: EventShiftRow[] }[];
  }[];
  const totaal = shiftSummary(shifts);

  function onDelete(s: EventShiftRow) {
    if (!window.confirm(`${s.personName} weghalen bij ${s.post}?`)) return;
    setFout(null);
    startTransition(async () => {
      const res = await deleteEventShift(s.id);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Verwijderen mislukt");
    });
  }

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[#1b4332]">Vrijwilligers</h2>
        {totaal.shiften > 0 && (
          <span aria-label="Bezetting" className="text-xs text-gray-600">
            {totaal.shiften} shiften · {totaal.personen}{" "}
            {totaal.personen === 1 ? "persoon" : "personen"} · {totaal.dagen}{" "}
            {totaal.dagen === 1 ? "dag" : "dagen"}
          </span>
        )}
      </div>

      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}

      {dagen.length === 0 && (
        <p className="mt-2 text-sm text-gray-400">
          Er is nog niemand ingepland voor dit evenement.
        </p>
      )}

      <div className="mt-3 space-y-5">
        {dagen.map((dag) => (
          <section key={dag.date} aria-label={dag.label}>
            <h3 className="text-sm font-semibold text-gray-800">{dag.label}</h3>

            <div className="mt-1 space-y-3">
              {dag.posten.map((groep) => (
                <div key={groep.post} role="group" aria-label={groep.post}>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {groep.post}
                  </h4>
                  <ul className="divide-y divide-gray-100 border-y border-gray-100">
                    {groep.shifts.map((s) =>
                      bewerktId === s.id ? (
                        <li key={s.id} className="py-2">
                          <EventShiftForm
                            eventId={eventId}
                            defaultDate={eventDate}
                            shift={s}
                            onDone={() => setBewerktId(null)}
                          />
                        </li>
                      ) : (
                        <li key={s.id} className="flex items-start gap-2 py-1.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-sm text-gray-900">{s.personName}</span>
                            {s.notes && (
                              <span className="block text-xs text-gray-500">{s.notes}</span>
                            )}
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-gray-600">
                            {formatShiftTime(s.startTime, s.endTime)}
                          </span>
                          {canWrite && (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setNieuw(false);
                                  setBewerktId(s.id);
                                }}
                                className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                              >
                                Bewerken
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(s)}
                                className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                Verwijderen
                              </button>
                            </div>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {canWrite &&
        (nieuw ? (
          <div className="mt-3">
            <EventShiftForm
              eventId={eventId}
              defaultDate={eventDate}
              onDone={() => setNieuw(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setBewerktId(null);
              setNieuw(true);
            }}
            className="mt-3 text-sm font-medium text-[#2d6a4f] hover:underline"
          >
            + Vrijwilliger inplannen
          </button>
        ))}
    </section>
  );
}
