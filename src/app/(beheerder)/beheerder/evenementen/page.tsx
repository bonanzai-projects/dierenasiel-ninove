import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getEvents } from "@/lib/queries/events";
import { splitEvents, formatEventPeriod } from "@/lib/events/list";
import { eventStatusLabel, eventStatusPill, eventTypeLabel } from "@/lib/events/types";
import type { EventRow } from "@/lib/actions/events";
import InfoButton from "@/components/beheerder/shared/InfoButton";

function EventCard({ event }: { event: EventRow }) {
  return (
    <li>
      <Link
        href={`/beheerder/evenementen/${event.id}`}
        className="block rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-[#2d6a4f] hover:bg-emerald-50/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-base font-semibold text-[#1b4332]">{event.name}</h3>
            <p className="mt-0.5 text-sm text-gray-600">
              {eventTypeLabel(event.type)} · {formatEventPeriod(event)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${eventStatusPill(event.status)}`}>
            {eventStatusLabel(event.status)}
          </span>
        </div>
        {event.responsible && (
          <p className="mt-1 text-xs text-gray-500">Verantwoordelijke: {event.responsible}</p>
        )}
      </Link>
    </li>
  );
}

export default async function EvenementenPage() {
  const permCheck = await requirePermission("event:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const alle = await getEvents();
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const { komend, afgelopen } = splitEvents(alle, vandaag);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Evenementen</h1>
        <InfoButton title="Werken met evenementen" label="Uitleg over het evenementenscherm">
          <p>
            Elk evenement — een eetkermis, een quiz, een standje op de markt — krijgt een eigen
            fiche. Op die fiche komt het draaiboek te staan: wie doet wat, en wanneer.
          </p>
          <p className="mt-2">
            Evenementen waarvan de datum voorbij is, schuiven vanzelf naar{" "}
            <span className="font-medium">Afgelopen</span>. De status blijft wel handmatig: een
            evenement dat niet doorgaat, zet je zelf op <span className="font-medium">Geannuleerd</span>.
          </p>
        </InfoButton>
        <Link
          href="/beheerder/evenementen/nieuw"
          className="ml-auto rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f]"
        >
          + Nieuw evenement
        </Link>
      </div>

      {alle.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">
            Er staat nog geen enkel evenement in. Begin met het eerstvolgende dat op de planning
            staat — de eetkermis bijvoorbeeld.
          </p>
        </div>
      )}

      {komend.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Komend ({komend.length})
          </h2>
          <ul className="space-y-2">
            {komend.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        </section>
      )}

      {afgelopen.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Afgelopen ({afgelopen.length})
          </h2>
          <ul className="space-y-2 opacity-80">
            {afgelopen.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
