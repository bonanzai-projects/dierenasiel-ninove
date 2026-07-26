// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ComparisonTable from "./ComparisonTable";
import {
  applyAnimalShelterFields,
  ignoreAnimalShelterFields,
  clearAnimalShelterDecisions,
} from "@/lib/actions/animalshelter";
import type { DiffRow } from "@/lib/animalshelter/diff";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/animalshelter", () => ({
  applyAnimalShelterFields: vi.fn().mockResolvedValue({ success: true, data: {} }),
  ignoreAnimalShelterFields: vi.fn().mockResolvedValue({ success: true, data: {} }),
  clearAnimalShelterDecisions: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

function rij(over: Partial<DiffRow> & { key: string }): DiffRow {
  return {
    label: over.key,
    state: "verschil",
    localValue: "onze waarde",
    remoteValue: "hun waarde",
    localText: "onze waarde",
    remoteText: "hun waarde",
    takeable: true,
    reason: null,
    remoteValueHash: "hash",
    decision: null,
    multiline: false,
    ...over,
  } as DiffRow;
}

const rows: DiffRow[] = [
  rij({ key: "breed", label: "Ras", localText: "Husky", remoteText: "Canis Vulgaris" }),
  rij({ key: "name", label: "Naam", state: "gelijk", localText: "Rocky", remoteText: "Rocky", takeable: false }),
  rij({
    key: "isNeutered", label: "Gesteriliseerd/gecastreerd", state: "niet_overneembaar",
    takeable: false, reason: "De codes 0/1/2 zijn nog niet bevestigd.",
    localText: "Nee", remoteText: "code 2",
  }),
  rij({
    key: "imageUrl", label: "Hoofdfoto", state: "extern_leeg", takeable: false,
    localText: "onze-foto.jpg", remoteText: "—",
  }),
];

function toon(extra: DiffRow[] = []) {
  return render(<ComparisonTable externalId={1880761} animalId={1} rows={[...rows, ...extra]} />);
}

beforeEach(() => vi.clearAllMocks());

describe("ComparisonTable — het vergelijkingsscherm (Story 11.5)", () => {
  it("zet onze waarde naast die van AnimalShelter", () => {
    toon();
    const ras = screen.getByRole("row", { name: /Ras/ });
    expect(within(ras).getByText("Husky")).toBeInTheDocument();
    expect(within(ras).getByText("Canis Vulgaris")).toBeInTheDocument();
  });

  it("neemt een verschil over via de knop", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /overnemen van animalshelter: ras/i }));

    await waitFor(() =>
      expect(applyAnimalShelterFields).toHaveBeenCalledWith(1880761, 1, ["breed"]),
    );
  });

  it("negeert een verschil via de knop", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /verschil negeren: ras/i }));

    await waitFor(() =>
      expect(ignoreAnimalShelterFields).toHaveBeenCalledWith(1880761, 1, ["breed"], false),
    );
  });

  it("biedt 'altijd negeren' apart aan — de veilige keuze is de standaard", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /ras.*altijd negeren|altijd negeren: ras/i }));

    await waitFor(() =>
      expect(ignoreAnimalShelterFields).toHaveBeenCalledWith(1880761, 1, ["breed"], true),
    );
  });

  it("verbergt velden die gelijk zijn tot je erom vraagt", async () => {
    toon();
    expect(screen.queryByRole("row", { name: /Naam/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /gelijk/i }));

    expect(await screen.findByRole("row", { name: /Naam/ })).toBeInTheDocument();
  });

  it("toont een onbesliste mapping met uitleg en zonder overname-knop", () => {
    toon();
    const rij = screen.getByRole("row", { name: /Gesteriliseerd/ });

    expect(within(rij).getByText(/codes 0\/1\/2/i)).toBeInTheDocument();
    expect(within(rij).queryByRole("button", { name: /overnemen/i })).toBeNull();
  });

  it("biedt nooit aan om onze data te wissen met een leeg extern veld", () => {
    toon();
    const rij = screen.getByRole("row", { name: /Hoofdfoto/ });

    expect(within(rij).queryByRole("button", { name: /overnemen/i })).toBeNull();
    expect(within(rij).getByText(/niets ingevuld|geen waarde/i)).toBeInTheDocument();
  });

  describe("genegeerde regels", () => {
    const genegeerd = rij({
      key: "websiteDescription", label: "Website-tekst", state: "genegeerd", takeable: true,
      localText: "onze tekst", remoteText: "hun tekst",
      decision: {
        fieldKey: "websiteDescription", decision: "negeer_waarde", remoteValueHash: "hash",
        decidedAt: "2026-07-26T10:00:00.000Z",
      },
    });

    it("blijft zichtbaar met een markering en de datum van de beslissing", () => {
      toon([genegeerd]);
      const rij = screen.getByRole("row", { name: /Website-tekst/ });

      expect(within(rij).getByText(/genegeerd/i)).toBeInTheDocument();
      expect(within(rij).getByText(/26\/07\/2026/)).toBeInTheDocument();
    });

    it("laat zich alsnog overnemen — nooit een doodlopende straat", async () => {
      toon([genegeerd]);
      fireEvent.click(screen.getByRole("button", { name: /toch overnemen: website-tekst/i }));

      await waitFor(() =>
        expect(applyAnimalShelterFields).toHaveBeenCalledWith(1880761, 1, ["websiteDescription"]),
      );
    });

    it("laat de beslissing terugdraaien", async () => {
      toon([genegeerd]);
      fireEvent.click(screen.getByRole("button", { name: /beslissing terugdraaien: website-tekst/i }));

      await waitFor(() =>
        expect(clearAnimalShelterDecisions).toHaveBeenCalledWith(1880761, 1, ["websiteDescription"]),
      );
    });
  });

  describe("alles in één keer", () => {
    it("neemt alle openstaande verschillen over", async () => {
      toon([rij({ key: "shortDescription", label: "Korte beschrijving" })]);
      fireEvent.click(screen.getByRole("button", { name: /alles overnemen/i }));

      await waitFor(() =>
        expect(applyAnimalShelterFields).toHaveBeenCalledWith(1880761, 1, [
          "breed",
          "shortDescription",
        ]),
      );
    });

    it("negeert alle openstaande verschillen", async () => {
      toon();
      fireEvent.click(screen.getByRole("button", { name: /alles negeren/i }));

      await waitFor(() =>
        expect(ignoreAnimalShelterFields).toHaveBeenCalledWith(1880761, 1, ["breed"], false),
      );
    });

    it("verbergt de knoppen wanneer er niets openstaat", () => {
      render(<ComparisonTable externalId={1} animalId={1} rows={[rows[1]]} />);
      expect(screen.queryByRole("button", { name: /alles overnemen/i })).toBeNull();
    });
  });

  it("toont de foutmelding van de server", async () => {
    vi.mocked(applyAnimalShelterFields).mockResolvedValue({
      success: false,
      error: "Er ging iets mis bij het overnemen.",
    });

    toon();
    fireEvent.click(screen.getByRole("button", { name: /overnemen van animalshelter: ras/i }));

    expect(await screen.findByText(/er ging iets mis bij het overnemen/i)).toBeInTheDocument();
  });
});
