// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AnimalWeightSection from "./AnimalWeightSection";
import type { WeighingWithRecorder } from "@/lib/queries/animal-weights";

vi.mock("@/lib/actions/animal-weights", () => ({
  createAnimalWeight: vi.fn(),
  deleteAnimalWeight: vi.fn(),
}));

const weging = (over: Partial<WeighingWithRecorder> & { id: number }): WeighingWithRecorder => ({
  animalId: 42,
  date: "2026-01-01",
  weightKg: "10.000",
  notes: null,
  recordedBy: 20,
  recordedByName: "Sven",
  ...over,
});

const reeks: WeighingWithRecorder[] = [
  weging({ id: 3, date: "2026-03-01", weightKg: "12.000" }),
  weging({ id: 2, date: "2026-02-01", weightKg: "11.500" }),
  weging({ id: 1, date: "2026-01-01", weightKg: "10.000" }),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AnimalWeightSection", () => {
  it("meldt het wanneer er nog niet gewogen is", () => {
    render(<AnimalWeightSection animalId={42} weighings={[]} />);
    expect(screen.getByText(/Nog geen wegingen/i)).toBeInTheDocument();
  });

  it("toont het huidige gewicht bovenaan", () => {
    render(<AnimalWeightSection animalId={42} weighings={reeks} />);
    expect(screen.getByLabelText("Huidig gewicht")).toHaveTextContent("12 kg");
  });

  it("toont het verschil sinds de eerste weging", () => {
    render(<AnimalWeightSection animalId={42} weighings={reeks} />);
    expect(screen.getByText(/\+2 kg sinds de eerste weging/)).toBeInTheDocument();
  });

  it("zet de recentste weging bovenaan met haar verschil", () => {
    render(<AnimalWeightSection animalId={42} weighings={reeks} />);
    const rijen = screen.getAllByRole("listitem");
    expect(within(rijen[0]).getByText("2026-03-01")).toBeInTheDocument();
    expect(within(rijen[0]).getByText("+0,5 kg")).toBeInTheDocument();
    expect(within(rijen[2]).getByText("2026-01-01")).toBeInTheDocument();
  });

  it("toont een daling met een minteken", () => {
    render(
      <AnimalWeightSection
        animalId={42}
        weighings={[
          weging({ id: 2, date: "2026-02-01", weightKg: "9.000" }),
          weging({ id: 1, date: "2026-01-01", weightKg: "10.000" }),
        ]}
      />,
    );
    expect(screen.getByText("-1 kg")).toBeInTheDocument();
  });

  it("tekent een grafiekje zodra er twee wegingen zijn", () => {
    const { container } = render(<AnimalWeightSection animalId={42} weighings={reeks} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("tekent geen grafiekje bij één enkele weging", () => {
    const { container } = render(
      <AnimalWeightSection animalId={42} weighings={[weging({ id: 1 })]} />,
    );
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("opent het formulier om te wegen", () => {
    render(<AnimalWeightSection animalId={42} weighings={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Weging toevoegen/ }));

    expect(screen.getByLabelText(/Gewicht in kg/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Datum/i)).toBeInTheDocument();
  });

  it("toont wie de weging deed", () => {
    render(<AnimalWeightSection animalId={42} weighings={[weging({ id: 1 })]} />);
    expect(screen.getByText(/Sven/)).toBeInTheDocument();
  });
});
