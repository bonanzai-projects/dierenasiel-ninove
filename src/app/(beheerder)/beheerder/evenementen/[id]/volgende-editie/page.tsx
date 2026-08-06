import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import {
  getEventById,
  getEventTasks,
  getEventCosts,
  getEventShifts,
} from "@/lib/queries/events";
import { nextEditionDefaults } from "@/lib/events/copy";
import { formatEventPeriod } from "@/lib/events/list";
import NextEditionForm from "@/components/beheerder/evenementen/NextEditionForm";

interface Props {
  params: Promise<{ id: string }>;
}

/** Story 13.10 — "volgende editie": begin bij wat er vorig jaar stond. */
export default async function VolgendeEditiePage({ params }: Props) {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const [event, tasks, costs, shifts] = await Promise.all([
    getEventById(eventId),
    getEventTasks(eventId),
    getEventCosts(eventId),
    getEventShifts(eventId),
  ]);
  if (!event) notFound();

  const voorstel = nextEditionDefaults({ name: event.name, date: event.date });

  return (
    <div className="space-y-6">
      <Link href={`/beheerder/evenementen/${event.id}`} className="text-sm text-[#2d6a4f] hover:underline">
        ← Terug naar {event.name}
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Volgende editie</h1>
        <p className="mt-1 text-sm text-gray-600">
          Een kopie van <span className="font-medium">{event.name}</span> ({formatEventPeriod(event)}),
          klaar om aan te passen.
        </p>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <NextEditionForm
          eventId={event.id}
          defaultName={voorstel.name}
          defaultDate={voorstel.date}
          counts={{ tasks: tasks.length, costs: costs.length, shifts: shifts.length }}
        />
      </div>
    </div>
  );
}
