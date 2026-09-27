import type { Walker } from "@/types";
import { regulationsStatusLabel } from "@/lib/walkers/regulations";

interface Props {
  walker: Walker;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "In afwachting", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Goedgekeurd", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Afgewezen", className: "bg-red-100 text-red-800" },
  inactive: { label: "Inactief", className: "bg-gray-100 text-gray-600" },
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800">{value || "-"}</dd>
    </div>
  );
}

export default function WalkerDetailView({ walker }: Props) {
  const badge = STATUS_BADGES[walker.status] ?? STATUS_BADGES.pending;

  return (
    <div className="space-y-6">
      {/* Profielkaart */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-5">
          {walker.photoUrl ? (
            <img
              src={walker.photoUrl}
              alt={`${walker.firstName} ${walker.lastName}`}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-400">
              {walker.firstName.charAt(0)}{walker.lastName.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="font-heading text-lg font-bold text-[#1b4332]">
              {walker.firstName} {walker.lastName}
            </h2>
            {walker.barcode && (
              <p className="mt-0.5 font-mono text-xs text-gray-500">{walker.barcode}</p>
            )}
            <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Persoonlijke gegevens */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-sm font-bold text-[#1b4332]">Persoonlijke gegevens</h3>
        <dl className="mt-3 space-y-2">
          <InfoRow label="Geboortedatum" value={walker.dateOfBirth ? new Date(walker.dateOfBirth).toLocaleDateString("nl-BE") : null} />
          <InfoRow label="Adres" value={walker.address} />
          <InfoRow label="Telefoon" value={walker.phone} />
          <InfoRow label="Email" value={walker.email} />
        </dl>
      </div>

      {/* Controle-info */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-sm font-bold text-[#1b4332]">Controle-informatie</h3>
        <dl className="mt-3 space-y-2">
          {/* Story 10.77: wanneer en welke versie — of dat het nog gevraagd wordt. */}
          <InfoRow label="Wandelreglement" value={regulationsStatusLabel(walker)} />
          <InfoRow label="Allergieën" value={walker.allergies || "Geen"} />
          <InfoRow label="Kinderen meewandelen" value={walker.childrenWalkAlong ? "Ja" : "Nee"} />
        </dl>
      </div>

      {/* Statistieken */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-sm font-bold text-[#1b4332]">Statistieken</h3>
        <dl className="mt-3 space-y-2">
          <InfoRow label="Aantal wandelingen" value={String(walker.walkCount)} />
          <InfoRow label="Wandelclub-lid" value={walker.isWalkingClubMember ? "Ja" : "Nee"} />
          <InfoRow label="Geregistreerd op" value={new Date(walker.createdAt).toLocaleDateString("nl-BE")} />
        </dl>
      </div>

      {/* Afwijzingsreden (indien van toepassing) */}
      {walker.status === "rejected" && walker.rejectionReason && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <h3 className="font-heading text-sm font-bold text-red-800">Reden voor afwijzing</h3>
          <p className="mt-2 text-sm text-red-700">{walker.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}
