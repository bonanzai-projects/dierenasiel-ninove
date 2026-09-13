import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getVetInspectionReportsFiltered } from "@/lib/queries/reports";
import DateRangeFilter from "@/components/beheerder/rapporten/DateRangeFilter";
import ReportExportBar from "@/components/beheerder/rapporten/ReportExportBar";
import Pagination from "@/components/beheerder/dieren/Pagination";
import PdfViewerButton from "@/components/beheerder/shared/PdfViewer";
import type { TreatedAnimalEntry, EuthanizedAnimalEntry, AbnormalBehaviorEntry } from "@/types";

const PAGE_SIZE = 50;

// Default: 2 jaar terug (wettelijke vereiste KB 27/04/2007)
function getDefaultDateFrom(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BezoekrapportenPage({ searchParams }: Props) {
  const permCheck = await requirePermission("report:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const params = await searchParams;

  const dateFrom = typeof params.van === "string" ? params.van : getDefaultDateFrom();
  const dateTo = typeof params.tot === "string" ? params.tot : getDefaultDateTo();
  const page = typeof params.pagina === "string" ? parseInt(params.pagina, 10) || 1 : 1;

  const { reports, total } = await getVetInspectionReportsFiltered({
    dateFrom, dateTo, page, pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/beheerder/rapporten"
            className="text-sm text-emerald-700 hover:text-emerald-800"
          >
            &larr; Terug naar rapporten
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            R11 — Bezoekrapporten contractdierenarts
          </h1>
          <p className="text-sm text-gray-500">{total} rapporten</p>
        </div>
        <Suspense>
          {/* Story 10.71 — Sven: in het programma bekijken, niet downloaden. */}
          <ReportExportBar
            pdfUrl="/api/rapporten/bezoekrapporten/pdf"
            filenamePrefix="bezoekrapporten"
            viewInApp
            pdfTitle="R11 — Bezoekrapporten contractdierenarts"
          />
        </Suspense>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs text-amber-800">
          <strong>Wettelijke vereiste (KB 27/04/2007):</strong> Bezoekrapporten worden minimaal 2 jaar bewaard. Standaard worden rapporten van de afgelopen 2 jaar getoond.
        </p>
      </div>

      <Suspense>
        <DateRangeFilter />
      </Suspense>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Datum</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dierenarts</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Behandeld</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Euthanasie</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Gedrag</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aanbevelingen</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Getekend</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  Geen bezoekrapporten gevonden in het opgegeven datumbereik.
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const treated = (report.animalsTreated ?? []) as TreatedAnimalEntry[];
                const euthanized = (report.animalsEuthanized ?? []) as EuthanizedAnimalEntry[];
                const behavior = (report.abnormalBehavior ?? []) as AbnormalBehaviorEntry[];
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium whitespace-nowrap">{report.visitDate}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{report.vetName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{treated.length}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{euthanized.length}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{behavior.length}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{report.recommendations ?? "-"}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${report.vetSignature ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {report.vetSignature ? "Ja" : "Nee"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <PdfViewerButton
                        src={`/api/rapporten/bezoekrapport/${report.id}/pdf`}
                        title={`Bezoekrapport ${report.visitDate} — ${report.vetName}`}
                        className="text-emerald-700 hover:text-emerald-800 hover:underline text-xs font-medium"
                      >
                        Bekijken
                      </PdfViewerButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}
