// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/beheerder/dieren/310",
  useSearchParams: () => new URLSearchParams(),
}));

import AnimalDetailTabs from "./AnimalDetailTabs";
import { setUnsavedChanges, resetUnsavedChanges } from "@/lib/forms/unsaved-changes";

const panels = {
  overzicht: <p>Overzicht-inhoud</p>,
  medisch: <p>Medisch-inhoud</p>,
  zorg: <p>Zorg-inhoud</p>,
  bestanden: <p>Bestanden-inhoud</p>,
};

describe("AnimalDetailTabs — waarschuwing bij openstaande wijzigingen (Story 10.33)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUnsavedChanges();
  });

  afterEach(() => {
    resetUnsavedChanges();
    vi.restoreAllMocks();
  });

  it("wisselt zonder vraag wanneer er niets openstaat", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AnimalDetailTabs>{panels}</AnimalDetailTabs>);

    fireEvent.click(screen.getByRole("button", { name: /Medisch/ }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      "/beheerder/dieren/310?tab=medisch",
      { scroll: false },
    );
  });

  it("vraagt bevestiging wanneer er wijzigingen openstaan", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    setUnsavedChanges("animal-edit-form", true);

    render(<AnimalDetailTabs>{panels}</AnimalDetailTabs>);
    fireEvent.click(screen.getByRole("button", { name: /Medisch/ }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalled();
  });

  it("blijft op het tabblad wanneer de gebruiker annuleert", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    setUnsavedChanges("animal-edit-form", true);

    render(<AnimalDetailTabs>{panels}</AnimalDetailTabs>);
    fireEvent.click(screen.getByRole("button", { name: /Medisch/ }));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText("Overzicht-inhoud")).toBeInTheDocument();
  });

  it("vraagt niets meer nadat het formulier is opgeslagen", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    setUnsavedChanges("animal-edit-form", true);
    setUnsavedChanges("animal-edit-form", false);

    render(<AnimalDetailTabs>{panels}</AnimalDetailTabs>);
    fireEvent.click(screen.getByRole("button", { name: /Medisch/ }));

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
