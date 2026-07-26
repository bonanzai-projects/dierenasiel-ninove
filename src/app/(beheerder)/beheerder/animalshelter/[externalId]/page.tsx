import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getAnimalShelterComparison } from "@/lib/queries/animalshelter";
import ComparisonTable from "@/components/beheerder/animalshelter/ComparisonTable";
import LinkPanel from "@/components/beheerder/animalshelter/LinkPanel";
import ReadOnlyBanner from "@/components/beheerder/animalshelter/ReadOnlyBanner";

/** Story 11.5 — één dier, veld per veld. */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ externalId: string }>;
}

/**
 * Klasse C uit de koerswijziging §2: gegevens die alleen AnimalShelter bijhoudt.
 * Wél tonen als referentie, niet overneembaar — er is geen lokaal veld voor.
 */
const REFERENTIE_LABELS: Record<string, string> = {
  leeftijdscategorie: "Leeftijdscategorie",
  publish: "Gepubliceerd bij AnimalShelter",
  reserved: "Gereserveerd bij AnimalShelter",
  checkout_reason: "Reden van uitstroom",
};

export default async function AnimalShelterComparisonPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, "animalshelter:read")) redirect("/beheerder");

  const { externalId: raw } = await params;
  const externalId = Number(raw);
  if (!Number.isInteger(externalId) || externalId < 1) redirect("/beheerder/animalshelter");

  const result = await getAnimalShelterComparison(externalId);

  if (!result.ok) {
    return (
      <div className="space-y-4">
        <Link href="/beheerder/animalshelter" className="text-sm text-[#1b4332] hover:underline">
          ← Terug naar het overzicht
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-900">{result.error.message}</p>
        </div>
      </div>
    );
  }

  const { external, local, diff, kandidaten, genegeerdDier } = result;
  const eigenschappen = Object.entries(external.properties ?? {}).filter(([, v]) => v !== null);

  return (
    <div className="space-y-4">
      <Link href="/beheerder/animalshelter" className="text-sm text-[#1b4332] hover:underline">
        ← Terug naar het overzicht
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1b4332]">{external.naam}</h1>
          <p className="mt-1 text-sm text-gray-500">
            AnimalShelter-nr {external.nummer ?? "—"} · {external.ras || "ras onbekend"}
            {external.identificatie ? ` · chip ${external.identificatie}` : " · geen chipnummer"}
          </p>
        </div>
        {external.hoofdbeeld && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={external.hoofdbeeld}
            alt={`Foto van ${external.naam} bij AnimalShelter`}
            className="h-24 w-24 rounded-lg object-cover"
          />
        )}
      </div>

      <ReadOnlyBanner />

      <LinkPanel
        externalId={externalId}
        animalId={local?.id ?? null}
        localName={local?.name ?? null}
        kandidaten={kandidaten}
        genegeerd={genegeerdDier}
      />

      {local && diff ? (
        <ComparisonTable externalId={externalId} animalId={local.id} rows={diff.rows} />
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          Koppel dit dier eerst aan een fiche om de gegevens te kunnen vergelijken.
        </p>
      )}

      {(eigenschappen.length > 0 || external.leeftijdscategorie) && (
        <details className="rounded-xl border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#1b4332]">
            Alleen bij AnimalShelter bekend
          </summary>
          <p className="mt-1 text-xs text-gray-500">
            Deze gegevens hebben geen tegenhanger in onze fiche en zijn daarom niet overneembaar.
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {Object.entries(REFERENTIE_LABELS).map(([key, label]) => {
              const waarde = (external as unknown as Record<string, unknown>)[key];
              if (waarde === null || waarde === undefined || waarde === "") return null;
              return (
                <div key={key} className="flex justify-between gap-3 border-b border-gray-100 py-1">
                  <dt className="text-gray-600">{label}</dt>
                  <dd className="text-gray-900">{String(waarde)}</dd>
                </div>
              );
            })}
            {eigenschappen.map(([key, waarde]) => (
              <div key={key} className="flex justify-between gap-3 border-b border-gray-100 py-1">
                <dt className="text-gray-600">{key.replace(/_/g, " ")}</dt>
                <dd className="text-gray-900">{waarde}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
