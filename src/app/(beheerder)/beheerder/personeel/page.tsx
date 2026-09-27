import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getRecentAttendanceTasks, getVolunteerOptions } from "@/lib/queries/staff-attendance";
import {
  getCurrentPatterns,
  getPatternPeopleOptions,
  getPlannedAttendanceBetween,
} from "@/lib/queries/staff-patterns";
import { getSlotsBetween } from "@/lib/queries/staff-slots";
import { buildAttendanceWeek, weekStartFor } from "@/lib/staff/attendance";
import { taskSuggestions } from "@/lib/staff/tasks";
import { addDays } from "@/lib/calendar/events";
import { todayInBrussels } from "@/lib/validations/animal-weights";
import AttendanceWeek from "@/components/beheerder/personeel/AttendanceWeek";
import StaffPatternsPanel from "@/components/beheerder/personeel/StaffPatternsPanel";

interface Props {
  searchParams: Promise<{ week?: string }>;
}

export default async function PersoneelPage({ searchParams }: Props) {
  const permCheck = await requirePermission("staff:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const session = await getSession();
  const { week } = await searchParams;
  const mayManageOthers = !!session && hasPermission(session.role, "staff:write");

  // Vandaag in Brusselse tijd — een server in UTC mag de weekgrens niet verschuiven.
  // (Story 14.8: `getBelgianDayBounds().start.toISOString()` gaf hier gisteren — middernacht
  // in Brussel is in UTC nog de avond ervoor.)
  const today = todayInBrussels();
  const weekStart = weekStartFor(/^\d{4}-\d{2}-\d{2}$/.test(week ?? "") ? week! : today);

  // Story 14.2 — de taken van het voorbije halfjaar komen mee in de voorstellen.
  // Story 14.4 — de wandelaars enkel voor wie anderen mag inschrijven.
  // Story 14.3 — de plaatsjes van deze week.
  // Story 14.8 — de inschrijvingen samen met het vaste weekrooster, en dat rooster zelf.
  const [entries, eerdereTaken, volunteers, slots, patterns, people] = await Promise.all([
    getPlannedAttendanceBetween(weekStart, addDays(weekStart, 6)),
    getRecentAttendanceTasks(addDays(today, -183)),
    mayManageOthers ? getVolunteerOptions() : Promise.resolve([]),
    getSlotsBetween(weekStart, addDays(weekStart, 6)),
    getCurrentPatterns(today),
    mayManageOthers ? getPatternPeopleOptions() : Promise.resolve([]),
  ]);
  const days = buildAttendanceWeek(weekStart, entries);

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Personeel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Wie komt wanneer, en wat die komt doen. Schrijf jezelf in voor een hele dag, met uren en
          een taak, of neem een plaatsje dat de leiding klaarzette — dan weet de rest van het team op
          wie ze kunnen rekenen.
        </p>
      </div>

      <div className="mt-6">
        <AttendanceWeek
          week={days}
          weekStart={weekStart}
          prevWeek={addDays(weekStart, -7)}
          nextWeek={addDays(weekStart, 7)}
          today={today}
          currentUserId={session?.userId ?? null}
          mayManageOthers={mayManageOthers}
          taskSuggestions={taskSuggestions(eerdereTaken)}
          volunteers={volunteers}
          slots={slots}
        />
      </div>

      <div className="mt-6">
        <StaffPatternsPanel
          patterns={patterns}
          today={today}
          currentUserId={session?.userId ?? null}
          mayManageOthers={mayManageOthers}
          people={people}
        />
      </div>
    </div>
  );
}
