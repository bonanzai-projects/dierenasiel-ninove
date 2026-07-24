"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_MAP,
  CALENDAR_CATEGORY_KEYS,
  type CalendarCategoryKey,
} from "@/lib/calendar/categories";
import {
  buildMonthGrid,
  groupEventsByDate,
  sortDayEvents,
  filterEventsByCategories,
  upcomingEvents,
  monthTitle,
  addMonths,
  WEEKDAY_LABELS,
  type CalendarEvent,
} from "@/lib/calendar/events";

interface CalendarViewProps {
  year: number;
  month: number; // 1-12
  todayStr: string; // YYYY-MM-DD
  events: CalendarEvent[];
}

const MAX_PILLS_PER_DAY = 3;

function monthHref(year: number, month: number): string {
  return `/beheerder/kalender?y=${year}&m=${month}`;
}

/** "ma 14 jul" voor de komende-items-lijst. */
function shortDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

function EventPill({ e }: { e: CalendarEvent }) {
  const cat = CALENDAR_CATEGORY_MAP[e.category];
  const label = `${e.time ? `${e.time} ` : ""}${e.title}`;
  const inner = (
    <span
      title={label}
      className={`block truncate rounded border px-1 py-[1px] text-[10px] leading-tight ${cat.pill}`}
    >
      {label}
    </span>
  );
  return e.href ? (
    <Link href={e.href} className="block hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function CalendarView({ year, month, todayStr, events }: CalendarViewProps) {
  const [active, setActive] = useState<Set<CalendarCategoryKey>>(
    () => new Set(CALENDAR_CATEGORY_KEYS),
  );

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
  const grid = buildMonthGrid(year, month, todayStr);

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const todayYear = Number(todayStr.slice(0, 4));
  const todayMonth = Number(todayStr.slice(5, 7));

  const upcoming = upcomingEvents(visible, todayStr, 15);

  return (
    <div className="space-y-4">
      {/* Kop: navigatie */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={monthHref(prev.year, prev.month)}
            aria-label="Vorige maand"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ‹
          </Link>
          <h2 className="min-w-[9rem] text-center font-heading text-lg font-bold text-[#1b4332]">
            {monthTitle(year, month)}
          </h2>
          <Link
            href={monthHref(next.year, next.month)}
            aria-label="Volgende maand"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ›
          </Link>
        </div>
        <Link
          href={monthHref(todayYear, todayMonth)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Vandaag
        </Link>
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
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                on
                  ? "border-gray-300 bg-white text-gray-800"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${on ? cat.dot : "bg-gray-300"}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Maandrooster */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAY_LABELS.map((wd) => (
            <div
              key={wd}
              className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
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
                className={`min-h-[92px] border-b border-r border-gray-100 p-1 ${
                  cell.inCurrentMonth ? (weekend ? "bg-gray-50/40" : "bg-white") : "bg-gray-50/70"
                }`}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      cell.isToday
                        ? "bg-[#1b4332] font-bold text-white"
                        : cell.inCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {shown.map((e) => (
                    <EventPill key={e.id} e={e} />
                  ))}
                  {overflow > 0 && (
                    <span className="block px-1 text-[10px] font-medium text-gray-500">
                      +{overflow} meer
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Komende items */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-[#1b4332]">Komende items</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">Geen komende items in deze maand.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((e) => {
              const cat = CALENDAR_CATEGORY_MAP[e.category];
              const row = (
                <div className="flex items-center gap-3 py-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cat.dot}`} />
                  <span className="w-24 shrink-0 text-xs font-medium text-gray-500">
                    {shortDayLabel(e.date)}
                  </span>
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
    </div>
  );
}
