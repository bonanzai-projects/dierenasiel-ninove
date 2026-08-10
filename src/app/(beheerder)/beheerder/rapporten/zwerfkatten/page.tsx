import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getCampaignReport, getDistinctMunicipalities } from "@/lib/queries/stray-cat-campaigns";
import ReportExportBar from "@/components/beheerder/rapporten/ReportExportBar";
import CampaignFilters from "@/components/beheerder/zwerfkatten/CampaignFilters";
import {
  STRAY_CAT_REPORT_COLUMNS,
  strayCatReportRow,
  strayCatSummaryTiles,
} from "@/lib/reports/stray-cat-report";
import { exportStrayCatCsvWrapper } from "./actions";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ZwerfkattenRapportPage({ searchParams }: Props) {
  const permCheck = await requirePermission("report:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const params = await searchParams;

  const municipality = typeof params.gemeente === "string" ? params.gemeente : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const dateFrom = typeof params.van === "string" ? params.van : undefined;
  const dateTo = typeof params.tot === "string" ? params.tot : undefined;

  const [{ campaigns, stats }, municipalities] = await Promise.all([
    getCampaignReport({ municipality, status, dateFrom, dateTo }),
    getDistinctMunicipalities(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/beheerder/rapporten"
            className="text-sm text-emerald-700 hover:text-emerald-800"
          >
            &larr; Terug naar rapporten
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Zwerfkattenbeleid
          </h1>
          <p className="text-sm text-gray-500">{stats.total} campagnes</p>
        </div>
        <Suspense>
          <ReportExportBar
            csvAction={exportStrayCatCsvWrapper}
            pdfUrl="/api/rapporten/zwerfkatten/pdf"
            filenamePrefix="zwerfkatten"
          />
        </Suspense>
      </div>

      {/* Filters — identiek aan campagnes-overzicht (gemeente, status, van, tot) */}
      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-gray-100" />}>
        <CampaignFilters municipalities={municipalities} />
      </Suspense>

      {/* Samenvatting — zelfde tegels als op de PDF */}
      {stats.total > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Samenvatting</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {strayCatSummaryTiles(stats).map((tile) => (
              <StatCard key={tile.key} label={tile.label} value={tile.value} />
            ))}
          </div>
        </div>
      )}

      {/* Detail tabel — zelfde tien kolommen als op de PDF */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {STRAY_CAT_REPORT_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {campaigns.length === 0 ? (
              <tr>
                <td
                  colSpan={STRAY_CAT_REPORT_COLUMNS.length}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Geen campagnes gevonden voor deze filters.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const row = strayCatReportRow(campaign);
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    {STRAY_CAT_REPORT_COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className="whitespace-pre-line px-4 py-2 align-top text-sm text-gray-600"
                      >
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1b4332]">{value}</p>
    </div>
  );
}
