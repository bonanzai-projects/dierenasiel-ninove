import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dewormings, vaccinations } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getAnimalById } from "@/lib/queries/animals";
import { buildKennelCard } from "@/lib/animals/kennel-card";
import KennelCardPdf from "@/components/beheerder/rapporten/KennelCardPdf";

/**
 * Story 10.43 — kaart om aan de kennel te hangen, per dier.
 *
 * Zelfde opzet als de affiche-route (Story 10.32): de kaart hangt aan het dier,
 * niet aan de rapportenmodule.
 */
export async function GET(
  _request: NextRequest,
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

  const animal = await getAnimalById(animalId);
  if (!animal) {
    return new Response("Dier niet gevonden", { status: 404 });
  }

  // Laatste vaccinatie en laatste ontworming. De vlooienbehandeling (Story 10.31)
  // deelt dezelfde tabel maar hoort niet op deze regel.
  const [laatsteVaccinatie] = await db
    .select({ date: vaccinations.date })
    .from(vaccinations)
    .where(eq(vaccinations.animalId, animalId))
    .orderBy(desc(vaccinations.date))
    .limit(1);

  const [laatsteOntworming] = await db
    .select({ date: dewormings.date })
    .from(dewormings)
    .where(and(eq(dewormings.animalId, animalId), eq(dewormings.category, "ontworming")))
    .orderBy(desc(dewormings.date))
    .limit(1);

  const kaart = buildKennelCard({
    animal: {
      name: animal.name,
      aliasName: animal.aliasName,
      species: animal.species,
      breed: animal.breed,
      gender: animal.gender,
      isNeutered: animal.isNeutered,
      dateOfBirth: animal.dateOfBirth,
      intakeDate: animal.intakeDate,
      // Er is (nog) geen algemeen gewichtsveld op een dier: `weightOnArrival`
      // hoort bij het verwaarlozingsrapport en bestaat alleen bij IBN-dossiers.
      // Het Kg-vakje blijft dus leeg om met de hand in te vullen — net als op de
      // papieren kaart. Komt er ooit een gewichtsveld, dan volstaat deze regel.
      weightOnArrival: null,
    },
    lastVaccination: laatsteVaccinatie?.date ?? null,
    lastDeworming: laatsteOntworming?.date ?? null,
  });

  const element = createElement(KennelCardPdf, { kaart });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  const bestandsnaam = `kennelkaart-${animal.slug || animalId}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bestandsnaam}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
