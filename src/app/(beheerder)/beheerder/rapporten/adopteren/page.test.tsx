// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { mockRequirePermission, mockGetReport } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockGetReport: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/queries/reports", () => ({ getAdoptableAnimalsReport: mockGetReport }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/components/beheerder/rapporten/ReportExportBar", () => ({ default: () => null }));
vi.mock("@/components/beheerder/dieren/Pagination", () => ({ default: () => null }));
vi.mock("./SpeciesFilter", () => ({ default: () => null }));

import AdopterenRapportPage from "./page";

// Story 10.73 — R6 op het scherm: reden van intake na de intakedatum, geen beschrijving meer.

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetReport.mockResolvedValue({
    total: 2,
    animals: [
      {
        id: 315, name: "Bo", species: "hond", breed: "Chow Chow", gender: "teef", status: "beschikbaar",
        identificationNr: "981000012345678", intakeDate: "2026-05-26", intakeReason: "ibn",
        shortDescription: "Lieve hond die graag knuffelt",
      },
      {
        id: 316, name: "Mimi", species: "kat", breed: null, gender: "poes", status: "beschikbaar",
        identificationNr: null, intakeDate: "2026-06-01", intakeReason: null, shortDescription: null,
      },
    ],
  });
});

async function toon() {
  render(await AdopterenRapportPage({ searchParams: Promise.resolve({}) }));
}

describe("R6 — Te adopteren dieren (scherm)", () => {
  it("heeft de kolom 'Reden intake' meteen na 'Intake datum', en geen 'Beschrijving'", async () => {
    await toon();
    const koppen = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(koppen).toEqual(["Naam", "Soort", "Ras", "Geslacht", "Status", "Chipnr", "Intake datum", "Reden intake"]);
  });

  it("toont de reden als label en laat de beschrijving weg", async () => {
    await toon();
    const rijBo = screen.getByRole("link", { name: "Bo" }).closest("tr")!;
    const cellen = within(rijBo).getAllByRole("cell").map((td) => td.textContent);
    expect(cellen.slice(-2)).toEqual(["2026-05-26", "Inbeslagname (IBN)"]);
    expect(screen.queryByText("Lieve hond die graag knuffelt")).toBeNull();

    const rijMimi = screen.getByRole("link", { name: "Mimi" }).closest("tr")!;
    expect(within(rijMimi).getAllByRole("cell").at(-1)).toHaveTextContent("-");
  });

  it("linkt de naam naar de fiche, om de beschrijving daar te lezen", async () => {
    await toon();
    expect(screen.getByRole("link", { name: "Bo" })).toHaveAttribute("href", "/beheerder/dieren/315");
  });

  it("toont nog steeds het aantal resultaten en de lege melding over alle kolommen", async () => {
    await toon();
    expect(screen.getByText("2 resultaten")).toBeInTheDocument();

    mockGetReport.mockResolvedValue({ total: 0, animals: [] });
    document.body.innerHTML = "";
    await toon();
    const leeg = screen.getByText("Geen te adopteren dieren gevonden met de opgegeven filters.");
    expect(leeg).toHaveAttribute("colspan", "8");
  });
});
