import { notFound } from "next/navigation";
import Link from "next/link";
import { getVetInspectionReportById } from "@/lib/queries/vet-inspection-reports";
import { getVeterinarianById } from "@/lib/queries/veterinarians";
import InspectionReportView from "@/components/beheerder/medisch/InspectionReportView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BezoekrapportDetailPage({ params }: Props) {
  const { id } = await params;
  const reportId = parseInt(id, 10);

  if (isNaN(reportId)) notFound();

  const report = await getVetInspectionReportById(reportId);
  if (!report) notFound();
  // Story 10.81 — de fiche uit de dierenartsenlijst (weg als die intussen verwijderd werd).
  const veterinarian = report.veterinarianId ? await getVeterinarianById(report.veterinarianId) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <Link
          href="/beheerder/medisch/bezoekrapport"
          className="text-sm text-emerald-700 hover:text-emerald-900"
        >
          &larr; Terug naar overzicht
        </Link>
      </div>

      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
        Bezoekrapport {report.visitDate}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Inspectiebezoek door {report.vetName}
      </p>

      <div className="mt-6">
        <InspectionReportView report={report} veterinarian={veterinarian} />
      </div>
    </div>
  );
}
