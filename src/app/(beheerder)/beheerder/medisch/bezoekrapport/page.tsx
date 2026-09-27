import Link from "next/link";
import { getVetInspectionReports, countReportsThisWeek } from "@/lib/queries/vet-inspection-reports";
import InspectionReportList from "@/components/beheerder/medisch/InspectionReportList";

export default async function BezoekrapportPage() {
  const [reports, weekCount] = await Promise.all([
    getVetInspectionReports(),
    countReportsThisWeek(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
            Bezoekrapporten Contractdierenarts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Wettelijk verplichte inspectierapporten (KB 27/04/2007).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Story 10.81 — de fiches van de dierenartsen. */}
          <Link
            href="/beheerder/medisch/dierenartsen"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dierenartsen
          </Link>
          <Link
            href="/beheerder/medisch/bezoekrapport/nieuw"
            className="rounded-md bg-[#1b4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f]"
          >
            Nieuw rapport
          </Link>
        </div>
      </div>

      {/* Compliance indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${weekCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {weekCount > 0
            ? `${weekCount} rapport(en) deze week`
            : "Nog geen rapport deze week"}
        </div>
        <span className="text-xs text-gray-400">Streefdoel: 1x/week</span>
      </div>

      <div className="mt-6">
        <InspectionReportList reports={reports} />
      </div>
    </div>
  );
}
