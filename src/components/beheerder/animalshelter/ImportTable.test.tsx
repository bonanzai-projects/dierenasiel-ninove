// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ImportTable from "./ImportTable";
import { importAnimalShelterAnimals } from "@/lib/actions/animalshelter";
import type { ImportCandidate } from "@/lib/animalshelter/import";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/animalshelter", () => ({
  importAnimalShelterAnimals: vi.fn().mockResolvedValue({
    success: true,
    data: { aangemaakt: [{ name: "Felix" }], overgeslagen: [] },
  }),
}));

function kandidaat(over: Partial<ImportCandidate> & { externalId: number; name: string }): ImportCandidate {
  return {
    category: "cats", species: "kat", gender: "kater", breed: "Huiskat", chip: "947000000582389",
    dateOfBirth: "2017-06-26", intakeDate: "2026-02-04", intakeReason: "afstand",
    slug: "felix", blockers: [], vragen: [],
    ...over,
  };
}

const felix = kandidaat({ externalId: 1, name: "Felix" });
const varken = kandidaat({
  externalId: 2, name: "Varken (vondeling)", category: "other",
  species: null, gender: null, breed: null, chip: null, slug: "varken",
  vragen: ["species", "gender"],
});
const geblokkeerd = kandidaat({
  externalId: 3, name: "Rocky", slug: "rocky",
  blockers: ["Er staat al een dier met dit chipnummer in onze database."],
});

const toon = (lijst: ImportCandidate[] = [felix, varken, geblokkeerd]) =>
  render(<ImportTable kandidaten={lijst} />);

beforeEach(() => vi.clearAllMocks());

describe("ImportTable — voorbeeldweergave vóór het aanmaken (Story 11.8)", () => {
  it("toont per dier wat er zou aangemaakt worden", () => {
    toon();
    const rij = screen.getByRole("row", { name: /Felix/ });

    expect(within(rij).getByText("Huiskat")).toBeInTheDocument();
    expect(within(rij).getByText("947000000582389")).toBeInTheDocument();
    expect(within(rij).getByText("04/02/2026")).toBeInTheDocument();
  });

  it("maakt niets aan tot er bevestigd wordt", () => {
    toon();
    expect(importAnimalShelterAnimals).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /maak 0 dieren aan/i })).toBeDisabled();
  });

  it("maakt de aangevinkte dieren aan", async () => {
    toon();
    fireEvent.click(screen.getByRole("checkbox", { name: /felix aanmaken/i }));
    fireEvent.click(screen.getByRole("button", { name: /maak 1 dier aan/i }));

    await waitFor(() =>
      expect(importAnimalShelterAnimals).toHaveBeenCalledWith([{ externalId: 1 }]),
    );
  });

  it("laat een geblokkeerd dier niet aanvinken en zegt waarom", () => {
    toon();
    const rij = screen.getByRole("row", { name: /Rocky/ });

    expect(within(rij).getByRole("checkbox")).toBeDisabled();
    expect(within(rij).getByText(/al een dier met dit chipnummer/i)).toBeInTheDocument();
  });

  it("vraagt de soort en het geslacht in plaats van te gokken", () => {
    toon();
    expect(screen.getByLabelText(/soort van varken/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/geslacht van varken/i)).toBeInTheDocument();
  });

  it("houdt het geslacht op slot tot de soort gekozen is", () => {
    toon();
    expect(screen.getByLabelText(/geslacht van varken/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/soort van varken/i), {
      target: { value: "hangbuikvarken" },
    });

    expect(screen.getByLabelText(/geslacht van varken/i)).toBeEnabled();
  });

  it("stuurt de antwoorden van de beheerder mee", async () => {
    toon();
    fireEvent.click(screen.getByRole("checkbox", { name: /varken.*aanmaken/i }));
    fireEvent.change(screen.getByLabelText(/soort van varken/i), {
      target: { value: "hangbuikvarken" },
    });
    fireEvent.change(screen.getByLabelText(/geslacht van varken/i), {
      target: { value: "mannetje" },
    });
    fireEvent.click(screen.getByRole("button", { name: /maak 1 dier aan/i }));

    await waitFor(() =>
      expect(importAnimalShelterAnimals).toHaveBeenCalledWith([
        { externalId: 2, species: "hangbuikvarken", gender: "mannetje" },
      ]),
    );
  });

  it("telt een aangevinkt dier met een onbeantwoorde vraag niet mee", () => {
    toon();
    fireEvent.click(screen.getByRole("checkbox", { name: /varken.*aanmaken/i }));

    expect(screen.getByRole("button", { name: /maak 0 dieren aan/i })).toBeDisabled();
    expect(screen.getByText(/wacht nog op een antwoord/i)).toBeInTheDocument();
  });

  it("selecteert in één klik alles zonder openstaande vraag", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /selecteer alles zonder vragen/i }));

    expect(screen.getByRole("checkbox", { name: /felix aanmaken/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /varken.*aanmaken/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /rocky aanmaken/i })).not.toBeChecked();
  });

  it("meldt achteraf wat er aangemaakt en wat er overgeslagen is", async () => {
    vi.mocked(importAnimalShelterAnimals).mockResolvedValue({
      success: true,
      data: {
        aangemaakt: [{ externalId: 1, animalId: 77, name: "Felix" }],
        overgeslagen: [{ externalId: 3, naam: "Rocky", reden: "Chipnummer bestaat al." }],
      },
    });

    toon();
    fireEvent.click(screen.getByRole("checkbox", { name: /felix aanmaken/i }));
    fireEvent.click(screen.getByRole("button", { name: /maak 1 dier aan/i }));

    expect(await screen.findByText(/1 dier aangemaakt: Felix/i)).toBeInTheDocument();
    expect(screen.getByText(/Rocky overgeslagen — Chipnummer bestaat al/i)).toBeInTheDocument();
  });

  it("toont de foutmelding van de server", async () => {
    vi.mocked(importAnimalShelterAnimals).mockResolvedValue({
      success: false,
      error: "Er ging iets mis bij het aanmaken.",
    });

    toon();
    fireEvent.click(screen.getByRole("checkbox", { name: /felix aanmaken/i }));
    fireEvent.click(screen.getByRole("button", { name: /maak 1 dier aan/i }));

    expect(await screen.findByText(/er ging iets mis bij het aanmaken/i)).toBeInTheDocument();
  });

  it("meldt netjes dat er niets te importeren valt", () => {
    toon([]);
    expect(screen.getByText(/geen dieren bij animalshelter die nog niet/i)).toBeInTheDocument();
  });
});
