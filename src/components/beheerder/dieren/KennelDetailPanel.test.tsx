// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KennelDetailPanel from "./KennelDetailPanel";
import { ANIMAL_PHOTO_FOCUS } from "@/lib/kennels/photo-framing";
import type { Animal, Kennel } from "@/types";

vi.mock("@/lib/actions/kennels", () => ({
  assignKennel: vi.fn(),
}));

function mockKennel(overrides: Partial<Kennel> = {}): Kennel {
  return {
    id: 14,
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
    breed: "American Bully",
    gender: "teef",
    imageUrl: "/beauty.jpg",
    images: null,
    kennelId: 14,
    ...overrides,
  } as Animal;
}

function toonPaneel(animal: Animal = mockAnimal()) {
  return render(
    <KennelDetailPanel
      kennel={mockKennel()}
      animals={[animal]}
      allAnimals={[animal]}
      onClose={vi.fn()}
    />,
  );
}

describe("KennelDetailPanel — uitsnede van de dierfoto (Story 10.44)", () => {
  it("snijdt het ronde miniatuurtje hoger uit zodat de kop zichtbaar is", () => {
    toonPaneel();
    const miniatuur = screen.getByAltText("Beauty") as HTMLImageElement;
    expect(miniatuur.style.objectPosition).toBe(ANIMAL_PHOTO_FOCUS);
  });

  it("toont in de voorvertoning de hele foto in plaats van een uitsnede", () => {
    // Sven 2026-07-27 stuurde een voorvertoning van Beauty door waarop enkel het
    // achterwerk te zien was: staande foto in een liggend kader, gecentreerd
    // uitgesneden. In een voorvertoning hoort niets weg te vallen.
    toonPaneel();
    fireEvent.click(screen.getByText("Beauty"));

    const dialoog = screen.getByRole("dialog");
    const foto = dialoog.querySelector("img") as HTMLImageElement;
    expect(foto).not.toBeNull();
    expect(foto.className).toContain("object-contain");
    expect(foto.className).not.toContain("object-cover");
  });
});

describe("KennelDetailPanel — echte naam en schuilnaam (Story 10.67)", () => {
  const marie = mockAnimal({ id: 7, name: "Marie", aliasName: "Feliz", breed: "Mechelse herder" });

  it("toont de bewoner als 'echte naam/schuilnaam'", () => {
    toonPaneel(marie);

    expect(screen.getByText("Feliz/Marie")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Feliz/Marie verwijderen uit kennel" })).toBeInTheDocument();
  });

  it("gebruikt hetzelfde formaat in de voorvertoning", () => {
    toonPaneel(marie);
    fireEvent.click(screen.getByText("Feliz/Marie"));

    const dialoog = screen.getByRole("dialog", { name: "Feliz/Marie voorvertoning" });
    expect(dialoog.querySelector("h3")?.textContent).toBe("Feliz/Marie");
  });

  it("gebruikt hetzelfde formaat in de keuzelijst bij 'Dier toevoegen'", () => {
    toonPaneel(marie);
    fireEvent.click(screen.getByRole("button", { name: /Dier toevoegen aan kennel H14/ }));

    const keuzes = Array.from(screen.getByRole("combobox").querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(keuzes).toContain("Feliz/Marie — Mechelse herder");
  });

  it("toont enkel de schuilnaam wanneer er geen echte naam is", () => {
    toonPaneel(mockAnimal({ name: "Fons", aliasName: null }));

    expect(screen.getByText("Fons")).toBeInTheDocument();
  });
});
