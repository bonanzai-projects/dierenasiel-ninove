// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AnimalEditForm from "./AnimalEditForm";
import { hasUnsavedChanges, resetUnsavedChanges } from "@/lib/forms/unsaved-changes";
import type { Animal } from "@/types";

vi.mock("@/lib/actions/animals", () => ({
  updateAnimal: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

function mockAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: 1,
    name: "Rex",
    aliasName: null,
    slug: "rex",
    species: "hond",
    breed: null,
    gender: "reu",
    dateOfBirth: null,
    isNeutered: false,
    neuteredDate: null,
    neuteredByShelter: null,
    description: null,
    shortDescription: null,
    imageUrl: null,
    images: null,
    status: "beschikbaar",
    badge: null,
    isFeatured: false,
    color: null,
    identificationNr: null,
    isNewChip: false,
    passportNr: null,
    isNewPassport: false,
    barcode: null,
    isAvailableForAdoption: true,
    isOnWebsite: false,
    isInShelter: true,
    kennelId: null,
    intakeDate: "2026-05-01",
    intakeReason: null,
    isPickedUpByShelter: false,
    intakeMetadata: null,
    adoptedDate: null,
    dossierNr: null,
    pvNr: null,
    ibnDecisionDeadline: null,
    workflowPhase: "intake",
    outtakeDate: null,
    outtakeReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Animal;
}

function getReasonSelect(): HTMLSelectElement {
  return screen.getByLabelText("Reden intake") as HTMLSelectElement;
}

describe("AnimalEditForm — intake reason dropdown (Story 10.21)", () => {
  // Story 10.30: "Tijdelijke opvang" toegevoegd als vierde reden.
  it("toont exact 4 opties (+ placeholder) met de juiste labels", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);
    const select = getReasonSelect();
    const values = Array.from(select.options).map((o) => o.value);
    const labels = Array.from(select.options).map((o) => o.text);

    expect(values).toEqual(["", "afstand", "ibn", "zwerfhond", "tijdelijke_opvang"]);
    expect(labels).toEqual([
      "Niet opgegeven",
      "Afstand door eigenaar",
      "Inbeslagname (IBN)",
      "Vondeling",
      "Tijdelijke opvang",
    ]);
  });

  it("bevat geen legacy waarden 'vondeling' of 'overig' meer", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);
    const select = getReasonSelect();
    const values = Array.from(select.options).map((o) => o.value);

    expect(values).not.toContain("vondeling");
    expect(values).not.toContain("overig");
  });

  it("preselecteert de bestaande intakeReason uit het dier", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: "afstand" })} />);
    expect(getReasonSelect().value).toBe("afstand");
  });

  it("preselecteert de lege placeholder wanneer intakeReason null is", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: null })} />);
    expect(getReasonSelect().value).toBe("");
  });
});

// Story 10.37: geslacht op de fiche moet overeenkomen met wat bij intake ingegeven
// werd (reu/teef voor honden, kater/poes voor katten), niet mannelijk/vrouwelijk.
describe("AnimalEditForm — geslachtsopties per soort (Story 10.37)", () => {
  function genderOptionValues(): string[] {
    return Array.from(getGenderSelect().options).map((o) => o.value);
  }
  function getGenderSelect(): HTMLSelectElement {
    return screen.getByLabelText(/Geslacht/i) as HTMLSelectElement;
  }

  it("toont reu/teef bij een hond en preselecteert de opgeslagen waarde", () => {
    render(<AnimalEditForm animal={mockAnimal({ species: "hond", gender: "teef" })} />);
    expect(genderOptionValues()).toEqual(["", "reu", "teef"]);
    expect(getGenderSelect().value).toBe("teef");
  });

  it("toont kater/poes bij een kat", () => {
    render(<AnimalEditForm animal={mockAnimal({ species: "kat", gender: "poes" })} />);
    expect(genderOptionValues()).toEqual(["", "kater", "poes"]);
    expect(getGenderSelect().value).toBe("poes");
  });

  it("biedt geen mannelijk/vrouwelijk meer aan (was de mismatch met intake)", () => {
    render(<AnimalEditForm animal={mockAnimal({ species: "hond", gender: "reu" })} />);
    expect(genderOptionValues()).not.toContain("mannelijk");
    expect(genderOptionValues()).not.toContain("vrouwelijk");
  });

  it("toont een legacy-waarde die niet in de lijst zit als extra optie (geen stille leegte)", () => {
    render(<AnimalEditForm animal={mockAnimal({ species: "hond", gender: "mannelijk" })} />);
    expect(genderOptionValues()).toContain("mannelijk");
    expect(getGenderSelect().value).toBe("mannelijk");
  });
});

describe("AnimalEditForm — sterilisatie detail (Story 10.23)", () => {
  // Story 10.29: checkbox vervangen door radiogroep Ja / Nee / Onbekend.
  function getNeuteredRadio(label: "Ja" | "Nee" | "Onbekend"): HTMLInputElement {
    return screen.getByRole("radio", { name: label }) as HTMLInputElement;
  }

  it("toont GEEN datum/bron-velden wanneer isNeutered=false", () => {
    render(<AnimalEditForm animal={mockAnimal({ isNeutered: false })} />);
    expect(screen.queryByLabelText(/Datum sterilisatie/i)).toBeNull();
    expect(screen.queryByLabelText(/Door het asiel/i)).toBeNull();
  });

  it("toont datum + bron-velden wanneer isNeutered=true", () => {
    render(<AnimalEditForm animal={mockAnimal({ isNeutered: true })} />);
    expect(screen.getByLabelText(/Datum sterilisatie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Door het asiel/i)).toBeInTheDocument();
  });

  it("toont velden zodra de gebruiker 'Ja' selecteert", () => {
    render(<AnimalEditForm animal={mockAnimal({ isNeutered: false })} />);
    expect(screen.queryByLabelText(/Datum sterilisatie/i)).toBeNull();
    fireEvent.click(getNeuteredRadio("Ja"));
    expect(screen.getByLabelText(/Datum sterilisatie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Door het asiel/i)).toBeInTheDocument();
  });

  it("selecteert 'Onbekend' wanneer isNeutered null is, zonder detailvelden", () => {
    render(<AnimalEditForm animal={mockAnimal({ isNeutered: null })} />);
    expect(getNeuteredRadio("Onbekend").checked).toBe(true);
    expect(getNeuteredRadio("Ja").checked).toBe(false);
    expect(getNeuteredRadio("Nee").checked).toBe(false);
    expect(screen.queryByLabelText(/Datum sterilisatie/i)).toBeNull();
  });

  it("selecteert 'Nee' wanneer isNeutered expliciet false is", () => {
    render(<AnimalEditForm animal={mockAnimal({ isNeutered: false })} />);
    expect(getNeuteredRadio("Nee").checked).toBe(true);
  });

  it("pre-fillt datum en door-asiel uit het dier", () => {
    render(
      <AnimalEditForm
        animal={mockAnimal({
          isNeutered: true,
          neuteredDate: "2024-03-15",
          neuteredByShelter: true,
        })}
      />,
    );
    const dateInput = screen.getByLabelText(/Datum sterilisatie/i) as HTMLInputElement;
    const byShelterCheckbox = screen.getByLabelText(/Door het asiel/i) as HTMLInputElement;
    expect(dateInput.value).toBe("2024-03-15");
    expect(byShelterCheckbox.checked).toBe(true);
  });

  it("door-asiel checkbox is unchecked wanneer neuteredByShelter=false", () => {
    render(
      <AnimalEditForm
        animal={mockAnimal({
          isNeutered: true,
          neuteredDate: "2024-03-15",
          neuteredByShelter: false,
        })}
      />,
    );
    const byShelterCheckbox = screen.getByLabelText(/Door het asiel/i) as HTMLInputElement;
    expect(byShelterCheckbox.checked).toBe(false);
  });
});

// Story 10.36: IBN-velden bewerkbaar op de fiche + herkomst/melder gelijkgetrokken.
describe("AnimalEditForm — IBN-velden op de fiche (Story 10.36)", () => {
  it("toont GEEN IBN-sectie bij een niet-IBN dier", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: "afstand" })} />);
    expect(screen.queryByLabelText(/Reden van inbeslagname/i)).toBeNull();
    expect(screen.queryByLabelText(/Dossiernummer DWV/i)).toBeNull();
    expect(screen.queryByLabelText(/PV-nummer/i)).toBeNull();
  });

  it("toont de bewerkbare IBN-velden bij een IBN-dier", () => {
    render(
      <AnimalEditForm
        animal={mockAnimal({
          intakeReason: "ibn",
          dossierNr: "DWV-2026-1",
          pvNr: "PV-2026-9",
          ibnReason: "Verwaarlozing",
        })}
      />,
    );
    expect((screen.getByLabelText(/Reden van inbeslagname/i) as HTMLTextAreaElement).value).toBe("Verwaarlozing");
    expect((screen.getByLabelText(/Dossiernummer DWV/i) as HTMLInputElement).value).toBe("DWV-2026-1");
    expect((screen.getByLabelText(/PV-nummer/i) as HTMLInputElement).value).toBe("PV-2026-9");
  });

  it("verschijnt zodra de gebruiker 'Inbeslagname' kiest in de dropdown", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: "afstand" })} />);
    expect(screen.queryByLabelText(/Reden van inbeslagname/i)).toBeNull();

    fireEvent.change(getReasonSelect(), { target: { value: "ibn" } });

    expect(screen.getByLabelText(/Reden van inbeslagname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dossiernummer DWV/i)).toBeInTheDocument();
  });

  it("verbergt de 'Dossiernummer Shelter'-benaming volledig (was tegenstrijdig)", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: "ibn" })} />);
    expect(screen.queryByLabelText(/Dossiernummer Shelter/i)).toBeNull();
  });
});

describe("AnimalEditForm — herkomst/melder (Story 10.35/10.36)", () => {
  it("toont de melder-velden bij een vondeling", () => {
    render(
      <AnimalEditForm
        animal={mockAnimal({
          intakeReason: "zwerfhond",
          intakeMetadata: { melderNaam: "Marie", melderLocatie: "Dorpstraat 1" },
        })}
      />,
    );
    expect((screen.getByLabelText(/Naam melder/i) as HTMLInputElement).value).toBe("Marie");
    expect((screen.getByLabelText(/Adres \/ vindplaats/i) as HTMLInputElement).value).toBe("Dorpstraat 1");
  });

  it("toont GEEN melder-velden bij een afstand zonder ophaling", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: "afstand", isPickedUpByShelter: false })} />);
    expect(screen.queryByLabelText(/Naam melder/i)).toBeNull();
  });

  it("toont de melder-velden wanneer het dier door het asiel is opgehaald", () => {
    render(<AnimalEditForm animal={mockAnimal({ intakeReason: "afstand", isPickedUpByShelter: true })} />);
    expect(screen.getByLabelText(/Naam melder/i)).toBeInTheDocument();
  });
});

// Story 10.33: de balk met niet-opgeslagen wijzigingen.
describe("AnimalEditForm — niet-opgeslagen wijzigingen (Story 10.33)", () => {
  beforeEach(() => {
    resetUnsavedChanges();
  });

  afterEach(() => {
    resetUnsavedChanges();
  });

  // Story 10.42 — Sven, 2026-07-26: bij AnimalShelter is de naam altijd de
  // schuilnaam, want die staat op de publieke adoptiewebsite. Onze twee
  // naamvelden heten daarom naar wat er effectief in hoort.
  it("noemt het hoofdveld 'Naam / Schuilnaam' en het tweede veld 'Echte naam'", () => {
    render(<AnimalEditForm animal={mockAnimal({ name: "Bo", aliasName: "Shana" })} />);

    const publiek = screen.getByLabelText(/Naam \/ Schuilnaam/i) as HTMLInputElement;
    const echt = screen.getByLabelText(/Echte naam/i) as HTMLInputElement;

    expect(publiek.name).toBe("name");
    expect(publiek.value).toBe("Bo");
    expect(echt.name).toBe("aliasName");
    expect(echt.value).toBe("Shana");
    expect(screen.queryByLabelText(/^Schuilnaam$/i)).toBeNull();
  });

  const BAR = /Niet-opgeslagen wijzigingen/i;

  it("toont geen balk zolang er niets gewijzigd is", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);
    expect(screen.queryByText(BAR)).toBeNull();
  });

  it("toont de balk zodra een veld wijzigt", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);

    fireEvent.input(screen.getByLabelText(/^Naam/), { target: { value: "Rexje" } });

    expect(screen.getByText(BAR)).toBeInTheDocument();
  });

  it("verbergt de balk weer wanneer de wijziging ongedaan gemaakt wordt", () => {
    render(<AnimalEditForm animal={mockAnimal({ name: "Rex" })} />);
    const naam = screen.getByLabelText(/^Naam/);

    fireEvent.input(naam, { target: { value: "Rexje" } });
    expect(screen.getByText(BAR)).toBeInTheDocument();

    fireEvent.input(naam, { target: { value: "Rex" } });
    expect(screen.queryByText(BAR)).toBeNull();
  });

  it("meldt de openstaande wijziging aan de gedeelde store (voor de tabwissel)", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);
    expect(hasUnsavedChanges()).toBe(false);

    fireEvent.input(screen.getByLabelText(/^Naam/), { target: { value: "Rexje" } });

    expect(hasUnsavedChanges()).toBe(true);
  });

  // De knoppenbalk bovenaan is verdwenen: opslaan/annuleren staan enkel nog in
  // de meescrollende balk, die pas verschijnt wanneer er iets te bewaren valt.
  it("toont geen opslagknop zolang er niets gewijzigd is", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);
    expect(screen.queryByRole("button", { name: "Opslaan" })).toBeNull();
  });

  it("toont precies één opslagknop, in de balk", () => {
    render(<AnimalEditForm animal={mockAnimal()} />);
    fireEvent.input(screen.getByLabelText(/^Naam/), { target: { value: "Rexje" } });

    expect(screen.getAllByRole("button", { name: "Opslaan" })).toHaveLength(1);
  });

  it("toont geen eigen titel — de paginatitel volstaat", () => {
    render(<AnimalEditForm animal={mockAnimal({ name: "Thor" })} />);
    expect(screen.queryByText(/Thor bewerken/)).toBeNull();
  });

  it("merkt ook een aangevinkte checkbox op", () => {
    render(<AnimalEditForm animal={mockAnimal({ isOnWebsite: false })} />);

    // getByRole i.p.v. getByLabelText: het label omvat zowel het hidden-veld
    // als de checkbox, dus getByLabelText vindt er twee.
    fireEvent.click(screen.getByRole("checkbox", { name: /Zichtbaar op website/i }));

    expect(screen.getByText(BAR)).toBeInTheDocument();
  });
});
