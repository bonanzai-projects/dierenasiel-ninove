import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requirePermission } from "@/lib/permissions";
import { getAnimalById } from "@/lib/queries/animals";
import { getBehaviorReportByAnimalId } from "@/lib/queries/reports";
import { getShelterCaregivers } from "@/lib/queries/shelter-settings";
import BehaviorReportPdf from "@/components/beheerder/rapporten/BehaviorReportPdf";
import { createElement } from "react";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ animalId: string }> },
) {
  const permCheck = await requirePermission("report:generate");
  if (permCheck && !permCheck.success) {
    return new Response("Onvoldoende rechten", { status: 403 });
  }

  const { animalId: animalIdStr } = await params;
  const animalId = parseInt(animalIdStr, 10);
  if (isNaN(animalId)) {
    return new Response("Ongeldig dier-ID", { status: 400 });
  }

  const animal = await getAnimalById(animalId);
  if (!animal) {
    return new Response("Dier niet gevonden", { status: 404 });
  }

  const [records, caregivers] = await Promise.all([
    getBehaviorReportByAnimalId(animalId),
    getShelterCaregivers(),
  ]);

  const generatedAt = new Date().toLocaleDateString("nl-BE", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(BehaviorReportPdf, {
    animal: {
      id: animal.id,
      name: animal.name,
      species: animal.species,
      breed: animal.breed,
      dossierNr: animal.dossierNr,
      identificationNr: animal.identificationNr,
      intakeDate: animal.intakeDate,
    },
    records,
    caregivers,
    generatedAt,
  }) as any;
  const buffer = await renderToBuffer(element);

  const safeName = animal.name.replace(/[^a-zA-Z0-9\-_\s]/g, "").replace(/\s+/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `gedragsfiches-${safeName}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
