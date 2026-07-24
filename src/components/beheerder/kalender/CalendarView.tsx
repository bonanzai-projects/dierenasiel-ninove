"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_MAP,
  CALENDAR_CATEGORY_KEYS,
  type CalendarCategoryKey,
} from "@/lib/calendar/categories";
import {
  buildMonthGrid,
  buildWeek,
  startOfWeekMonday,
  addDays,
  addMonths,
  groupEventsByDate,
  sortDayEvents,
  filterEventsByCategories,
  upcomingEvents,
  monthTitle,
  WEEKDAY_LABELS,
  type CalendarEvent,
} from "@/lib/calendar/events";

export type CalendarViewMode = "maand" | "week" | "dag";

interface CalendarViewProps {
  view: CalendarViewMode;
  refDate: string; // YYYY-MM-DD referentiedatum
  todayStr: string; // YYYY-MM-DD
  events: CalendarEvent[];
}

const MAX_PILLS_PER_DAY = 3;

function viewHref(view: CalendarViewMode, date: string): string {
  return `/beheerder/kalender?view=${view}&d=${date}`;
}

function shortDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("nl-BE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

function fullDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const s = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const s = new Intl.DateTimeFormat("nl-BE", { weekday: "short", timeZone: "UTC" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function weekTitle(refDate: string): string {
  const s = startOfWeekMonday(refDate);
  const e = addDays(s, 6);
  const monthOf = (d: string) => new Intl.DateTimeFormat("nl-BE", { month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const dayOf = (d: string) => Number(d.slice(8, 10));
  const year = e.slice(0, 4);
  return monthOf(s) === monthOf(e)
    ? `${dayOf(s)} – ${dayOf(e)} ${monthOf(e)} ${year}`
    : `${dayOf(s)} ${monthOf(s)} – ${dayOf(e)} ${monthOf(e)} ${year}`;
}

function EventPill({ e }: { e: CalendarEvent }) {
  const cat = CALENDAR_CATEGORY_MAP[e.category];
  const label = `${e.time ? `${e.time} ` : ""}${e.title}`;
  const inner = (
    <span title={label} className={`block truncate rounded border px-1 py-[1px] text-[10px] leading-tight ${cat.pill}`}>
      {label}
    </span>
  );
  return e.href ? (
    <Link href={e.href} className="block hover:opacity-80" onClick={(ev) => ev.stopPropagation()}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Agenda-rij (dot + tijd + titel + categorie), voor dag-detail en dagweergave. */
function AgendaList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-gray-500">Geen items op deze dag.</p>;
  return (
    <ul className="space-y-1.5">
      {events.map((e) => {
        const cat = CALENDAR_CATEGORY_MAP[e.category];
        const row = (
          <div className="flex items-start gap-2 rounded-md border border-gray-100 p-2">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cat.dot}`} />
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-800">
                {e.time ? <span className="text-gray-500">{e.time} · </span> : null}
                {e.title}
              </p>
              <p className="text-[11px] text-gray-400">{cat.label}</p>
            </div>
          </div>
        );
        return (
          <li key={e.id}>
            {e.href ? (
              <Link href={e.href} className="block hover:bg-gray-50">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DayDetail({ date, events, onClose }: { date: string; events: CalendarEvent[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Items op ${fullDayLabel(date)}`}
      onClick={onClose}
    >
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-[#1b4332]">{fullDayLabel(date)}</h3>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>
        <AgendaList events={events} />
        <div className="mt-4 flex justify-end">
          <Link href={`/beheerder/kalender/nieuw?date=${date}`} className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f]">
            + Nieuw item op deze dag
          </Link>
        </div>
      </div>
    </div>
  );
}

const VIEW_LABELS: { value: CalendarViewMode; label: string }[] = [
  { value: "maand", label: "Maand" },
  { value: "week", label: "Week" },
  { value: "dag", label: "Dag" },
];

export default function CalendarView({ view, refDate, todayStr, events }: CalendarViewProps) {
  const [active, setActive] = useState<Set<CalendarCategoryKey>>(() => new Set(CALENDAR_CATEGORY_KEYS));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDate(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDate]);

  function toggle(key: CalendarCategoryKey) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const visible = filterEventsByCategories(events, active);
  const byDate = groupEventsByDate(visible);

  const year = Number(refDate.slice(0, 4));
  const month = Number(refDate.slice(5, 7));

  // Titel + navigatie afhankelijk van de view.
  let title: string;
  let prevDate: string;
  let nextDate: string;
  if (view === "maand") {
    title = monthTitle(year, month);
    const p = addMonths(year, month, -1);
    const n = addMonths(year, month, 1);
    prevDate = `${p.year}-${String(p.month).padStart(2, "0")}-01`;
    nextDate = `${n.year}-${String(n.month).padStart(2, "0")}-01`;
  } else if (view === "week") {
    title = weekTitle(refDate);
    prevDate = addDays(refDate, -7);
    nextDate = addDays(refDate, 7);
  } else {
    title = fullDayLabel(refDate);
    prevDate = addDays(refDate, -1);
    nextDate = addDays(refDate, 1);
  }

  return (
    <div className="space-y-4">
      {/* Kop: navigatie + view-switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={viewHref(view, prevDate)} aria-label="Vorige" className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
            ‹
          </Link>
          <h2 className="min-w-[11rem] text-center font-heading text-lg font-bold text-[#1b4332]">{title}</h2>
          <Link href={viewHref(view, nextDate)} aria-label="Volgende" className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
            ›
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-gray-300">
            {VIEW_LABELS.map((v) => (
              <Link
                key={v.value}
                href={viewHref(v.value, refDate)}
                aria-pressed={view === v.value}
                className={`px-3 py-1.5 text-sm font-medium ${view === v.value ? "bg-[#1b4332] text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                {v.label}
              </Link>
            ))}
          </div>
          <Link href={viewHref(view, todayStr)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Vandaag
          </Link>
        </div>
      </div>

      {/* Legende + filters */}
      <div className="flex flex-wrap gap-2">
        {CALENDAR_CATEGORIES.map((cat) => {
          const on = active.has(cat.key);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => toggle(cat.key)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-gray-300 bg-white text-gray-800" : "border-gray-200 bg-gray-50 text-gray-400"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${on ? cat.dot : "bg-gray-300"}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Maandweergave */}
      {view === "maand" && <MonthGrid year={year} month={month} todayStr={todayStr} byDate={byDate} onSelectDay={setSelectedDate} />}

      {/* Weekweergave */}
      {view === "week" && <WeekView refDate={refDate} todayStr={todayStr} byDate={byDate} />}

      {/* Dagweergave (de volledige dagtitel staat al in de kop) */}
      {view === "dag" && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <AgendaList events={sortDayEvents(byDate[refDate] ?? [])} />
          <div className="mt-4 flex justify-end">
            <Link href={`/beheerder/kalender/nieuw?date=${refDate}`} className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f]">
              + Nieuw item op deze dag
            </Link>
          </div>
        </div>
      )}

      {/* Komende items — enkel in de maandweergave. */}
      {view === "maand" && <UpcomingList events={upcomingEvents(visible, todayStr, 15)} />}

      {selectedDate && <DayDetail date={selectedDate} events={sortDayEvents(byDate[selectedDate] ?? [])} onClose={() => setSelectedDate(null)} />}
    </div>
  );

  function UpcomingList({ events }: { events: CalendarEvent[] }) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-[#1b4332]">Komende items</h3>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">Geen komende items in deze maand.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((e) => {
              const cat = CALENDAR_CATEGORY_MAP[e.category];
              const row = (
                <div className="flex items-center gap-3 py-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cat.dot}`} />
                  <span className="w-24 shrink-0 text-xs font-medium text-gray-500">{shortDayLabel(e.date)}</span>
                  <span className="w-10 shrink-0 text-xs text-gray-500">{e.time ?? ""}</span>
                  <span className="truncate text-sm text-gray-800">{e.title}</span>
                </div>
              );
              return (
                <li key={e.id}>
                  {e.href ? (
                    <Link href={e.href} className="block hover:bg-gray-50">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
}

/** Maandrooster (6 weken). */
function MonthGrid({
  year,
  month,
  todayStr,
  byDate,
  onSelectDay,
}: {
  year: number;
  month: number;
  todayStr: string;
  byDate: Record<string, CalendarEvent[]>;
  onSelectDay: (date: string) => void;
}) {
  const grid = buildMonthGrid(year, month, todayStr);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAY_LABELS.map((wd) => (
          <div key={wd} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((cell, idx) => {
          const dayEvents = sortDayEvents(byDate[cell.date] ?? []);
          const shown = dayEvents.slice(0, MAX_PILLS_PER_DAY);
          const overflow = dayEvents.length - shown.length;
          const weekend = idx % 7 >= 5;
          return (
            <div
              key={cell.date}
              role="button"
              tabIndex={0}
              aria-label={`Bekijk ${cell.date}`}
              onClick={() => onSelectDay(cell.date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(cell.date);
                }
              }}
              className={`min-h-[92px] cursor-pointer border-b border-r border-gray-100 p-1 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${
                cell.inCurrentMonth ? (weekend ? "bg-gray-50/40" : "bg-white") : "bg-gray-50/70"
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${cell.isToday ? "bg-[#1b4332] font-bold text-white" : cell.inCurrentMonth ? "text-gray-700" : "text-gray-400"}`}>
                  {cell.day}
                </span>
              </div>
              <div className="space-y-0.5">
                {shown.map((e) => (
                  <EventPill key={e.id} e={e} />
                ))}
                {overflow > 0 && <span className="block px-1 text-[10px] font-medium text-gray-500">+{overflow} meer</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Weekweergave: 7 kolommen (ma–zo), elk met de events van die dag. */
function WeekView({
  refDate,
  todayStr,
  byDate,
}: {
  refDate: string;
  todayStr: string;
  byDate: Record<string, CalendarEvent[]>;
}) {
  const week = buildWeek(refDate, todayStr);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {week.map((cell) => {
        const dayEvents = sortDayEvents(byDate[cell.date] ?? []);
        return (
          <div key={cell.date} className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <Link
              href={viewHref("dag", cell.date)}
              className={`flex items-center justify-between rounded-t-lg border-b border-gray-100 px-2 py-1.5 text-xs font-semibold hover:bg-gray-50 ${cell.isToday ? "bg-[#1b4332] text-white hover:bg-[#2d6a4f]" : "text-gray-700"}`}
            >
              <span>{weekdayLabel(cell.date)}</span>
              <span className={cell.isToday ? "text-white" : "text-gray-500"}>{cell.day}</span>
            </Link>
            <div className="min-h-[80px] space-y-0.5 p-1">
              {dayEvents.length === 0 ? (
                <span className="block px-1 py-1 text-[10px] text-gray-300">—</span>
              ) : (
                dayEvents.map((e) => <EventPill key={e.id} e={e} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
