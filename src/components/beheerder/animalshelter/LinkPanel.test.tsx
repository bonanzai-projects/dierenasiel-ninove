// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LinkPanel from "./LinkPanel";
import ReadOnlyBanner from "./ReadOnlyBanner";
import {
  ignoreAnimalShelterAnimal,
  linkAnimalShelterAnimal,
} from "@/lib/actions/animalshelter";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/animalshelter", () => ({
  linkAnimalShelterAnimal: vi.fn().mockResolvedValue({ success: true, data: {} }),
  ignoreAnimalShelterAnimal: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

const kandidaten = [
  { id: 30, name: "Tim", species: "hond" },
  { id: 31, name: "Molly", species: "kat" },
];

beforeEach(() => vi.clearAllMocks());

describe("ReadOnlyBanner", () => {
  it("zegt onomwonden dat er niets naar AnimalShelter gaat", () => {
    render(<ReadOnlyBanner />);
    expect(screen.getByText(/verstuurt nooit gegevens naar animalshelter/i)).toBeInTheDocument();
    expect(screen.getByText(/auditlogboek/i)).toBeInTheDocument();
  });
});

describe("LinkPanel — handmatig koppelen (Story 11.5)", () => {
  it("koppelt een ongekoppeld dier aan een fiche naar keuze", async () => {
    render(
      <LinkPanel externalId={7} animalId={null} localName={null} kandidaten={kandidaten} genegeerd={false} />,
    );

    fireEvent.change(screen.getByLabelText(/koppelen aan een dier/i), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: /^koppelen$/i }));

    await waitFor(() => expect(linkAnimalShelterAnimal).toHaveBeenCalledWith(7, 31));
  });

  it("koppelt niet zolang er geen dier gekozen is", () => {
    render(
      <LinkPanel externalId={7} animalId={null} localName={null} kandidaten={kandidaten} genegeerd={false} />,
    );
    expect(screen.getByRole("button", { name: /^koppelen$/i })).toBeDisabled();
  });

  it("maakt een bestaande koppeling los", async () => {
    render(
      <LinkPanel externalId={7} animalId={12} localName="Gaston" kandidaten={[]} genegeerd={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /koppeling losmaken/i }));

    await waitFor(() => expect(linkAnimalShelterAnimal).toHaveBeenCalledWith(7, null));
  });

  it("laat een extern dier bewust negeren", async () => {
    render(
      <LinkPanel externalId={7} animalId={null} localName={null} kandidaten={kandidaten} genegeerd={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /dit dier negeren/i }));

    await waitFor(() => expect(ignoreAnimalShelterAnimal).toHaveBeenCalledWith(7, true));
  });

  it("laat het negeren weer ongedaan maken", async () => {
    render(
      <LinkPanel externalId={7} animalId={null} localName={null} kandidaten={[]} genegeerd={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /niet meer negeren/i }));

    await waitFor(() => expect(ignoreAnimalShelterAnimal).toHaveBeenCalledWith(7, false));
  });

  it("toont de foutmelding van de server", async () => {
    vi.mocked(linkAnimalShelterAnimal).mockResolvedValue({
      success: false,
      error: "Tim is al aan een ander AnimalShelter-dier gekoppeld.",
    });

    render(
      <LinkPanel externalId={7} animalId={null} localName={null} kandidaten={kandidaten} genegeerd={false} />,
    );
    fireEvent.change(screen.getByLabelText(/koppelen aan een dier/i), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /^koppelen$/i }));

    expect(await screen.findByText(/al aan een ander animalshelter-dier gekoppeld/i)).toBeInTheDocument();
  });
});
