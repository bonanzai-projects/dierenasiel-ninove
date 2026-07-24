import CalendarView from "@/components/beheerder/kalender/CalendarView";
import { getCalendarEvents } from "@/lib/queries/calendar";
import { buildMonthGrid } from "@/lib/calendar/events";

interface PageProps {
  searchParams: Promise<{ y?: string; m?: string }>;
}

/** Belgische datum van vandaag als YYYY-MM-DD. */
function belgianToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

export default async function KalenderPage({ searchParams }: PageProps) {
  const { y, m } = await searchParams;
  const todayStr = belgianToday();

  // Standaard de huidige maand; anders wat in de URL staat (met validatie).
  let year = Number(y);
  let month = Number(m);
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    year = Number(todayStr.slice(0, 4));
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    month = Number(todayStr.slice(5, 7));
  }

  // Venster = het zichtbare maandrooster (6 weken).
  const grid = buildMonthGrid(year, month);
  const start = grid[0].date;
  const end = grid[grid.length - 1].date;
  const events = await getCalendarEvents({ start, end });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Kalender</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gedeelde teamkalender — adopties, afspraken, wandelingen, to-do&apos;s en IBN-deadlines.
        </p>
      </div>

      <CalendarView year={year} month={month} todayStr={todayStr} events={events} />
    </div>
  );
}
