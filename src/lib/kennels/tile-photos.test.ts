import { describe, it, expect } from "vitest";
import { resolveKennelTilePhotos } from "./tile-photos";

describe("resolveKennelTilePhotos", () => {
  it("gebruikt de hoofdfoto (imageUrl) wanneer die er is", () => {
    const photos = resolveKennelTilePhotos([
      { id: 1, name: "Rex", imageUrl: "/rex.jpg", images: null },
    ]);
    expect(photos).toEqual([{ id: 1, name: "Rex", url: "/rex.jpg" }]);
  });

  it("valt terug op de eerste geüploade foto wanneer er geen hoofdfoto is", () => {
    // Sven-feedback 2026-07-25: honden mét foto's maar zonder hoofdfoto toonden niets.
    const photos = resolveKennelTilePhotos([
      { id: 2, name: "Bella", imageUrl: null, images: ["/bella-1.jpg", "/bella-2.jpg"] },
    ]);
    expect(photos).toEqual([{ id: 2, name: "Bella", url: "/bella-1.jpg" }]);
  });

  it("slaat lege strings in images over en pakt de eerste echte foto", () => {
    const photos = resolveKennelTilePhotos([
      { id: 3, name: "Max", imageUrl: null, images: ["", "/max.jpg"] },
    ]);
    expect(photos[0].url).toBe("/max.jpg");
  });

  it("laat dieren zonder enige foto weg", () => {
    const photos = resolveKennelTilePhotos([
      { id: 4, name: "Fikkie", imageUrl: null, images: null },
      { id: 5, name: "Loeka", imageUrl: null, images: [] },
    ]);
    expect(photos).toEqual([]);
  });

  it("behoudt de volgorde en geeft één entry per dier met een foto", () => {
    const photos = resolveKennelTilePhotos([
      { id: 1, name: "Rex", imageUrl: "/rex.jpg", images: null },
      { id: 2, name: "Bella", imageUrl: null, images: ["/bella.jpg"] },
      { id: 3, name: "Max", imageUrl: null, images: null },
    ]);
    expect(photos.map((p) => p.id)).toEqual([1, 2]);
  });
});
