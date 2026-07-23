// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AnimalFilters from "./AnimalFilters";

const { mockPush, mockSearchParams } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSearchParams: { value: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/beheerder/dieren",
  useSearchParams: () => mockSearchParams.value,
}));

function getIntakeReasonSelect(): HTMLSelectElement {
  // Vind de select die de optie "ibn" bevat — uniek voor intake-reason filter.
  const select = Array.from(document.querySelectorAll("select")).find((s) =>
    s.querySelector('option[value="ibn"]'),
  );
  if (!select) throw new Error("intakeReason filter select niet gevonden");
  return select as HTMLSelectElement;
}

describe("AnimalFilters — intake reason filter (Story 10.21)", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams.value = new URLSearchParams();
  });

  // Story 10.30: "Tijdelijke opvang" toegevoegd als vierde reden.
  it("rendert een filter-dropdown met 5 opties (Alle + 4 hoofdwaarden)", () => {
    render(<AnimalFilters />);
    const select = getIntakeReasonSelect();
    const values = Array.from(select.options).map((o) => o.value);
    const labels = Array.from(select.options).map((o) => o.text);

    expect(values).toEqual(["", "afstand", "ibn", "zwerfhond", "tijdelijke_opvang"]);
    expect(labels).toEqual([
      "Alle redenen",
      "Afstand door eigenaar",
      "Inbeslagname (IBN)",
      "Vondeling",
      "Tijdelijke opvang",
    ]);
  });

  it("update URL met ?intakeReason=... bij selectie", () => {
    render(<AnimalFilters />);
    fireEvent.change(getIntakeReasonSelect(), { target: { value: "ibn" } });

    expect(mockPush).toHaveBeenCalledWith("/beheerder/dieren?intakeReason=ibn");
  });

  it("verwijdert intakeReason uit de URL bij keuze 'Alle redenen'", () => {
    mockSearchParams.value = new URLSearchParams("intakeReason=afstand");
    render(<AnimalFilters />);
    fireEvent.change(getIntakeReasonSelect(), { target: { value: "" } });

    expect(mockPush).toHaveBeenCalledWith("/beheerder/dieren?");
  });

  it("preselecteert de bestaande intakeReason uit URL search params", () => {
    mockSearchParams.value = new URLSearchParams("intakeReason=zwerfhond");
    render(<AnimalFilters />);
    expect(getIntakeReasonSelect().value).toBe("zwerfhond");
  });

  it("combineert met bestaande filters (URL behoudt soort + status)", () => {
    mockSearchParams.value = new URLSearchParams("soort=hond&status=beschikbaar");
    render(<AnimalFilters />);
    fireEvent.change(getIntakeReasonSelect(), { target: { value: "afstand" } });

    expect(mockPush).toHaveBeenCalledWith(
      "/beheerder/dieren?soort=hond&status=beschikbaar&intakeReason=afstand",
    );
  });
});
