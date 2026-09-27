"use client";

import { useActionState, useState } from "react";
import { createStaffPattern, stopStaffPattern } from "@/lib/actions/staff-patterns";
import { WEEKDAYS, describePattern, patternPeriod, type StaffPattern } from "@/lib/staff/patterns";
import type { PatternPersonOption } from "@/lib/queries/staff-patterns";
import type { ActionResult } from "@/types";

interface Props {
  /** Het weekrooster zoals het vandaag geldt of nog komt. */
  patterns: StaffPattern[];
  /** Vandaag (Brussel), YYYY-MM-DD. */
  today: string;
  currentUserId: number | null;
  mayManageOthers: boolean;
  /** Voor wie de leiding een vast moment kan zetten. Leeg voor wie dat niet mag. */
  people: PatternPersonOption[];
}

const VELD =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
const KNOP_KLEIN = "rounded-md border px-2 py-1 text-xs font-medium";

/** Een veldfout gaat voor "Validatie mislukt". */
function melding(state: ActionResult | null): string | null {
  if (!state || state.success) return null;
  const veldfout = state.fieldErrors ? Object.values(state.fieldErrors).flat()[0] : undefined;
  return veldfout ?? state.error ?? null;
}

/**
 * Epic 14, story 14.8 — het vaste weekrooster. Sven: "ja dat herhaalt zich maar soms ook
 * niet (verlof)". Wat hier staat, verschijnt vanzelf in elke week erboven.
 */
export default function StaffPatternsPanel({ patterns, today, currentUserId, mayManageOthers, people }: Props) {
  const [open, setOpen] = useState(false);
  // De melding hoort bij wat je net deed: bewaren of stoppen, wat het laatst gebeurde.
  const [laatste, setLaatste] = useState<ActionResult | null>(null);

  const [createState, createAction, createPending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const res = await createStaffPattern(prev, formData);
      setLaatste(res);
      if (res.success) setOpen(false);
      return res;
    },
    null,
  );
  const [, stopAction] = useActionState(async (prev: ActionResult | null, formData: FormData) => {
    const res = await stopStaffPattern(prev, formData);
    setLaatste(res);
    return res;
  }, null);

  // React 19 zet een formulier na een Server Action terug op zijn beginwaarden, ook bij een
  // fout. De actie stuurt de ingevulde waarden terug; als beginwaarden landen ze opnieuw.
  const terug = createState && !createState.success ? createState.values : undefined;

  const fout = melding(laatste);
  const gelukt = laatste?.success ? laatste.message : null;
  const team = people.filter((p) => p.group === "team");
  const wandelaars = people.filter((p) => p.group === "wandelaar");

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm" aria-labelledby="vast-weekrooster">
      <h2 id="vast-weekrooster" className="text-sm font-semibold text-[#1b4332]">
        Vast weekrooster
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Komt iemand elke week op dezelfde dag? Zet het hier één keer, dan staat het vanzelf in elke week. Uren
        veranderen = stoppen en een nieuw vast moment toevoegen; stoppen laat de vorige weken staan.
      </p>

      {fout && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}
      {gelukt && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{gelukt}</p>}

      {patterns.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Nog geen vaste momenten.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 border-y border-gray-100">
          {patterns.map((p) => {
            const naam = p.userName ?? "—";
            const wat = describePattern(p);
            const magStoppen = mayManageOthers || p.userId === currentUserId;
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-gray-900">{naam}</span>
                  {p.userRole === "wandelaar" && <span className="ml-1 text-xs text-gray-400">(wandelaar)</span>}
                  <span className="block text-xs text-gray-600">{wat}</span>
                  <span className="block text-xs text-gray-400">{patternPeriod(p, today)}</span>
                </span>
                {magStoppen && (
                  <form action={stopAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      aria-label={`Stoppen: ${naam}, ${wat}`}
                      onClick={(e) => {
                        if (!window.confirm(`${naam}: ${wat} stoppen? De vorige weken blijven staan.`)) e.preventDefault();
                      }}
                      className={`${KNOP_KLEIN} border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-700`}
                    >
                      Stoppen
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <form key={JSON.stringify(terug ?? {})} action={createAction} className="mt-3 grid gap-2 sm:grid-cols-6">
          {mayManageOthers && (
            <select name="userId" defaultValue={terug?.userId ?? ""} aria-label="Voor wie" className={`${VELD} sm:col-span-2`}>
              <option value="">Ikzelf</option>
              {team.length > 0 && (
                <optgroup label="Team">
                  {team
                    .filter((p) => p.userId !== currentUserId)
                    .map((p) => (
                      <option key={p.userId} value={p.userId}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
              {wandelaars.length > 0 && (
                <optgroup label="Wandelaars">
                  {wandelaars.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          <select name="weekday" defaultValue={terug?.weekday ?? ""} aria-label="Weekdag" className={`${VELD} sm:col-span-2`}>
            <option value="">— weekdag —</option>
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>
                elke {d.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <input type="time" name="startTime" step={900} defaultValue={terug?.startTime ?? ""} aria-label="Van" className={VELD} />
            <span className="text-xs text-gray-400">–</span>
            <input type="time" name="endTime" step={900} defaultValue={terug?.endTime ?? ""} aria-label="Tot" className={VELD} />
          </div>
          <input
            name="task"
            list="personeel-taken"
            maxLength={120}
            defaultValue={terug?.task ?? ""}
            placeholder="Taak (optioneel)"
            aria-label="Taak"
            className={`${VELD} sm:col-span-3`}
          />
          <label className="flex items-center gap-2 text-xs text-gray-600 sm:col-span-3">
            Vanaf
            <input type="date" name="validFrom" defaultValue={terug?.validFrom || today} aria-label="Vanaf" className={VELD} />
          </label>
          <div className="flex gap-1.5 sm:col-span-6">
            <button
              type="submit"
              disabled={createPending}
              className="rounded-md bg-[#1b4332] px-3 py-1 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
            >
              Bewaren
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${KNOP_KLEIN} border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Annuleren
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setLaatste(null);
            setOpen(true);
          }}
          className="mt-3 text-sm font-medium text-[#2d6a4f] hover:underline"
        >
          + Vast moment toevoegen
        </button>
      )}
    </section>
  );
}
