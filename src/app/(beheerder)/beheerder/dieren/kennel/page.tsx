import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import {
  getKennels,
  getKennelOccupancy,
  getAnimalsInKennels,
} from "@/lib/queries/kennels";
import { getAnimalsInShelter } from "@/lib/queries/animals";
import KennelLayoutManager from "@/components/beheerder/dieren/KennelLayoutManager";
import InfoButton from "@/components/beheerder/shared/InfoButton";

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
      {/*
        Story 10.51 — de uitleg zat als vaste alinea onder de titel en nam elke
        keer plaats in voor iets dat je één keer leest. Ze staat nu achter het
        'i'-knopje naast de titel.
      */}
      <div className="flex items-center gap-2">
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
          Kennel Overzicht
        </h1>
        <InfoButton title="Werken met het grondplan" label="Uitleg over het kennelscherm">
          <p>
            Klik op een vak in het grondplan voor de bewoners van dat hok.
          </p>
          <p className="mt-2">
            Via <span className="font-medium">Kennels beheren</span> open je de lijst om een
            kennel toe te voegen of haar positie en eigenschappen aan te passen — wijzigingen
            gebeuren via x/y/breedte/hoogte (in %).
          </p>
          <p className="mt-2">
            Met <span className="font-medium">Volledig scherm</span> toon je het plan over de
            hele breedte; een klik op een hok sluit dat venster en opent het hok.
          </p>
        </InfoButton>
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
