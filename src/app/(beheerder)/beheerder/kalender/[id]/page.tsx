import { notFound } from "next/navigation";
import CalendarEventForm from "@/components/beheerder/kalender/CalendarEventForm";
import DeleteEventButton from "@/components/beheerder/kalender/DeleteEventButton";
import { getCalendarEventById } from "@/lib/queries/calendar";
import { getAnimalsInShelter } from "@/lib/queries/animals";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BewerkKalenderItemPage({ params }: Props) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const [event, animalsList] = await Promise.all([
    getCalendarEventById(eventId),
    getAnimalsInShelter(),
  ]);
  if (!event) notFound();

  const animals = animalsList.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Kalender-item bewerken</h1>
        <DeleteEventButton id={event.id} />
      </div>
      <CalendarEventForm mode="edit" event={event} animals={animals} />
    </div>
  );
}
