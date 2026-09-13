import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requirePermission } from "@/lib/permissions";
import { getVetInspectionReportsFiltered } from "@/lib/queries/reports";
import InspectionListPdf from "@/components/beheerder/rapporten/InspectionListPdf";
import { pdfContentDisposition, wantsPdfDownload } from "@/lib/pdf/disposition";
import { createElement } from "react";

export async function GET(request: NextRequest) {
  const permCheck = await requirePermission("report:generate");
  if (permCheck && !permCheck.success) {
    return new Response("Onvoldoende rechten", { status: 403 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const dateFrom = params.get("van") || undefined;
    const dateTo = params.get("tot") || undefined;

    const { reports } = await getVetInspectionReportsFiltered({ dateFrom, dateTo });

    const filterParts: string[] = [];
    if (dateFrom) filterParts.push(`Van: ${dateFrom}`);
    if (dateTo) filterParts.push(`Tot: ${dateTo}`);
    const filtersText = filterParts.length > 0 ? filterParts.join(", ") : undefined;

    const generatedAt = new Date().toLocaleDateString("nl-BE", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(InspectionListPdf, { reports, filters: filtersText, generatedAt }) as any;
    const buffer = await renderToBuffer(element);

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `bezoekrapporten-${dateStr}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        // Story 10.71: standaard in het programma tonen; downloaden met ?download=1.
        "Content-Disposition": pdfContentDisposition(filename, wantsPdfDownload(params)),
      },
    });
  } catch (err) {
    console.error("PDF generation failed (bezoekrapporten):", err);
    return new Response("Er ging iets mis bij het genereren van de PDF.", { status: 500 });
  }
}
