import CalendarEventForm from "@/components/beheerder/kalender/CalendarEventForm";
import { getAnimalsInShelter } from "@/lib/queries/animals";

export default async function NieuwKalenderItemPage() {
  const animalsList = await getAnimalsInShelter();
  const animals = animalsList.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Nieuw kalender-item</h1>
      <CalendarEventForm mode="create" animals={animals} />
    </div>
  );
}
