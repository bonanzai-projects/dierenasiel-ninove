"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PdfViewerButton from "@/components/beheerder/shared/PdfViewer";
import { signVetInspectionReport, deleteVetInspectionReport } from "@/lib/actions/vet-inspection-reports";
import type { VetInspectionReport, TreatedAnimalEntry, EuthanizedAnimalEntry, AbnormalBehaviorEntry } from "@/types";

interface Props {
  report: VetInspectionReport;
}

export default function InspectionReportView({ report }: Props) {
  const router = useRouter();
  const [signState, signAction, signPending] = useActionState(signVetInspectionReport, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteVetInspectionReport, null);

  useEffect(() => {
    if (deleteState?.success) {
      router.push("/beheerder/medisch/bezoekrapport");
    }
  }, [deleteState, router]);

  const treated = (report.animalsTreated ?? []) as TreatedAnimalEntry[];
  const euthanized = (report.animalsEuthanized ?? []) as EuthanizedAnimalEntry[];
  const abnormal = (report.abnormalBehavior ?? []) as AbnormalBehaviorEntry[];
  const isSigned = report.vetSignature;

  return (
    <div className="space-y-6">
      {/* Status & actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isSigned ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Ondertekend
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Concept
            </span>
          )}
          {isSigned && report.signedAt && (
            <span className="text-xs text-gray-500">
              Ondertekend op {new Date(report.signedAt).toLocaleDateString("nl-BE")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Story 10.71 — in het programma bekijken; downloaden kan in het venster. */}
          <PdfViewerButton
            src={`/api/rapporten/bezoekrapport/${report.id}/pdf`}
            title={`Bezoekrapport ${report.visitDate} — ${report.vetName}`}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            PDF bekijken
          </PdfViewerButton>
          {!isSigned && (
            <>
              <form action={signAction}>
                <input type="hidden" name="id" value={report.id} />
                <button
                  type="submit"
                  disabled={signPending}
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {signPending ? "Ondertekenen..." : "Ondertekenen"}
                </button>
              </form>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={report.id} />
                <button
                  type="submit"
                  disabled={deletePending}
                  onClick={(e) => {
                    if (!confirm("Weet je zeker dat je dit rapport wilt verwijderen?")) e.preventDefault();
                  }}
                  className="rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletePending ? "Verwijderen..." : "Verwijderen"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {signState && !signState.success && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{signState.error}</p>
        </div>
      )}
      {deleteState && !deleteState.success && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{deleteState.error}</p>
        </div>
      )}

      {/* Basis info */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-500">Bezoekdatum</p>
            <p className="text-sm font-semibold text-gray-800">{new Date(report.visitDate + "T00:00:00").toLocaleDateString("nl-BE")}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Dierenarts</p>
            <p className="text-sm font-semibold text-gray-800">{report.vetName}</p>
          </div>
        </div>
      </div>

      {/* Behandelde dieren */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-[#1b4332]">Behandelde dieren</h2>
        {treated.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Geen behandelde dieren geregistreerd.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-3">Naam</th>
                  <th className="pb-2 pr-3">Soort</th>
                  <th className="pb-2 pr-3">Chipnr</th>
                  <th className="pb-2 pr-3">Diagnose</th>
                  <th className="pb-2">Behandeling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {treated.map((entry, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-gray-800">{entry.animalName}</td>
                    <td className="py-2 pr-3 text-gray-600">{entry.species}</td>
                    <td className="py-2 pr-3 text-gray-500">{entry.chipNr || "-"}</td>
                    <td className="py-2 pr-3 text-gray-600">{entry.diagnosis}</td>
                    <td className="py-2 text-gray-600">{entry.treatment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geëuthanaseerde dieren */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-[#1b4332]">Geëuthanaseerde dieren</h2>
        {euthanized.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Geen euthanasie geregistreerd.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-3">Naam</th>
                  <th className="pb-2 pr-3">Soort</th>
                  <th className="pb-2 pr-3">Chipnr</th>
                  <th className="pb-2">Reden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {euthanized.map((entry, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-gray-800">{entry.animalName}</td>
                    <td className="py-2 pr-3 text-gray-600">{entry.species}</td>
                    <td className="py-2 pr-3 text-gray-500">{entry.chipNr || "-"}</td>
                    <td className="py-2 text-gray-600">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Afwijkend gedrag */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-[#1b4332]">Dieren met afwijkend gedrag</h2>
        {abnormal.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Geen afwijkend gedrag geregistreerd.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-3">Naam</th>
                  <th className="pb-2 pr-3">Soort</th>
                  <th className="pb-2 pr-3">Chipnr</th>
                  <th className="pb-2">Beschrijving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {abnormal.map((entry, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-gray-800">{entry.animalName}</td>
                    <td className="py-2 pr-3 text-gray-600">{entry.species}</td>
                    <td className="py-2 pr-3 text-gray-500">{entry.chipNr || "-"}</td>
                    <td className="py-2 text-gray-600">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aanbevelingen */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-[#1b4332]">Aanbevelingen</h2>
        {report.recommendations ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{report.recommendations}</p>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Geen aanbevelingen.</p>
        )}
      </div>
    </div>
  );
}
