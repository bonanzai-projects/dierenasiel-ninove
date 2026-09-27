import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { adoptionCandidates, animals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { getContractById } from "@/lib/queries/adoption-contracts";
import { getAdoptionUpdatesByAnimalId } from "@/lib/queries/adoption-updates";
import { todayInBrussels } from "@/lib/validations/animal-weights";
import AdoptionContractStatusBadge from "@/components/beheerder/adoptie/AdoptionContractStatusBadge";
import AdoptionContractActions from "@/components/beheerder/adoptie/AdoptionContractActions";
import SignedDocumentUpload from "@/components/beheerder/adoptie/SignedDocumentUpload";
import AdoptionUpdatesSection from "@/components/beheerder/adoptie/AdoptionUpdatesSection";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: Props) {
  const permCheck = await requirePermission("adoption:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const { id } = await params;
  const contractId = parseInt(id, 10);
  if (isNaN(contractId)) notFound();

  const contract = await getContractById(contractId);
  if (!contract) notFound();

  const [candidate] = contract.candidateId
    ? await db
        .select()
        .from(adoptionCandidates)
        .where(eq(adoptionCandidates.id, contract.candidateId))
        .limit(1)
    : [];
  const [animal] = await db
    .select()
    .from(animals)
    .where(eq(animals.id, contract.animalId))
    .limit(1);

  if (!animal) notFound();

  // Story 10.74: berichten en foto's na adoptie van dit dier (bekijken = adoption:read, al gecontroleerd).
  const [session, adoptieBerichten] = await Promise.all([getSession(), getAdoptionUpdatesByAnimalId(animal.id)]);
  const magAdoptieSchrijven = session ? hasPermission(session.role, "adoption:write") : false;

  // Story 10.20+: snapshot eerst, fallback op candidate/animal voor displaymet.
  const adoptantFirstName = contract.snapshotAdoptantFirstName ?? candidate?.firstName ?? "";
  const adoptantLastName = contract.snapshotAdoptantLastName ?? candidate?.lastName ?? "";
  const adoptantEmail = contract.snapshotAdoptantEmail ?? candidate?.email ?? "";
  const displayAnimalName = contract.snapshotAnimalName ?? animal.name;
  const displayAnimalSpecies = contract.snapshotAnimalSpecies ?? animal.species;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/beheerder/adoptie?tab=contracten"
          className="text-sm text-emerald-700 hover:text-emerald-900"
        >
          &larr; Terug naar contracten
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
              Contract #{contract.id}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {adoptantFirstName} {adoptantLastName} adopteert {displayAnimalName}
            </p>
          </div>
          <AdoptionContractStatusBadge status={contract.status} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-[#1b4332]">Contractgegevens</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Contractdatum" value={new Date(contract.contractDate).toLocaleDateString("nl-BE")} />
          <Field label="Bedrag" value={`€ ${contract.paymentAmount}`} />
          <Field label="Betaalwijze" value={contract.paymentMethod} />
          <Field label="Adoptant" value={`${adoptantFirstName} ${adoptantLastName}`} />
          <Field label="Email" value={adoptantEmail || "—"} />
          <Field label="Dier" value={`${displayAnimalName} (${displayAnimalSpecies})`} />
          {contract.notes && <Field label="Opmerkingen" value={contract.notes} fullWidth />}
        </dl>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-[#1b4332]">PDF en handtekening</h2>

        <AdoptionContractActions
          contractId={contract.id}
          status={contract.status}
          candidateEmail={adoptantEmail}
          animalName={displayAnimalName}
          pdfUrl={`/api/adoptie-contract/${contract.id}/pdf`}
        />

        <div className="mt-5 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700">Getekende versie</h3>
          {contract.signedDocumentUrl ? (
            <div className="mt-2 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-xs text-emerald-800">
                Getekend op {contract.signedAt ? new Date(contract.signedAt).toLocaleString("nl-BE") : "—"}{" "}
                ({contract.signingMethod ?? "papier"})
              </span>
              <a
                href={contract.signedDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-emerald-800 underline hover:text-emerald-900"
              >
                Bekijken
              </a>
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Nog geen getekend document opgeladen.</p>
          )}
          <SignedDocumentUpload
            uploadUrl={`/api/adoptie-contract/${contract.id}/signed-upload`}
            hasExisting={Boolean(contract.signedDocumentUrl)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-[#1b4332]">Berichten na adoptie</h2>
        <AdoptionUpdatesSection
          animalId={animal.id}
          canWrite={magAdoptieSchrijven}
          updates={adoptieBerichten}
          today={todayInBrussels()}
        />
      </div>
    </div>
  );
}

function Field({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value}</dd>
    </div>
  );
}
