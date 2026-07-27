// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import KennelLayoutManager from "./KennelLayoutManager";
import type { Animal, Kennel } from "@/types";
import type { KennelWithOccupancy } from "@/lib/queries/kennels";

vi.mock("@/lib/actions/kennels", () => ({
  createKennel: vi.fn(),
  deleteKennel: vi.fn(),
  updateKennelAction: vi.fn(),
  assignKennel: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  // jsdom heeft geen scrollIntoView — stub op prototype.
  HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
});

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
    intakeDate: null,
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

function mockKennel(overrides: Partial<Kennel> = {}): Kennel {
  return {
    id: 1,
    code: "H1",
    zone: "honden",
    capacity: 2,
    notes: null,
    posX: "10",
    posY: "10",
    posW: "20",
    posH: "20",
    layer: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Kennel;
}

function mockOccupancy(kennel: Kennel, count = 0): KennelWithOccupancy {
  return { kennel, count } as KennelWithOccupancy;
}

describe("KennelLayoutManager — zoekdropdown rendering (Story 10.24)", () => {
  it("toont 'Zoek:' label + dropdown met placeholder + alle dieren alfabetisch", () => {
    const animals = [
      mockAnimal({ id: 1, name: "Charlie", species: "hond" }),
      mockAnimal({ id: 2, name: "Anna", species: "kat" }),
      mockAnimal({ id: 3, name: "Rocky", species: "hond" }),
    ];

    render(
      <KennelLayoutManager
        kennels={[]}
        occupancy={[]}
        animalsByKennel={{}}
        allAnimals={animals}
      />,
    );

    expect(screen.getByText("Zoek:")).toBeInTheDocument();
    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toEqual([
      "— Kies dier —",
      "Anna (Kat)",
      "Charlie (Hond)",
      "Rocky (Hond)",
    ]);
  });

  it("dropdown is leeg behalve placeholder wanneer geen dieren in opvang zijn", () => {
    render(
      <KennelLayoutManager
        kennels={[]}
        occupancy={[]}
        animalsByKennel={{}}
        allAnimals={[]}
      />,
    );
    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    expect(select.options[0].text).toBe("— Kies dier —");
  });
});

describe("KennelLayoutManager — happy path zoeken op dier (Story 10.24)", () => {
  it("kiest dier op andere laag → switcht activeLayer + selecteert kennel + opent detail-paneel", () => {
    const kennelLayer2 = mockKennel({ id: 42, code: "K42", layer: 2 });
    const animal = mockAnimal({ id: 7, name: "Rocky", kennelId: 42 });

    render(
      <KennelLayoutManager
        kennels={[kennelLayer2]}
        occupancy={[mockOccupancy(kennelLayer2, 1)]}
        animalsByKennel={{ 42: [animal] }}
        allAnimals={[animal]}
      />,
    );

    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;

    // Vóór keuze: layer-2 knop is NIET actief.
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.change(select, { target: { value: "7" } });

    // Detail-paneel toont kennel-code als heading (komt uit KennelDetailPanel)
    expect(
      screen.getByRole("heading", { name: /Kennel K42/i }),
    ).toBeInTheDocument();
    // Na keuze: layer-2 knop is nu actief — bewijs dat setActiveLayer(2) is aangeroepen.
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-pressed", "true");
  });

  it("triggert scrollIntoView op de kennel-tile na keuze", () => {
    const kennel = mockKennel({ id: 5, code: "K5", layer: 1 });
    const animal = mockAnimal({ id: 9, name: "Bella", kennelId: 5 });

    const scrollSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

    render(
      <KennelLayoutManager
        kennels={[kennel]}
        occupancy={[mockOccupancy(kennel, 1)]}
        animalsByKennel={{ 5: [animal] }}
        allAnimals={[animal]}
      />,
    );

    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "9" } });

    expect(scrollSpy).toHaveBeenCalled();
    const call = scrollSpy.mock.calls[0]?.[0];
    expect(call).toMatchObject({ behavior: "smooth", block: "center", inline: "center" });
  });
});

describe("KennelLayoutManager — auto-clear timers (Story 10.24)", () => {
  it("verwijdert de amber highlight ring na 1500ms", () => {
    vi.useFakeTimers();
    const kennel = mockKennel({ id: 5, code: "K5", layer: 1 });
    const animal = mockAnimal({ id: 9, name: "Bella", kennelId: 5 });

    render(
      <KennelLayoutManager
        kennels={[kennel]}
        occupancy={[mockOccupancy(kennel, 1)]}
        animalsByKennel={{ 5: [animal] }}
        allAnimals={[animal]}
      />,
    );

    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "9" } });

    // Direct na keuze: tile heeft amber-pulse ring (zoek via exact aria-label
    // om te onderscheiden van andere knoppen die "K5" in hun naam bevatten).
    const tile = screen.getByRole("button", { name: "Kennel K5: 1 van 2 bezet" });
    expect(tile.className).toMatch(/ring-amber-400/);

    // Na 1500ms: ring is weg.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(tile.className).not.toMatch(/ring-amber-400/);

    vi.useRealTimers();
  });

  it("verwijdert de 'dit dier zit niet in kennel'-melding na 3000ms", () => {
    vi.useFakeTimers();
    const animal = mockAnimal({ id: 11, name: "Zwerver", kennelId: null });

    render(
      <KennelLayoutManager
        kennels={[]}
        occupancy={[]}
        animalsByKennel={{}}
        allAnimals={[animal]}
      />,
    );

    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "11" } });

    expect(screen.getByText(/Dit dier zit \(nog\) niet in een kennel/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/Dit dier zit \(nog\) niet in een kennel/i)).toBeNull();

    vi.useRealTimers();
  });
});

describe("KennelLayoutManager — edge case dier zonder kennel (Story 10.24)", () => {
  it("toont 'Dit dier zit (nog) niet in een kennel'-melding wanneer kennelId null is", () => {
    const animal = mockAnimal({ id: 11, name: "Zwerver", kennelId: null });

    render(
      <KennelLayoutManager
        kennels={[]}
        occupancy={[]}
        animalsByKennel={{}}
        allAnimals={[animal]}
      />,
    );

    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "11" } });

    expect(screen.getByText(/Dit dier zit \(nog\) niet in een kennel/i)).toBeInTheDocument();
    // Geen detail-paneel (zou een heading 'Kennel <code>' renderen)
    expect(screen.queryByRole("heading", { name: /^Kennel\s+/i })).toBeNull();
  });

  it("doet GEEN scrollIntoView call wanneer dier geen kennel heeft", () => {
    const animal = mockAnimal({ id: 12, name: "Solo", kennelId: null });
    const scrollSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

    render(
      <KennelLayoutManager
        kennels={[]}
        occupancy={[]}
        animalsByKennel={{}}
        allAnimals={[animal]}
      />,
    );

    const select = screen.getByLabelText("Zoek:") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "12" } });

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

describe("KennelLayoutManager — grondplan op volledig scherm (Story 10.45)", () => {
  function toonBeheer() {
    const kennel = mockKennel({ id: 1, code: "H01" });
    const animal = mockAnimal({ id: 1, name: "Beauty", kennelId: 1 });
    return render(
      <KennelLayoutManager
        kennels={[kennel]}
        occupancy={[mockOccupancy(kennel, 1)]}
        animalsByKennel={{ 1: [animal] }}
        allAnimals={[animal]}
      />,
    );
  }

  it("biedt een knop boven het grondplan om het op volledig scherm te tonen", () => {
    toonBeheer();
    expect(screen.getByRole("button", { name: /volledig scherm/i })).toBeInTheDocument();
    // Zolang er niet op geklikt is, staat er geen venster open.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opent het grondplan mét de vakken in een venster", () => {
    toonBeheer();
    fireEvent.click(screen.getByRole("button", { name: /volledig scherm/i }));

    const venster = screen.getByRole("dialog");
    expect(within(venster).getByAltText("Grondplan kennels")).toBeInTheDocument();
    expect(within(venster).getByRole("button", { name: /Kennel H01/ })).toBeInTheDocument();
  });

  it("sluit het venster bij een klik op een hok en toont datzelfde hok in het detailpaneel", () => {
    toonBeheer();
    fireEvent.click(screen.getByRole("button", { name: /volledig scherm/i }));

    const venster = screen.getByRole("dialog");
    fireEvent.click(within(venster).getByRole("button", { name: /Kennel H01/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: /Kennel\s+H01/ })).toBeInTheDocument();
  });

  it("sluit het venster met Escape zonder een hok te kiezen", () => {
    toonBeheer();
    fireEvent.click(screen.getByRole("button", { name: /volledig scherm/i }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Kennel\s+H01/ })).toBeNull();
  });
});

describe("KennelLayoutManager — venster vult de breedte (Story 10.46)", () => {
  it("laat het plan de volle breedte nemen en verticaal scrollen", () => {
    // Johan 2026-07-28: het plan in de hoogte persen maakte de vakjes niet
    // groter. Liever de volle breedte en scrollen.
    const kennel = mockKennel({ id: 1, code: "H01" });
    render(
      <KennelLayoutManager
        kennels={[kennel]}
        occupancy={[mockOccupancy(kennel, 0)]}
        animalsByKennel={{}}
        allAnimals={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /volledig scherm/i }));

    const venster = screen.getByRole("dialog");
    expect(venster.className).toContain("overflow-y-auto");
    // Geen kader meer dat het plan op de verhouding van het beeld vastzet.
    expect(venster.querySelector('[style*="aspect-ratio"]')).toBeNull();
  });
});
