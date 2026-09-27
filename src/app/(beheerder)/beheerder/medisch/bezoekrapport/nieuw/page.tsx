import { getSession } from "@/lib/auth/session";
import { getAnimals } from "@/lib/queries/animals";
import { getAllDiagnoses } from "@/lib/queries/veterinary-diagnoses";
import { getVeterinarians } from "@/lib/queries/veterinarians";
import InspectionReportForm from "@/components/beheerder/medisch/InspectionReportForm";

export default async function NieuwBezoekrapportPage() {
  const [session, allAnimals, diagnoses, veterinarians] = await Promise.all([
    getSession(),
    getAnimals(),
    getAllDiagnoses(),
    getVeterinarians(),
  ]);

  const shelterAnimals = allAnimals.map((a) => ({
    id: a.id,
    name: a.name,
    species: a.species,
    identificationNr: a.identificationNr,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
        Nieuw bezoekrapport
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Registreer een inspectiebezoek van de contractdierenarts.
      </p>

      <div className="mt-6">
        <InspectionReportForm
          shelterAnimals={shelterAnimals}
          defaultVetName={session?.name ?? ""}
          diagnoses={diagnoses}
          vets={veterinarians.map((v) => ({ id: v.id, name: v.name, practice: v.practice }))}
        />
      </div>
    </div>
  );
}
