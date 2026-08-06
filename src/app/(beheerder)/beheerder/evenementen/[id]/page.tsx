import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import {
  getEventById,
  getEventTasks,
  getEventCosts,
  getEventShifts,
  getEventEvaluation,
  getPreviousEditionLessons,
  getEventMaterials,
} from "@/lib/queries/events";
import { draaiboekProgress } from "@/lib/events/draaiboek";
import { formatEventPeriod } from "@/lib/events/list";
import { eventStatusLabel, eventStatusPill, eventTypeLabel } from "@/lib/events/types";
import DeleteEventButton from "@/components/beheerder/evenementen/DeleteEventButton";
import DraaiboekPanel from "@/components/beheerder/evenementen/DraaiboekPanel";
import EventCostsPanel from "@/components/beheerder/evenementen/EventCostsPanel";
import EventShiftsPanel from "@/components/beheerder/evenementen/EventShiftsPanel";
import EventEvaluationPanel from "@/components/beheerder/evenementen/EventEvaluationPanel";
import EventMaterialsPanel from "@/components/beheerder/evenementen/EventMaterialsPanel";

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

  const [event, tasks, costs, shifts, evaluation, materials] = await Promise.all([
    getEventById(eventId),
    getEventTasks(eventId),
    getEventCosts(eventId),
    getEventShifts(eventId),
    getEventEvaluation(eventId),
    getEventMaterials(eventId),
  ]);
  if (!event) notFound();

  const [session, vorigeEditie] = await Promise.all([
    getSession(),
    getPreviousEditionLessons(event.copiedFromEventId),
  ]);
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

        <div className="flex items-center gap-2">
          {/* Story 13.4 — het blad dat aan de muur hangt. Openen in een nieuw
              tabblad, los van de rest van de fiche. */}
          <a
            href={`/api/evenementen/${event.id}/draaiboek/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Draaiboek (PDF)
          </a>
          {magSchrijven && (
            <>
              <Link
                href={`/beheerder/evenementen/${event.id}/volgende-editie`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Volgende editie
              </Link>
              <Link
                href={`/beheerder/evenementen/${event.id}/bewerken`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bewerken
              </Link>
              <DeleteEventButton id={event.id} name={event.name} />
            </>
          )}
        </div>
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

      {/* Story 13.10 — waarom de evaluatie bestaat: ze komt terug wanneer je de
          volgende editie voorbereidt. */}
      {vorigeEditie && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-heading text-base font-semibold text-amber-900">
            Wat we vorig jaar afspraken
          </h2>
          <p className="text-xs text-amber-800">
            Uit de evaluatie van{" "}
            <Link href={`/beheerder/evenementen/${vorigeEditie.id}`} className="underline">
              {vorigeEditie.name}
            </Link>
          </p>
          <dl className="mt-2 space-y-2">
            {vorigeEditie.agreements && (
              <div>
                <dt className="text-xs font-medium text-amber-800">Afspraken voor volgende keer</dt>
                <dd className="whitespace-pre-wrap text-sm text-amber-950">{vorigeEditie.agreements}</dd>
              </div>
            )}
            {vorigeEditie.couldBeBetter && (
              <div>
                <dt className="text-xs font-medium text-amber-800">Wat kon beter</dt>
                <dd className="whitespace-pre-wrap text-sm text-amber-950">{vorigeEditie.couldBeBetter}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <DraaiboekPanel
        eventId={event.id}
        tasks={tasks}
        canWrite={magSchrijven}
        today={new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" })}
      />

      <EventShiftsPanel
        eventId={event.id}
        shifts={shifts}
        eventDate={event.date}
        canWrite={magSchrijven}
      />

      <EventMaterialsPanel eventId={event.id} materials={materials} canWrite={magSchrijven} />

      <EventCostsPanel eventId={event.id} lines={costs} canWrite={magSchrijven} />

      <EventEvaluationPanel
        eventId={event.id}
        evaluation={evaluation}
        costs={costs}
        shiftCount={shifts.length}
        tasksDone={draaiboekProgress(tasks).done}
        tasksTotal={tasks.length}
        canWrite={magSchrijven}
      />
    </div>
  );
}
