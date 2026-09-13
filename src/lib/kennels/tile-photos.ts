import { kennelAnimalName } from "./animal-name";

export interface KennelTilePhoto {
  id: number;
  /** Zoals het vak hem toont: "echte naam/schuilnaam" (Story 10.67). */
  name: string;
  url: string;
}

interface AnimalPhotoSource {
  id: number;
  name: string;
  aliasName?: string | null;
  imageUrl?: string | null;
  images?: string[] | null;
}

/**
 * Bepaalt welke foto elk dier in een kennel-tile toont, voor de afwissel-carrousel.
 * Voorkeur voor de hoofdfoto (`imageUrl`); is die niet ingesteld, dan de eerste
 * echte geüploade foto uit `images`. Dieren zonder enige foto vallen weg.
 *
 * Reden: Sven zag bij twee honden in één hok enkel de getallen — ze hadden wel
 * foto's geüpload maar geen hoofdfoto gemarkeerd (2026-07-25).
 */
export function resolveKennelTilePhotos(animals: AnimalPhotoSource[]): KennelTilePhoto[] {
  return animals
    .map((a) => ({
      id: a.id,
      name: kennelAnimalName(a),
      url: a.imageUrl || a.images?.find((src) => !!src) || null,
    }))
    .filter((p): p is KennelTilePhoto => typeof p.url === "string" && p.url.length > 0);
}
