import Link from "next/link";
import CalendarView, { type CalendarViewMode } from "@/components/beheerder/kalender/CalendarView";
import { getCalendarEvents } from "@/lib/queries/calendar";
import { buildMonthGrid, startOfWeekMonday, addDays } from "@/lib/calendar/events";

interface PageProps {
  searchParams: Promise<{ view?: string; d?: string; y?: string; m?: string }>;
}

/** Belgische datum van vandaag als YYYY-MM-DD. */
function belgianToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

export default async function KalenderPage({ searchParams }: PageProps) {
  const { view: viewParam, d, y, m } = await searchParams;
  const todayStr = belgianToday();

  const view: CalendarViewMode = viewParam === "week" || viewParam === "dag" ? viewParam : "maand";

  // Referentiedatum: ?d= (gevalideerd), anders oude ?y=&m= (naar 1e van de maand),
  // anders vandaag.
  let refDate = todayStr;
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    refDate = d;
  } else if (y && m) {
    const yy = Number(y);
    const mm = Number(m);
    if (Number.isInteger(yy) && Number.isInteger(mm) && mm >= 1 && mm <= 12) {
      refDate = `${yy}-${String(mm).padStart(2, "0")}-01`;
    }
  }

  // Venster = de zichtbare periode van de gekozen view.
  let start: string;
  let end: string;
  if (view === "maand") {
    const year = Number(refDate.slice(0, 4));
    const month = Number(refDate.slice(5, 7));
    const grid = buildMonthGrid(year, month);
    start = grid[0].date;
    end = grid[grid.length - 1].date;
  } else if (view === "week") {
    start = startOfWeekMonday(refDate);
    end = addDays(start, 6);
  } else {
    start = refDate;
    end = refDate;
  }

  const events = await getCalendarEvents({ start, end });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Kalender</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gedeelde teamkalender — adopties, afspraken, wandelingen, to-do&apos;s, IBN-deadlines en eigen items.
          </p>
        </div>
        <Link
          href="/beheerder/kalender/nieuw"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f]"
        >
          + Nieuw item
        </Link>
      </div>

      <CalendarView view={view} refDate={refDate} todayStr={todayStr} events={events} />
    </div>
  );
}
