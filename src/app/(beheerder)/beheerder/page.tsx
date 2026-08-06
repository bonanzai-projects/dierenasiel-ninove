import { getDashboardStats } from "@/lib/queries/dashboard";
import { getActiveStrayCatCampaigns } from "@/lib/queries/stray-cat-campaigns";
import StatsCards from "@/components/beheerder/dashboard/StatsCards";
import AlertWidget from "@/components/beheerder/dashboard/AlertWidget";
import TodoWidget from "@/components/beheerder/dashboard/TodoWidget";
import DeadlineWidget from "@/components/beheerder/dashboard/DeadlineWidget";
import RecentAdoptions from "@/components/beheerder/dashboard/RecentAdoptions";
import RecentAdoptionRequests, {
  ADOPTION_REQUEST_RANGES,
  DEFAULT_ADOPTION_REQUEST_RANGE,
  type AdoptionRequestRange,
} from "@/components/beheerder/dashboard/RecentAdoptionRequests";
import StatusOverview from "@/components/beheerder/dashboard/StatusOverview";
import ActiveStrayCatCampaigns from "@/components/beheerder/dashboard/ActiveStrayCatCampaigns";
import EventRemindersWidget from "@/components/beheerder/dashboard/EventRemindersWidget";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

interface PageProps {
  searchParams: Promise<{ aanvragen?: string }>;
}

export default async function BeheerderDashboard({ searchParams }: PageProps) {
  const { aanvragen } = await searchParams;
  const matched = ADOPTION_REQUEST_RANGES.find((r) => r.value === aanvragen);
  const range: AdoptionRequestRange = matched?.value ?? DEFAULT_ADOPTION_REQUEST_RANGE;
  const days = (matched ?? ADOPTION_REQUEST_RANGES.find((r) => r.value === DEFAULT_ADOPTION_REQUEST_RANGE)!).days;

  const [stats, activeStrayCatCampaigns, session] = await Promise.all([
    getDashboardStats({ adoptionRequestsDays: days }),
    getActiveStrayCatCampaigns(10),
    getSession(),
  ]);

  // Evenementen zijn sinds story 13.3 enkel voor beheerders; het blok volgt dat.
  const toontEvenementen = session ? hasPermission(session.role, "event:read") : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Overzicht van het dierenasiel.
      </p>

      <div className="mt-6">
        <StatsCards stats={stats} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusOverview statuses={stats.animalsByStatus} />
        <RecentAdoptions adoptions={stats.recentAdoptions} />
        <RecentAdoptionRequests requests={stats.recentAdoptionRequests} range={range} />
        <ActiveStrayCatCampaigns campaigns={activeStrayCatCampaigns} />
        <AlertWidget />
        <DeadlineWidget />
        <TodoWidget />
        {toontEvenementen && <EventRemindersWidget />}
      </div>
    </div>
  );
}
