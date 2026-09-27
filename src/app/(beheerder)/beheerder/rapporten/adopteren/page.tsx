import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getAdoptableAnimalsReport } from "@/lib/queries/reports";
import { R6_COLUMNS, r6Row } from "@/lib/reports/adoptable-report";
import ReportExportBar from "@/components/beheerder/rapporten/ReportExportBar";
import Pagination from "@/components/beheerder/dieren/Pagination";
import SpeciesFilter from "./SpeciesFilter";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdopterenRapportPage({ searchParams }: Props) {
  const permCheck = await requirePermission("report:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const params = await searchParams;

  const species = typeof params.soort === "string" ? params.soort : undefined;
  const page = typeof params.pagina === "string" ? parseInt(params.pagina, 10) || 1 : 1;

  const { animals, total } = await getAdoptableAnimalsReport({
    species, page, pageSize: PAGE_SIZE,
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
            R6 — Te adopteren dieren
          </h1>
          <p className="text-sm text-gray-500">{total} resultaten</p>
        </div>
        <Suspense>
          <ReportExportBar
            pdfUrl="/api/rapporten/adopteren/pdf"
            filenamePrefix="te-adopteren-dieren"
          />
        </Suspense>
      </div>

      {/* Species filter */}
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <label htmlFor="soort" className="text-xs font-medium text-gray-600">
          Soort
        </label>
        <Suspense>
          <SpeciesFilter />
        </Suspense>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Story 10.73: kolommen uit `adoptable-report`, gedeeld met de PDF. */}
              {R6_COLUMNS.map((k) => (
                <th key={k.key} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {animals.length === 0 ? (
              <tr>
                <td colSpan={R6_COLUMNS.length} className="px-4 py-8 text-center text-sm text-gray-500">
                  Geen te adopteren dieren gevonden met de opgegeven filters.
                </td>
              </tr>
            ) : (
              animals.map((animal) => {
                const rij = r6Row(animal);
                return (
                  <tr key={animal.id} className="hover:bg-gray-50">
                    {R6_COLUMNS.map((k) => {
                      if (k.key === "name") {
                        return (
                          <td key={k.key} className="px-4 py-2 text-sm font-medium text-gray-900">
                            <Link href={`/beheerder/dieren/${animal.id}`} className="text-emerald-700 hover:underline">
                              {rij.name}
                            </Link>
                          </td>
                        );
                      }
                      if (k.key === "status") {
                        return (
                          <td key={k.key} className="px-4 py-2 text-sm">
                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                              {rij.status}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={k.key} className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                          {rij[k.key]}
                        </td>
                      );
                    })}
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
