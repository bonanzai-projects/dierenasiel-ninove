import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { getEventById, getEventTasks } from "@/lib/queries/events";
import { formatEventPeriod } from "@/lib/events/list";
import { eventStatusLabel, eventStatusPill, eventTypeLabel } from "@/lib/events/types";
import DeleteEventButton from "@/components/beheerder/evenementen/DeleteEventButton";
import DraaiboekPanel from "@/components/beheerder/evenementen/DraaiboekPanel";

interface Props {
  params: Promise<{ id: string }>;
}

function Regel({ label, waarde }: { label: string; waarde: string | number | null }) {
  if (waarde === null || waarde === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{waarde}</dd>
    </div>
  );
}

export default async function EvenementFichePage({ params }: Props) {
  const permCheck = await requirePermission("event:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const [event, tasks] = await Promise.all([getEventById(eventId), getEventTasks(eventId)]);
  if (!event) notFound();

  const session = await getSession();
  const magSchrijven = session ? hasPermission(session.role, "event:write") : false;

  return (
    <div className="space-y-6">
      <Link href="/beheerder/evenementen" className="text-sm text-[#2d6a4f] hover:underline">
        ← Terug naar evenementen
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#1b4332]">{event.name}</h1>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${eventStatusPill(event.status)}`}>
              {eventStatusLabel(event.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {eventTypeLabel(event.type)} · {formatEventPeriod(event)}
          </p>
        </div>

        {magSchrijven && (
          <div className="flex items-center gap-2">
            <Link
              href={`/beheerder/evenementen/${event.id}/bewerken`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Bewerken
            </Link>
            <DeleteEventButton id={event.id} name={event.name} />
          </div>
        )}
      </div>

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-heading text-base font-semibold text-[#1b4332]">Gegevens</h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Regel label="Periode" waarde={formatEventPeriod(event)} />
          <Regel label="Locatie" waarde={event.location} />
          <Regel label="Verantwoordelijke" waarde={event.responsible} />
          <Regel label="Verwachte bezoekers" waarde={event.expectedVisitors} />
        </dl>
        {event.description && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <dt className="text-xs font-medium text-gray-500">Omschrijving</dt>
            <dd className="whitespace-pre-wrap text-sm text-gray-900">{event.description}</dd>
          </div>
        )}
      </section>

      <DraaiboekPanel eventId={event.id} tasks={tasks} canWrite={magSchrijven} />
    </div>
  );
}
