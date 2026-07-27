import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import {
  getKennels,
  getKennelOccupancy,
  getAnimalsInKennels,
} from "@/lib/queries/kennels";
import { getAnimalsInShelter } from "@/lib/queries/animals";
import KennelLayoutManager from "@/components/beheerder/dieren/KennelLayoutManager";

export default async function KennelOverviewPage() {
  const permCheck = await requirePermission("kennel:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const [kennelsList, occupancy, animalsByKennel, allAnimals] = await Promise.all([
    getKennels(),
    getKennelOccupancy(),
    getAnimalsInKennels(),
    getAnimalsInShelter(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
          Kennel Overzicht
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Klik op een vak in het grondplan voor de bewoners. Via <span className="font-medium">Kennels beheren</span> open je de lijst om een kennel toe te voegen of haar positie en eigenschappen aan te passen — wijzigingen gebeuren via x/y/breedte/hoogte (in %).
        </p>
      </div>

      <KennelLayoutManager
        kennels={kennelsList}
        occupancy={occupancy}
        animalsByKennel={animalsByKennel}
        allAnimals={allAnimals}
      />
    </div>
  );
}
