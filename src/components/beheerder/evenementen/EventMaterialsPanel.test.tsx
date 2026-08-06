// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import EventMaterialsPanel from "./EventMaterialsPanel";
import type { EventMaterialRow } from "@/lib/actions/event-materials";

const { mockToggle } = vi.hoisted(() => ({ mockToggle: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/event-materials", () => ({
  createEventMaterial: vi.fn(),
  updateEventMaterial: vi.fn(),
  deleteEventMaterial: vi.fn(),
  toggleEventMaterial: mockToggle,
}));

const spul = (over: Partial<EventMaterialRow> & { id: number }): EventMaterialRow =>
  ({
    eventId: 7,
    name: "Tent 4x8",
    quantity: 2,
    origin: "geleend",
    supplier: "Chiro Ninove",
    arranged: false,
    returned: false,
    notes: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as EventMaterialRow;

const lijst = [
  spul({ id: 1 }),
  spul({ id: 2, name: "Frigo", quantity: null, origin: "eigen", supplier: null, arranged: true, sortOrder: 1 }),
  spul({ id: 3, name: "Statafels", quantity: 12, origin: "gehuurd", supplier: "Verhuur Van Damme", arranged: true, returned: true, sortOrder: 2 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockToggle.mockResolvedValue({ success: true, data: {} });
});

describe("EventMaterialsPanel", () => {
  it("toont wat er op de lijst staat, met aantal en herkomst", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite />);
    const rij = screen.getByRole("row", { name: /Tent 4x8/ });
    expect(within(rij).getByText("2 × Tent 4x8")).toBeInTheDocument();
    expect(within(rij).getByText("Geleend")).toBeInTheDocument();
    expect(within(rij).getByText("Chiro Ninove")).toBeInTheDocument();
  });

  it("laat het aantal weg wanneer het er niet is", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite />);
    expect(screen.getByText("Frigo")).toBeInTheDocument();
  });

  it("geeft eigen materiaal geen terug-vakje", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite />);
    expect(screen.queryByLabelText("Terugbezorgd: Frigo")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Terugbezorgd: Tent 4x8")).toBeInTheDocument();
  });

  it("telt wat er nog te regelen is en wat er terug moet", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite />);
    const stand = screen.getByLabelText("Materiaalstand");
    expect(stand).toHaveTextContent("1 nog te regelen");
    expect(stand).toHaveTextContent("1 moet nog terug");
  });

  it("zet een vinkje om via de actie", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite />);
    fireEvent.click(screen.getByLabelText("Geregeld: Tent 4x8"));
    expect(mockToggle).toHaveBeenCalledWith(1, "arranged", true);
  });

  it("zet 'terugbezorgd' weer uit wanneer het al aan stond", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite />);
    fireEvent.click(screen.getByLabelText("Terugbezorgd: Statafels"));
    expect(mockToggle).toHaveBeenCalledWith(3, "returned", false);
  });

  it("zegt het wanneer de lijst nog leeg is", () => {
    render(<EventMaterialsPanel eventId={7} materials={[]} canWrite />);
    expect(screen.getByText(/nog geen materiaal/i)).toBeInTheDocument();
  });

  it("laat wie niet mag schrijven niets aanpassen", () => {
    render(<EventMaterialsPanel eventId={7} materials={lijst} canWrite={false} />);
    expect(screen.queryByRole("button", { name: /toevoegen/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Geregeld: Tent 4x8")).toBeDisabled();
  });
});
