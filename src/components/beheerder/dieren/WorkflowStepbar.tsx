"use client";

import { useState, useTransition } from "react";
import { WORKFLOW_PHASES } from "@/lib/workflow/phases";
import { getPhaseStatus, PHASE_LABELS, groupOpenTodosByPhase } from "@/lib/workflow/stepbar";
import { getEntryCriteria } from "@/lib/workflow/entry-criteria";
import { getPhaseDescription } from "@/lib/workflow/phase-descriptions";
import { transitionAnimalPhase } from "@/lib/actions/workflow";
import type { AnimalTodo } from "@/types";
import type { GuardWarning } from "@/lib/workflow/guards";
import type { PhaseStatus } from "@/lib/workflow/stepbar";

function getPhaseAriaLabel(label: string, status: PhaseStatus, openCount: number): string {
  const statusLabel = status === "active" ? " — actieve fase" : status === "completed" ? " — voltooid" : " — toekomstig";
  const todoLabel = openCount > 0 ? `, ${openCount} openstaande taken` : "";
  return `${label}${statusLabel}${todoLabel}`;
}

interface WorkflowStepbarProps {
  currentPhase: string;
  animalId: number;
  animalName: string;
  /** Bepaalt de soort-specifieke toegangsvoorwaarden (katten hebben er extra). */
  animalSpecies: string;
  todos: AnimalTodo[];
}

export default function WorkflowStepbar({
  currentPhase,
  animalId,
  animalName,
  animalSpecies,
  todos,
}: WorkflowStepbarProps) {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [guardWarnings, setGuardWarnings] = useState<GuardWarning[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const todosByPhase = groupOpenTodosByPhase(todos);

  function handlePhaseClick(phase: string) {
    const status = getPhaseStatus(currentPhase, phase);
    if (status === "future") return;
    setSelectedPhase(selectedPhase === phase ? null : phase);
    setGuardWarnings([]);
    setTransitionError(null);
    setOverrideReason("");
  }

  function handleTransition() {
    setTransitionError(null);
    setGuardWarnings([]);
    startTransition(async () => {
      const result = await transitionAnimalPhase(animalId);
      if (result.success) {
        setSelectedPhase(null);
      } else {
        if (result.guardWarnings && result.guardWarnings.length > 0) {
          setGuardWarnings(result.guardWarnings);
        } else {
          setTransitionError(result.error);
        }
      }
    });
  }

  function handleOverride() {
    if (!overrideReason.trim()) return;
    setTransitionError(null);
    startTransition(async () => {
      const result = await transitionAnimalPhase(animalId, overrideReason.trim(), true);
      if (result.success) {
        setSelectedPhase(null);
        setGuardWarnings([]);
        setOverrideReason("");
      } else {
        setTransitionError(result.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      {/* Step indicators */}
      <nav aria-label={`Workflow stappen voor ${animalName}`}>
        <ol className="flex items-center">
          {WORKFLOW_PHASES.map((phase, index) => {
            const status = getPhaseStatus(currentPhase, phase);
            const label = PHASE_LABELS[phase] || phase;
            const openCount = todosByPhase[phase]?.length ?? 0;
            const isSelected = selectedPhase === phase;
            const isClickable = status !== "future";
            const criteria = getEntryCriteria(phase, animalSpecies);

            return (
              <li key={phase} className="group relative flex flex-1 items-center">
                {/* Connector line (before this step, except first) */}
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      status === "completed" || status === "active"
                        ? "bg-emerald-400"
                        : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Phase button */}
                <button
                  type="button"
                  aria-label={getPhaseAriaLabel(label, status, openCount)}
                  onClick={() => isClickable && handlePhaseClick(phase)}
                  disabled={!isClickable}
                  className={`relative flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    status === "completed"
                      ? "cursor-pointer focus:ring-emerald-400"
                      : status === "active"
                        ? "cursor-pointer focus:ring-amber-400"
                        : "cursor-default opacity-50"
                  } ${isSelected ? "ring-2 ring-offset-1 " + (status === "completed" ? "ring-emerald-400" : "ring-amber-400") : ""}`}
                >
                  {/* Status icon */}
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      status === "completed"
                        ? "bg-emerald-500 text-white"
                        : status === "active"
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                          : "bg-gray-100 text-gray-400 border border-dashed border-gray-300"
                    }`}
                  >
                    {status === "completed" ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className={`text-[10px] font-medium leading-tight sm:text-xs ${
                      status === "completed"
                        ? "text-emerald-700"
                        : status === "active"
                          ? "font-bold text-amber-800"
                          : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>

                  {/* Badge with open todo count */}
                  {status === "active" && openCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {openCount}
                    </span>
                  )}
                </button>

                {/* Toegangsvoorwaarden bij hover én toetsenbordfocus. */}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-left text-[11px] leading-snug text-white shadow-lg group-hover:block group-focus-within:block"
                >
                  <p className="font-semibold">{label}</p>
                  <p className="mt-0.5 text-gray-200">{getPhaseDescription(phase)}</p>

                  <p className="mt-2 border-t border-white/15 pt-1.5 font-semibold">
                    Om in &laquo;{label}&raquo; te geraken
                  </p>
                  {criteria.length === 0 ? (
                    <p className="mt-0.5 text-gray-300">
                      Geen voorwaarden — je kan deze stap altijd zetten.
                    </p>
                  ) : (
                    <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-gray-100">
                      {criteria.map((criterium) => (
                        <li key={criterium}>{criterium}</li>
                      ))}
                    </ul>
                  )}
                  <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>

                {/* Connector line (after this step, except last) */}
                {index < WORKFLOW_PHASES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      status === "completed" ? "bg-emerald-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Phase detail panel */}
      {selectedPhase && (
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-bold text-[#1b4332]">
            {PHASE_LABELS[selectedPhase] || selectedPhase}
          </h3>

          {/* Open todos for this phase */}
          {(todosByPhase[selectedPhase]?.length ?? 0) > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Openstaande taken
              </p>
              <ul className="mt-2 space-y-1.5">
                {todosByPhase[selectedPhase].map((todo) => (
                  <li key={todo.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-0.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                        todo.priority === "dringend"
                          ? "bg-red-500"
                          : todo.priority === "hoog"
                            ? "bg-amber-500"
                            : todo.priority === "normaal"
                              ? "bg-blue-400"
                              : "bg-gray-300"
                      }`}
                    />
                    <span className="text-gray-700">{todo.description}</span>
                    {todo.dueDate && (
                      <span className="ml-auto whitespace-nowrap text-xs text-gray-400">
                        {todo.dueDate}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-400">
              Geen openstaande taken voor deze fase.
            </p>
          )}

          {/* Transition button (only on active phase) */}
          {getPhaseStatus(currentPhase, selectedPhase) === "active" &&
            currentPhase !== "afgerond" && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                {/* Guard warnings */}
                {guardWarnings.length > 0 && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Waarschuwingen bij deze overgang
                    </p>
                    <ul className="mt-2 space-y-1">
                      {guardWarnings.map((w) => (
                        <li key={w.code} className="flex items-start gap-2 text-sm text-amber-700">
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>{w.message}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Override form */}
                    <div className="mt-3">
                      <label htmlFor="override-reason" className="block text-xs font-medium text-amber-800">
                        Reden voor override
                      </label>
                      <input
                        id="override-reason"
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Bijv. chip wordt later geregistreerd"
                        className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGuardWarnings([]);
                            setOverrideReason("");
                          }}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Annuleren
                        </button>
                        <button
                          type="button"
                          onClick={handleOverride}
                          disabled={!overrideReason.trim() || isPending}
                          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {isPending ? "Bezig..." : "Override en doorgaan"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {transitionError && (
                  <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {transitionError}
                  </p>
                )}

                {/* Transition button (hide when guard warnings are showing) */}
                {guardWarnings.length === 0 && (
                  <button
                    type="button"
                    onClick={handleTransition}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1b4332] disabled:opacity-50"
                  >
                    {isPending ? (
                      "Bezig..."
                    ) : (
                      <>
                        Volgende fase
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
