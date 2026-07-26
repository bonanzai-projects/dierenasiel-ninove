import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getAnimalShelterImportPreview } from "@/lib/queries/animalshelter";
import ImportTable from "@/components/beheerder/animalshelter/ImportTable";
import ReadOnlyBanner from "@/components/beheerder/animalshelter/ReadOnlyBanner";

/** Story 11.8 — dieren die alleen bij AnimalShelter bestaan lokaal aanmaken. */
export const dynamic = "force-dynamic";

export default async function AnimalShelterImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "animalshelter:read")) redirect("/beheerder");

  const result = await getAnimalShelterImportPreview();

  return (
    <div className="space-y-4">
      <Link href="/beheerder/animalshelter" className="text-sm text-[#1b4332] hover:underline">
        ← Terug naar het overzicht
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
          Dieren overnemen uit AnimalShelter
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Deze dieren staan wél bij AnimalShelter, maar nog niet in onze tool. Vink aan wat je wil
          aanmaken en controleer eerst wat er zal gebeuren — er wordt niets aangemaakt tot je
          bevestigt.
        </p>
      </div>

      <ReadOnlyBanner />

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <p className="font-medium text-gray-800">Wat een nieuwe fiche krijgt</p>
        <p className="mt-1">
          Naam, ras, geboortedatum, chipnummer, dossiernummer, intakedatum en -reden, de
          website-tekst en de foto&apos;s. Het dier komt aan het begin van ónze workflow te staan
          (fase &laquo;intake&raquo;, status &laquo;beschikbaar&raquo;).{" "}
          <strong>Kennel, medisch dossier en gedragsfiches blijven leeg</strong> — die kent
          AnimalShelter niet. Ook &laquo;gesteriliseerd&raquo; blijft leeg zolang de codes van
          AnimalShelter niet bevestigd zijn.
        </p>
      </div>

      {!result.ok ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-900">{result.error.message}</p>
        </div>
      ) : (
        <ImportTable kandidaten={result.kandidaten} />
      )}
    </div>
  );
}
