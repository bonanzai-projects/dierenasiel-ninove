"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  addPersonToDay,
  removeAttendance,
  setAttendanceTask,
  signUpForDay,
} from "@/lib/actions/staff-attendance";
import { assignToSlot, createSlot, deleteSlot, takeSlot } from "@/lib/actions/staff-slots";
import {
  canRemove,
  displayName,
  formatTimeRange,
  isSignedUp,
  type AttendanceDay,
} from "@/lib/staff/attendance";
import { personLabel, type VolunteerOption } from "@/lib/staff/volunteers";
import {
  SLOT_MAX_CAPACITY,
  buildDaySlots,
  canTakeSlot,
  withoutSlotTakers,
  type Slot,
} from "@/lib/staff/slots";
import type { ActionResult } from "@/types";

interface Props {
  week: AttendanceDay[];
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  today: string;
  currentUserId: number | null;
  mayManageOthers: boolean;
  /** Story 14.2 — vaste voorstellen + wat eerder al ingevuld werd. */
  taskSuggestions: string[];
  /** Story 14.4 — de wandelaars die de leiding kan inschrijven. Leeg voor wie dat niet mag. */
  volunteers: VolunteerOption[];
  /** Story 14.3 — de plaatsjes die de leiding deze week klaarzette. */
  slots: Slot[];
}

const TIJD =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
const TAKEN_LIJST = "personeel-taken";
const KNOP_KLEIN = "rounded-md border px-2 py-1 text-xs font-medium";

/** De eerste zinnige melding: een veldfout ("Einduur moet na…") gaat voor "Validatie mislukt". */
function melding(state: ActionResult | null): string | null {
  if (!state || state.success) return null;
  const veldfout = state.fieldErrors ? Object.values(state.fieldErrors).flat()[0] : undefined;
  return veldfout ?? state.error ?? null;
}

/**
 * React 19 leegt ongecontroleerde velden ná een Server Action, ook bij een fout. De
 * acties geven de ingevulde waarden terug; die zetten we hier terug, zodat niemand
 * na "Einduur moet na het beginuur liggen" naam en uren opnieuw moet typen.
 */
function herstel(form: HTMLFormElement | null, waarden: Record<string, string> | undefined) {
  if (!form || !waarden) return;
  for (const [naam, waarde] of Object.entries(waarden)) {
    const veld = form.elements.namedItem(naam);
    if (
      veld instanceof HTMLInputElement ||
      veld instanceof HTMLTextAreaElement ||
      veld instanceof HTMLSelectElement
    ) {
      veld.value = waarde;
    }
  }
}

/** Van–tot, twee tijdvelden naast elkaar. Story 14.7. */
function Uren({ dagLabel }: { dagLabel: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="time" name="startTime" step={900} aria-label={`Van (${dagLabel})`} className={TIJD} />
      <span className="text-xs text-gray-400">–</span>
      <input type="time" name="endTime" step={900} aria-label={`Tot (${dagLabel})`} className={TIJD} />
    </div>
  );
}

/** Story 14.2 — vrije tekst met voorstellen. */
function TaakVeld({ label, defaultValue, placeholder = "Taak (optioneel)" }: { label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <input
      name="task"
      list={TAKEN_LIJST}
      maxLength={120}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={label}
      className={TIJD}
    />
  );
}

/** Story 14.4 — een wandelaar kiezen, of een naam zonder account typen. */
function PersoonKeuze({ volunteers, dagLabel }: { volunteers: VolunteerOption[]; dagLabel: string }) {
  return (
    <>
      {volunteers.length > 0 && (
        <select name="walkerUserId" defaultValue="" aria-label={`Wandelaar voor ${dagLabel}`} className={TIJD}>
          <option value="">— Wandelaar kiezen —</option>
          {volunteers.map((v) => (
            <option key={v.userId} value={v.userId}>
              {v.name}
            </option>
          ))}
        </select>
      )}
      <input
        name="guestName"
        placeholder={volunteers.length > 0 ? "…of een naam zonder account" : "Naam vrijwilliger"}
        aria-label={`Naam vrijwilliger voor ${dagLabel}`}
        className={TIJD}
      />
    </>
  );
}

export default function AttendanceWeek({
  week,
  weekStart,
  prevWeek,
  nextWeek,
  today,
  currentUserId,
  mayManageOthers,
  taskSuggestions,
  volunteers,
  slots,
}: Props) {
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpForDay, null);
  const [removeState, removeAction] = useActionState(removeAttendance, null);
  const [addState, addAction] = useActionState(addPersonToDay, null);
  const [taskState, taskAction, taskPending] = useActionState(setAttendanceTask, null);
  // Story 14.3 — plaatsjes.
  const [createSlotState, createSlotAction, createSlotPending] = useActionState(createSlot, null);
  const [deleteSlotState, deleteSlotAction] = useActionState(deleteSlot, null);
  const [takeSlotState, takeSlotAction, takeSlotPending] = useActionState(takeSlot, null);
  const [assignState, assignAction] = useActionState(assignToSlot, null);

  const [addingOn, setAddingOn] = useState<string | null>(null);
  // Story 14.7 — op welke dag het urenformulier openstaat.
  const [urenOp, setUrenOp] = useState<string | null>(null);
  // Story 14.2 — bij welke inschrijving het taakveld openstaat.
  const [taakBij, setTaakBij] = useState<number | null>(null);
  // Story 14.3 — op welke dag het plaatsjesformulier openstaat, en bij welk plaatsje het toewijzen.
  const [plaatsjeOp, setPlaatsjeOp] = useState<string | null>(null);
  const [toewijzenBij, setToewijzenBij] = useState<number | null>(null);
  // Er staat telkens hooguit één formulier van elke soort open.
  const urenForm = useRef<HTMLFormElement>(null);
  const addForm = useRef<HTMLFormElement>(null);
  const taakForm = useRef<HTMLFormElement>(null);
  const plaatsjeForm = useRef<HTMLFormElement>(null);
  const toewijsForm = useRef<HTMLFormElement>(null);

  // Code-review 14.2 — de melding hoort bij wat je net deed. Elk formulier houdt zijn
  // laatste resultaat bij; zonder dit bleef een oude fout van "Ik kom" staan en leek
  // "Bewaren" bij een taak niets te doen.
  const [laatste, setLaatste] = useState<ActionResult | null>(null);

  // Geslaagd: formulier dicht. Mislukt: ingevulde waarden terug.
  useEffect(() => {
    if (!signUpState) return;
    setLaatste(signUpState);
    if (signUpState.success) setUrenOp(null);
    else herstel(urenForm.current, signUpState.values);
  }, [signUpState]);
  useEffect(() => {
    if (removeState) setLaatste(removeState);
  }, [removeState]);
  useEffect(() => {
    if (!addState) return;
    setLaatste(addState);
    if (addState.success) setAddingOn(null);
    else herstel(addForm.current, addState.values);
  }, [addState]);
  useEffect(() => {
    if (!taskState) return;
    setLaatste(taskState);
    if (taskState.success) setTaakBij(null);
    else herstel(taakForm.current, taskState.values);
  }, [taskState]);
  useEffect(() => {
    if (!createSlotState) return;
    setLaatste(createSlotState);
    if (createSlotState.success) setPlaatsjeOp(null);
    else herstel(plaatsjeForm.current, createSlotState.values);
  }, [createSlotState]);
  useEffect(() => {
    if (deleteSlotState) setLaatste(deleteSlotState);
  }, [deleteSlotState]);
  useEffect(() => {
    if (takeSlotState) setLaatste(takeSlotState);
  }, [takeSlotState]);
  useEffect(() => {
    if (!assignState) return;
    setLaatste(assignState);
    if (assignState.success) setToewijzenBij(null);
    else herstel(toewijsForm.current, assignState.values);
  }, [assignState]);

  const foutmelding = melding(laatste);

  return (
    <div className="space-y-4">
      <datalist id={TAKEN_LIJST}>
        {taskSuggestions.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Link
            href={`/beheerder/personeel?week=${prevWeek}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Vorige week
          </Link>
          <Link
            href="/beheerder/personeel"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Deze week
          </Link>
          <Link
            href={`/beheerder/personeel?week=${nextWeek}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volgende week →
          </Link>
        </div>
        <p className="text-sm text-gray-500">Week van {weekStart}</p>
      </div>

      {foutmelding && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {foutmelding}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {week.map((day) => {
          const isVandaag = day.date === today;
          // Story 14.3 — wie op een plaatsje staat, verschijnt bij dat plaatsje.
          const plaatsjes = buildDaySlots(day.date, slots, day.entries);
          const gewoon = withoutSlotTakers(day.entries);
          // Code-review 14.3 — enkel een gewone inschrijving telt als "ik kom". Wie alleen een
          // plaatsje heeft, houdt de knop "Ik kom" (hele dag naast een plaatsje mag).
          const ikKom = isSignedUp({ ...day, entries: gewoon }, currentUserId);

          return (
            <div
              key={day.date}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                isVandaag ? "border-[#1b4332]" : "border-gray-100"
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold capitalize text-[#1b4332]">
                  {day.label}
                  {isVandaag && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      vandaag
                    </span>
                  )}
                </h2>
                <span className="text-xs text-gray-400 tabular-nums">{day.date.slice(8)}/{day.date.slice(5, 7)}</span>
              </div>

              {/* Story 14.3 — de plaatsjes van die dag, boven de gewone inschrijvingen. */}
              {plaatsjes.length > 0 && (
                <ul className="mb-3 space-y-2" aria-label={`Plaatsjes ${day.label}`}>
                  {plaatsjes.map(({ slot, takers, free }) => {
                    const naam = `${slot.task} (${formatTimeRange(slot)})`;
                    return (
                      <li key={slot.id} className="rounded-lg border border-lime-200 bg-lime-50/60 p-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block font-medium text-lime-900">{slot.task}</span>
                            <span className="block text-xs tabular-nums text-lime-800">
                              {formatTimeRange(slot)} · {takers.length}/{slot.capacity}
                              {free === 0 && " · volzet"}
                            </span>
                          </span>
                          {mayManageOthers && takers.length === 0 && (
                            <form action={deleteSlotAction}>
                              <input type="hidden" name="id" value={slot.id} />
                              <button
                                type="submit"
                                aria-label={`Plaatsje weghalen: ${naam}`}
                                className="rounded px-1 text-xs text-lime-700 hover:bg-lime-100 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </form>
                          )}
                        </div>

                        {takers.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {takers.map((t) => {
                              const label = personLabel(t);
                              return (
                                <li key={t.id} className="flex items-center justify-between gap-2 text-xs text-gray-700">
                                  <span>
                                    {displayName(t)}
                                    {label && <span className="ml-1 text-gray-400">({label})</span>}
                                  </span>
                                  {canRemove(t, currentUserId, mayManageOthers) && (
                                    <form action={removeAction}>
                                      <input type="hidden" name="id" value={t.id} />
                                      <button
                                        type="submit"
                                        aria-label={`${displayName(t)} van het plaatsje halen: ${naam}`}
                                        className="rounded px-1 text-gray-400 hover:bg-lime-100 hover:text-red-600"
                                      >
                                        ✕
                                      </button>
                                    </form>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {canTakeSlot(slot, takers, currentUserId) && (
                            <form action={takeSlotAction}>
                              <input type="hidden" name="slotId" value={slot.id} />
                              <button
                                type="submit"
                                disabled={takeSlotPending}
                                aria-label={`Neem plaatsje: ${naam}`}
                                className={`${KNOP_KLEIN} border-lime-600 bg-white text-lime-800 hover:bg-lime-100 disabled:opacity-50`}
                              >
                                Neem plaatsje
                              </button>
                            </form>
                          )}
                          {mayManageOthers && free > 0 && toewijzenBij !== slot.id && (
                            <button
                              type="button"
                              onClick={() => setToewijzenBij(slot.id)}
                              aria-label={`Iemand toewijzen: ${naam}`}
                              className={`${KNOP_KLEIN} border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}
                            >
                              + toewijzen
                            </button>
                          )}
                        </div>

                        {toewijzenBij === slot.id && (
                          <form ref={toewijsForm} action={assignAction} className="mt-1.5 space-y-1.5">
                            <input type="hidden" name="slotId" value={slot.id} />
                            <PersoonKeuze volunteers={volunteers} dagLabel={`plaatsje ${naam}`} />
                            <div className="flex gap-1.5">
                              <button type="submit" className={`${KNOP_KLEIN} border-emerald-600 text-emerald-700 hover:bg-emerald-50`}>
                                Toewijzen
                              </button>
                              <button
                                type="button"
                                onClick={() => setToewijzenBij(null)}
                                className={`${KNOP_KLEIN} border-gray-300 text-gray-600 hover:bg-gray-50`}
                              >
                                Annuleren
                              </button>
                            </div>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {gewoon.length === 0 ? (
                <p className="py-2 text-sm text-gray-400">
                  {plaatsjes.length > 0 ? "Verder nog niemand ingeschreven." : "Nog niemand ingeschreven."}
                </p>
              ) : (
                <ul className="mb-2 space-y-1.5">
                  {gewoon.map((entry) => {
                    // Wie een inschrijving mag weghalen, mag er ook de taak van aanpassen:
                    // de eigen, of — voor de leiding — die van iedereen.
                    const magBeheren = canRemove(entry, currentUserId, mayManageOthers);
                    const wie = `${displayName(entry)} (${formatTimeRange(entry)})`;
                    const label = personLabel(entry);

                    return (
                      <li key={entry.id} className="text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-gray-700">
                            {displayName(entry)}
                            {label && <span className="ml-1 text-xs text-gray-400">({label})</span>}
                            {/* Story 14.8 — uit het vaste weekrooster; stoppen gebeurt daar, niet hier. */}
                            {entry.patternId != null && (
                              <span
                                title="Uit het vaste weekrooster"
                                className="ml-1.5 rounded bg-sky-50 px-1 py-0.5 text-[10px] font-semibold uppercase text-sky-700"
                              >
                                vast
                              </span>
                            )}
                            <span className="block text-xs tabular-nums text-gray-500">
                              {formatTimeRange(entry)}
                              {entry.note && <> · {entry.note}</>}
                            </span>
                            {entry.task && taakBij !== entry.id && (
                              <span className="mt-0.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                                {entry.task}
                              </span>
                            )}
                          </span>
                          {magBeheren && (
                            <span className="flex shrink-0 items-center">
                              <button
                                type="button"
                                onClick={() => setTaakBij(taakBij === entry.id ? null : entry.id)}
                                aria-label={`Taak van ${wie}`}
                                className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-emerald-700"
                              >
                                taak
                              </button>
                              <form action={removeAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <button
                                  type="submit"
                                  aria-label={`${wie} uitschrijven`}
                                  className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </form>
                            </span>
                          )}
                        </div>

                        {taakBij === entry.id && (
                          <form ref={taakForm} action={taskAction} className="mt-1 flex gap-1.5">
                            <input type="hidden" name="id" value={entry.id} />
                            <TaakVeld label={`Taak voor ${wie}`} defaultValue={entry.task ?? ""} />
                            <button
                              type="submit"
                              disabled={taskPending}
                              className="rounded-md border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Bewaren
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                {urenOp === day.date ? (
                  <form ref={urenForm} action={signUpAction} className="space-y-1.5">
                    <input type="hidden" name="date" value={day.date} />
                    <Uren dagLabel={day.label} />
                    <TaakVeld label={`Taak (${day.label})`} />
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        disabled={signUpPending}
                        className="flex-1 rounded-md bg-[#1b4332] px-2 py-1 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
                      >
                        Ik kom
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrenOp(null)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Annuleren
                      </button>
                    </div>
                  </form>
                ) : !ikKom ? (
                  <div className="space-y-1">
                    {/* "Ik kom" blijft één klik voor een hele dag; uren en taak zijn een verfijning. */}
                    <form action={signUpAction}>
                      <input type="hidden" name="date" value={day.date} />
                      <button
                        type="submit"
                        disabled={signUpPending}
                        className="w-full rounded-md bg-[#1b4332] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
                      >
                        Ik kom
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setUrenOp(day.date)}
                      className="w-full text-center text-xs text-[#2d6a4f] hover:underline"
                    >
                      met uren of taak…
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-medium text-emerald-700">Je staat ingeschreven</p>
                    <button
                      type="button"
                      onClick={() => setUrenOp(day.date)}
                      className="text-xs text-[#2d6a4f] hover:underline"
                    >
                      + nog een blok
                    </button>
                  </div>
                )}

                {mayManageOthers &&
                  (addingOn === day.date ? (
                    <form ref={addForm} action={addAction} className="space-y-1.5">
                      <input type="hidden" name="date" value={day.date} />
                      {/* Story 14.4 — vrijwilligers zijn wandelaars; wie geen wandelaar is, blijft op naam. */}
                      <PersoonKeuze volunteers={volunteers} dagLabel={day.label} />
                      <Uren dagLabel={`vrijwilliger ${day.label}`} />
                      <TaakVeld label={`Taak vrijwilliger (${day.label})`} />
                      <input
                        name="note"
                        placeholder="Toelichting (optioneel)"
                        aria-label={`Toelichting voor ${day.label}`}
                        className={TIJD}
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="submit"
                          className="rounded-md border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Toevoegen
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingOn(null)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Annuleren
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingOn(day.date)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      + Iemand anders
                    </button>
                  ))}

                {/* Story 14.3 — de leiding zet plaatsjes klaar. */}
                {mayManageOthers &&
                  (plaatsjeOp === day.date ? (
                    <form ref={plaatsjeForm} action={createSlotAction} className="space-y-1.5 rounded-lg border border-lime-200 bg-lime-50/60 p-2">
                      <input type="hidden" name="date" value={day.date} />
                      <TaakVeld label={`Taak plaatsje (${day.label})`} placeholder="Taak, bv. Kuis honden" />
                      <Uren dagLabel={`plaatsje ${day.label}`} />
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        Aantal plaatsen
                        <input
                          type="number"
                          name="capacity"
                          min={1}
                          max={SLOT_MAX_CAPACITY}
                          defaultValue={1}
                          aria-label={`Aantal plaatsen (${day.label})`}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="submit"
                          disabled={createSlotPending}
                          className={`${KNOP_KLEIN} border-lime-600 bg-white text-lime-800 hover:bg-lime-100 disabled:opacity-50`}
                        >
                          Klaarzetten
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaatsjeOp(null)}
                          className={`${KNOP_KLEIN} border-gray-300 text-gray-600 hover:bg-gray-50`}
                        >
                          Annuleren
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlaatsjeOp(day.date)}
                      className="w-full rounded-md border border-dashed border-lime-400 px-3 py-1 text-xs text-lime-800 hover:bg-lime-50"
                    >
                      + Plaatsje klaarzetten
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
