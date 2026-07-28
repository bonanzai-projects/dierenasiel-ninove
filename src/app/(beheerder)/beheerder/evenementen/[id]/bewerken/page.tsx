import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getEventById } from "@/lib/queries/events";
import EventForm from "@/components/beheerder/evenementen/EventForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EvenementBewerkenPage({ params }: Props) {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder/evenementen");
  }

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const event = await getEventById(eventId);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/beheerder/evenementen/${event.id}`} className="text-sm text-[#2d6a4f] hover:underline">
        ← Terug naar {event.name}
      </Link>
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Evenement bewerken</h1>
      <EventForm mode="edit" event={event} />
    </div>
  );
}
