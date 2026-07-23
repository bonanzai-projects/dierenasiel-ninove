import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { requirePermission } from "@/lib/permissions";
import { getAnimalById } from "@/lib/queries/animals";
import { getAnimalTraits } from "@/lib/queries/animal-traits";
import { posterPhotoUrls } from "@/lib/posters/poster-format";
import { resolvePosterDescription } from "@/lib/animals/animal-descriptions";
import { fetchImageAsDataUrl } from "@/lib/reports/pdf-image";
import AnimalPosterPdf from "@/components/beheerder/rapporten/AnimalPosterPdf";

/**
 * Story 10.32 — affiche voor het bord buiten, per dier.
 * Bewust géén rapport-route: de affiche hangt aan het dier, niet aan de
 * rapportenmodule (R1–R14 blijven ongewijzigd).
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

  const traits = await getAnimalTraits(animalId);

  // Foto's vooraf ophalen als data-URL; een onbereikbare foto valt gewoon weg.
  const urls = posterPhotoUrls(animal.imageUrl, animal.images);
  const photos = (
    await Promise.all(urls.map((url) => fetchImageAsDataUrl(url, `affiche-foto ${animal.name}`)))
  ).filter((src): src is string => !!src);

  const element = createElement(AnimalPosterPdf, {
    animal: {
      id: animal.id,
      name: animal.name,
      breed: animal.breed,
      gender: animal.gender,
      isNeutered: animal.isNeutered,
      dateOfBirth: animal.dateOfBirth,
      // Story 10.32: eigen affichetekst, met terugval op de uitgebreide beschrijving.
      description: resolvePosterDescription(animal.posterDescription, animal.description),
    },
    traits,
    photos,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  const safeName = animal.name.replace(/[^a-zA-Z0-9\-_\s]/g, "").replace(/\s+/g, "_");
  const filename = `affiche-${safeName}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
