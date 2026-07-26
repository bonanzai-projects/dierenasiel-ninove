import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getAnimalShelterOverview } from "@/lib/queries/animalshelter";
import OverviewTable from "@/components/beheerder/animalshelter/OverviewTable";
import ReadOnlyBanner from "@/components/beheerder/animalshelter/ReadOnlyBanner";
import RefreshButton from "@/components/beheerder/animalshelter/RefreshButton";

/** Story 11.4 — het overzicht. Externe gegevens worden live opgehaald. */
export const dynamic = "force-dynamic";

export default async function AnimalShelterPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "animalshelter:read")) redirect("/beheerder");

  const result = await getAnimalShelterOverview();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1b4332]">AnimalShelter</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vergelijk onze fiches met de registratie op animalshelter.be en beslis per veld wat er
            met een verschil moet gebeuren.
          </p>
        </div>
        <RefreshButton />
      </div>

      <ReadOnlyBanner />

      {!result.ok ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-900">{result.error.message}</p>
          {result.error.code === "disabled" && (
            <p className="mt-1 text-xs text-amber-800">
              De koppeling staat standaard uit. Zolang ze uitstaat, wordt er geen enkele oproep
              gedaan.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {result.model.entries.length} dieren bij AnimalShelter ·{" "}
            {result.model.tellers.enkelLokaal} dieren enkel bij ons · opgehaald om{" "}
            {result.opgehaaldOp.toLocaleTimeString("nl-BE", {
              timeZone: "Europe/Brussels",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <OverviewTable model={result.model} />
        </>
      )}
    </div>
  );
}
