// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/lib/actions/public-adoption", () => ({ submitPublicAdoptionRequest: vi.fn() }));
vi.mock("./AdoptionPhotoUpload", () => ({ default: () => null }));

import PublicAdoptionForm from "./PublicAdoptionForm";
import { submitPublicAdoptionRequest } from "@/lib/actions/public-adoption";

beforeEach(() => {
  vi.clearAllMocks();
  // Bij een fout scrolt het formulier naar het eerste foute veld; jsdom kent dat niet.
  HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
});

// Story 10.68 — Sven: "bij keuze hond misschien ook een foto bij plaatsen dat ze goed
// zien voor welk dier ze invullen".

const honden = [
  { name: "Marie", photoUrl: "https://media.example/marie.jpg" },
  { name: "Fons", photoUrl: "https://media.example/fons.jpg" },
  { name: "Zonder foto", photoUrl: null },
];

function toonFormulier() {
  render(<PublicAdoptionForm species="hond" adoptableAnimals={honden} />);
}

function kies(naam: string) {
  fireEvent.change(document.getElementById("requestedAnimalSelect") as HTMLSelectElement, {
    target: { value: naam },
  });
}

describe("PublicAdoptionForm — foto van het gekozen dier (Story 10.68)", () => {
  it("toont geen foto zolang er niets gekozen is", () => {
    toonFormulier();
    expect(screen.queryByRole("img", { name: /Foto van/ })).toBeNull();
  });

  it("toont de foto van de gekozen hond, met zijn naam", () => {
    toonFormulier();
    kies("Marie");

    const foto = screen.getByRole("img", { name: "Foto van Marie" });
    expect(foto).toHaveAttribute("src", "https://media.example/marie.jpg");
    expect(screen.getByText("Marie", { selector: "figcaption" })).toBeInTheDocument();
  });

  it("toont de hele foto, geen uitsnede", () => {
    toonFormulier();
    kies("Marie");

    const foto = screen.getByRole("img", { name: "Foto van Marie" });
    expect(foto.className).toContain("object-contain");
    expect(foto.className).not.toContain("object-cover");
  });

  it("wisselt mee met een andere keuze", () => {
    toonFormulier();
    kies("Marie");
    kies("Fons");

    expect(screen.getByRole("img", { name: "Foto van Fons" })).toHaveAttribute(
      "src",
      "https://media.example/fons.jpg",
    );
    expect(screen.queryByRole("img", { name: "Foto van Marie" })).toBeNull();
  });

  it("toont geen (kapotte) afbeelding voor een dier zonder foto", () => {
    toonFormulier();
    kies("Zonder foto");
    expect(screen.queryByRole("img", { name: /Foto van/ })).toBeNull();
  });

  it("laat de foto weg wanneer je bij 'Andere:' een naam typt", () => {
    toonFormulier();
    kies("Marie");
    fireEvent.change(screen.getByLabelText("Andere:"), { target: { value: "Rex" } });
    expect(screen.queryByRole("img", { name: /Foto van/ })).toBeNull();
  });

  it("stuurt nog altijd de naam van het gekozen dier mee", () => {
    const { container } = render(<PublicAdoptionForm species="hond" adoptableAnimals={honden} />);
    kies("Marie");
    const verborgen = container.querySelector('input[type="hidden"][name="requestedAnimalName"]');
    expect(verborgen).toHaveValue("Marie");
  });
});

// Story 10.69 — Sven: "adoptieaanvraag emailadres verplicht maken". Was enkel verplicht bij kat.
describe("PublicAdoptionForm — e-mailadres verplicht (Story 10.69)", () => {
  for (const species of ["hond", "kat", "andere"] as const) {
    it(`markeert het e-mailadres als verplicht (${species})`, () => {
      render(<PublicAdoptionForm species={species} adoptableAnimals={honden} />);
      const label = screen.getByText(/^E-mailadres/, { selector: "label" });
      expect(label.textContent).toContain("*");
    });

    it(`meldt een leeg e-mailadres en verstuurt niets (${species})`, async () => {
      render(<PublicAdoptionForm species={species} adoptableAnimals={honden} />);
      fireEvent.click(screen.getByRole("button", { name: "Aanvraag indienen" }));

      expect(await screen.findByText("E-mailadres is verplicht")).toBeInTheDocument();
      expect(submitPublicAdoptionRequest).not.toHaveBeenCalled();
    });
  }
});
