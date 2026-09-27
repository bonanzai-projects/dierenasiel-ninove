import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getVeterinarians } from "@/lib/queries/veterinarians";
import VeterinariansManager from "@/components/beheerder/medisch/VeterinariansManager";

/**
 * Story 10.81 — de dierenartsenlijst. Sven (2 aug 2026): "van bepaalde dierenartsen een
 * fiche kunnen bijhouden om dan op bepaalde plaatsen te gebruiken om uit lijst te kiezen".
 */
export default async function DierenartsenPage() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "medical:read")) redirect("/beheerder");

  const lijst = await getVeterinarians();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/beheerder/medisch/bezoekrapport" className="text-sm text-emerald-700 hover:text-emerald-900">
        &larr; Terug naar de bezoekrapporten
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Dierenartsen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vul hier één keer de gegevens van een dierenarts in. Bij een bezoekrapport kies je de dierenarts dan uit
          de lijst, en komen adres, nummer en ordenummer mee op het rapport.
        </p>
      </div>

      <VeterinariansManager veterinarians={lijst} canWrite={hasPermission(session.role, "medical:write")} />
    </div>
  );
}
