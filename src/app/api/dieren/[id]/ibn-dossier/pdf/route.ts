import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { buildIbnDossierDocument } from "@/lib/animals/ibn-dossier-document";
import { pdfContentDisposition, wantsPdfDownload } from "@/lib/pdf/disposition";

/**
 * Story 10.72 — het volledige IBN-dossier van één dier. Hangt aan het dier
 * (zoals affiche en kennelkaart), niet aan de rapportenmodule: R12 blijft de lijst.
 * Standaard bekijken in het programma (10.71); downloaden met `?download=1`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const permCheck = await requirePermission("animal:read");
  if (permCheck && !permCheck.success) {
    return new Response("Onvoldoende rechten", { status: 403 });
  }

  const { id } = await params;
  const animalId = parseInt(id, 10);
  if (isNaN(animalId)) {
    return new Response("Ongeldig dier-ID", { status: 400 });
  }

  try {
    const doc = await buildIbnDossierDocument(animalId);
    if (!doc) {
      return new Response("Geen IBN-dossier voor dit dier", { status: 404 });
    }

    return new Response(new Uint8Array(doc.content), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": pdfContentDisposition(doc.filename, wantsPdfDownload(request.nextUrl.searchParams)),
      },
    });
  } catch (err) {
    console.error("PDF generation failed (ibn-dossier):", err);
    return new Response("Er ging iets mis bij het maken van het IBN-dossier.", { status: 500 });
  }
}
