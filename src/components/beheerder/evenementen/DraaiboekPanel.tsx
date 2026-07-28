"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteEventTask,
  toggleEventTask,
  type EventTaskRow,
} from "@/lib/actions/event-tasks";
import { groupTasksByPhase, draaiboekProgress } from "@/lib/events/draaiboek";
import EventTaskForm from "./EventTaskForm";

interface DraaiboekPanelProps {
  eventId: number;
  tasks: EventTaskRow[];
  canWrite: boolean;
}

/** "12/09 · 16:00" — leeg blijft leeg. */
function moment(task: EventTaskRow): string {
  const dag = task.date ? task.date.split("-").reverse().slice(0, 2).join("/") : "";
  return [dag, task.time].filter(Boolean).join(" · ");
}

export default function DraaiboekPanel({ eventId, tasks, canWrite }: DraaiboekPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Eén formulier tegelijk: ofwel een nieuwe taak in een fase, ofwel één taak bewerken.
  const [nieuweTaakFase, setNieuweTaakFase] = useState<string | null>(null);
  const [bewerktId, setBewerktId] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const groepen = groupTasksByPhase(tasks);
  const voortgang = draaiboekProgress(tasks);

  function onToggle(task: EventTaskRow) {
    setFout(null);
    startTransition(async () => {
      const res = await toggleEventTask(task.id, !task.done);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Afvinken mislukt");
    });
  }

  function onDelete(task: EventTaskRow) {
    if (!window.confirm(`Taak "${task.title}" verwijderen?`)) return;
    setFout(null);
    startTransition(async () => {
      const res = await deleteEventTask(task.id);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Verwijderen mislukt");
    });
  }

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[#1b4332]">Draaiboek</h2>
        {voortgang.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[#2d6a4f]" style={{ width: `${voortgang.pct}%` }} />
            </div>
            <span className="text-xs text-gray-600">
              {voortgang.done} van {voortgang.total} afgevinkt
            </span>
          </div>
        )}
      </div>

      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}

      <div className="mt-3 space-y-5">
        {groepen.map((groep) => (
          <section key={groep.phase} aria-label={groep.label}>
            <h3 className="text-sm font-semibold text-gray-800">{groep.label}</h3>
            <p className="text-xs text-gray-500">{groep.hint}</p>

            <ul className="mt-2 divide-y divide-gray-100 border-y border-gray-100">
              {groep.tasks.length === 0 && (
                <li className="py-2 text-sm text-gray-400">Nog geen taken in deze fase.</li>
              )}
              {groep.tasks.map((task) =>
                bewerktId === task.id ? (
                  <li key={task.id} className="py-2">
                    <EventTaskForm
                      eventId={eventId}
                      phase={task.phase}
                      task={task}
                      onDone={() => setBewerktId(null)}
                    />
                  </li>
                ) : (
                  <li key={task.id} className="flex items-start gap-2 py-2">
                    {canWrite && (
                      <input
                        type="checkbox"
                        aria-label={task.title}
                        checked={task.done}
                        onChange={() => onToggle(task)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${task.done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[moment(task), task.responsible].filter(Boolean).join(" · ")}
                        {task.notes ? ` — ${task.notes}` : ""}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNieuweTaakFase(null);
                            setBewerktId(task.id);
                          }}
                          className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Bewerken
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(task)}
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

            {canWrite &&
              (nieuweTaakFase === groep.phase ? (
                <div className="mt-2">
                  <EventTaskForm
                    eventId={eventId}
                    phase={groep.phase}
                    onDone={() => setNieuweTaakFase(null)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBewerktId(null);
                    setNieuweTaakFase(groep.phase);
                  }}
                  className="mt-2 text-sm font-medium text-[#2d6a4f] hover:underline"
                >
                  + Taak toevoegen
                </button>
              ))}
          </section>
        ))}
      </div>
    </section>
  );
}
