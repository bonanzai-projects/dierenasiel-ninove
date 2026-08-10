import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getAttendanceForWeek } from "@/lib/queries/staff-attendance";
import { buildAttendanceWeek, weekStartFor } from "@/lib/staff/attendance";
import { addDays } from "@/lib/calendar/events";
import { getBelgianDayBounds } from "@/lib/utils/date";
import AttendanceWeek from "@/components/beheerder/personeel/AttendanceWeek";

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

  // Vandaag in Brusselse tijd — een server in UTC mag de weekgrens niet verschuiven.
  const today = getBelgianDayBounds().start.toISOString().slice(0, 10);
  const weekStart = weekStartFor(/^\d{4}-\d{2}-\d{2}$/.test(week ?? "") ? week! : today);

  const entries = await getAttendanceForWeek(weekStart);
  const days = buildAttendanceWeek(weekStart, entries);

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Personeel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Wie komt welke dag. Schrijf jezelf in, dan weet de rest van het team op wie ze kunnen
          rekenen.
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
          mayManageOthers={!!session && hasPermission(session.role, "staff:write")}
        />
      </div>
    </div>
  );
}
