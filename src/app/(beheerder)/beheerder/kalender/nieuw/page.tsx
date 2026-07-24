import CalendarEventForm from "@/components/beheerder/kalender/CalendarEventForm";
import { getAnimalsInShelter } from "@/lib/queries/animals";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function NieuwKalenderItemPage({ searchParams }: PageProps) {
  const { date } = await searchParams;
  // Voorvulling enkel als het een geldige YYYY-MM-DD is.
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  const animalsList = await getAnimalsInShelter();
  const animals = animalsList.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Nieuw kalender-item</h1>
      <CalendarEventForm mode="create" animals={animals} initialDate={initialDate} />
    </div>
  );
}
