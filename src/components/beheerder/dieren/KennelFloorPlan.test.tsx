// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import KennelFloorPlan from "./KennelFloorPlan";
import { ANIMAL_PHOTO_FOCUS } from "@/lib/kennels/photo-framing";
import type { Animal, Kennel } from "@/types";
import type { KennelWithOccupancy } from "@/lib/queries/kennels";

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
});

function mockKennel(overrides: Partial<Kennel> = {}): Kennel {
  return {
    id: 1,
    code: "H14",
    zone: "honden",
    capacity: 2,
    notes: null,
    posX: "10",
    posY: "10",
    posW: "15",
    posH: "5",
    layer: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Kennel;
}

function mockAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: 1,
    name: "Beauty",
    species: "hond",
    imageUrl: "/beauty.jpg",
    images: null,
    kennelId: 1,
    ...overrides,
  } as Animal;
}

function fotolagen(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('div[style*="background-image"]'));
}

describe("KennelFloorPlan — uitsnede van de dierfoto (Story 10.44)", () => {
  it("snijdt de foto hoger uit zodat de kop in beeld blijft", () => {
    // Sven 2026-07-27: op het grondplan viel de kop van het dier vaak buiten de
    // tegel. Gemeten: de meeste tegels zijn liggend (1.50) en de meeste foto's
    // staande gsm-foto's (0.58–0.90) → bij een gecentreerde uitsnede valt 40 à
    // 60% van de hoogte weg, precies de band waar de kop zit.
    const kennel = mockKennel();
    const { container } = render(
      <KennelFloorPlan
        occupancy={[{ kennel, count: 1 } as KennelWithOccupancy]}
        animalsByKennel={{ 1: [mockAnimal()] }}
      />,
    );

    const lagen = fotolagen(container);
    expect(lagen).toHaveLength(1);
    expect(lagen[0].style.backgroundPosition).toBe(ANIMAL_PHOTO_FOCUS);
    expect(lagen[0].style.backgroundSize).toBe("cover");
  });

  it("gebruikt dezelfde uitsnede voor elke foto in de carrousel", () => {
    const kennel = mockKennel({ capacity: 2 });
    const { container } = render(
      <KennelFloorPlan
        occupancy={[{ kennel, count: 2 } as KennelWithOccupancy]}
        animalsByKennel={{
          1: [
            mockAnimal({ id: 1, name: "Beauty", imageUrl: "/beauty.jpg" }),
            mockAnimal({ id: 2, name: "Puck", imageUrl: "/puck.jpg" }),
          ],
        }}
      />,
    );

    const lagen = fotolagen(container);
    expect(lagen).toHaveLength(2);
    expect(lagen.every((laag) => laag.style.backgroundPosition === ANIMAL_PHOTO_FOCUS)).toBe(true);
  });
});

describe("KennelFloorPlan — opschrift van de tegel (Story 10.44)", () => {
  function toonTegel(count = 1) {
    return render(
      <KennelFloorPlan
        occupancy={[{ kennel: mockKennel(), count } as KennelWithOccupancy]}
        animalsByKennel={{ 1: [mockAnimal()] }}
      />,
    );
  }

  it("zet hoknummer en aantal naast elkaar in één balk", () => {
    // Sven 2026-07-27: onder elkaar onderaan nam het opschrift te veel plaats in,
    // waardoor er van de foto weinig overbleef.
    toonTegel();
    const balk = screen.getByText("H14").parentElement!;

    expect(balk.textContent).toContain("1/2");
    expect(balk.className).not.toContain("flex-col");
  });

  it("plakt die balk onderaan het vak, niet bovenaan", () => {
    // Johan 2026-07-28: bovenaan dekte de balk net de kop van het dier af.
    toonTegel();
    const balk = screen.getByText("H14").parentElement!;

    expect(balk.className).toContain("bottom-0");
    expect(balk.className).not.toMatch(/\btop-/);
  });

  it("geeft de balk een donkere achtergrond zodat het opschrift leesbaar blijft", () => {
    toonTegel();
    const balk = screen.getByText("H14").parentElement!;

    expect(balk.className).toMatch(/bg-black\//);
    expect(balk.className).toContain("text-white");
  });

  it("laat de verduistering over de onderste helft van de foto vallen", () => {
    // Die diende enkel om het oude opschrift onderaan leesbaar te houden.
    const { container } = toonTegel();
    expect(container.querySelector('[class*="bg-gradient-to-t"]')).toBeNull();
  });
});

describe("ANIMAL_PHOTO_FOCUS", () => {
  it("ligt boven het midden — de kop zit in de bovenste helft van een dierfoto", () => {
    const [, verticaal] = ANIMAL_PHOTO_FOCUS.split(" ");
    expect(parseFloat(verticaal)).toBeLessThan(50);
    expect(parseFloat(verticaal)).toBeGreaterThan(0);
  });
});
