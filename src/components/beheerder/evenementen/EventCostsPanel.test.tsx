// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import EventCostsPanel from "./EventCostsPanel";
import type { EventCostRow } from "@/lib/actions/event-costs";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/event-costs", () => ({
  createEventCost: vi.fn(),
  updateEventCost: vi.fn(),
  deleteEventCost: vi.fn(),
}));

const lijn = (over: Partial<EventCostRow> & { id: number }): EventCostRow =>
  ({
    eventId: 4,
    kind: "kost",
    category: "drank",
    description: "Drank",
    budgetAmount: null,
    actualAmount: null,
    supplier: null,
    paid: false,
    notes: null,
    sortOrder: 0,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as EventCostRow;

const lijnen = [
  lijn({ id: 1, description: "Drank bij de brouwer", budgetAmount: "400", actualAmount: "560", supplier: "De Ryck" }),
  lijn({ id: 2, category: "traiteur", description: "Traiteur", budgetAmount: "1200", actualAmount: "1200", paid: true }),
  lijn({ id: 3, kind: "opbrengst", category: "eten", description: "Eten", budgetAmount: "2500", actualAmount: "2890" }),
];

beforeEach(() => vi.clearAllMocks());

// Story 13.16 — de contactgegevens komen uit de leverancierslijst, gekoppeld op naam.
describe("EventCostsPanel — leverancier (Story 13.16)", () => {
  const deRyck = { name: "de ryck", phone: "0470 12 34 56", email: "info@deryck.be", website: null };

  it("toont gsm en mail van een gekende leverancier onder de lijn", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite suppliers={[deRyck]} />);
    const rij = screen.getByRole("row", { name: /Drank bij de brouwer/ });
    expect(within(rij).getByRole("link", { name: "0470 12 34 56" })).toHaveAttribute("href", "tel:0470123456");
    expect(within(rij).getByRole("link", { name: "info@deryck.be" })).toHaveAttribute(
      "href",
      "mailto:info@deryck.be",
    );
  });

  it("toont geen links bij een leverancier die niet in de lijst staat", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite suppliers={[]} />);
    const rij = screen.getByRole("row", { name: /Drank bij de brouwer/ });
    expect(within(rij).queryByRole("link")).toBeNull();
  });
});

describe("EventCostsPanel", () => {
  it("toont de kosten en de opbrengsten apart", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    const kosten = screen.getByRole("region", { name: "Kosten" });
    const opbrengsten = screen.getByRole("region", { name: "Opbrengsten" });
    expect(within(kosten).getByText("Drank bij de brouwer")).toBeInTheDocument();
    // "Eten" staat er twee keer: als omschrijving én als categorie onder de lijn.
    expect(within(opbrengsten).getAllByText("Eten").length).toBeGreaterThan(0);
    expect(within(opbrengsten).queryByText("Drank bij de brouwer")).not.toBeInTheDocument();
  });

  it("toont per lijn het begrote naast het werkelijke bedrag", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    const rij = screen.getByRole("row", { name: /Drank bij de brouwer/ });
    expect(within(rij).getByText("€ 400,00")).toBeInTheDocument();
    expect(within(rij).getByText("€ 560,00")).toBeInTheDocument();
  });

  it("markeert een overschrijding als verschil", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    const rij = screen.getByRole("row", { name: /Drank bij de brouwer/ });
    expect(within(rij).getByText("+ € 160,00")).toBeInTheDocument();
  });

  it("toont het netto-resultaat begroot naast werkelijk", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    const netto = screen.getByRole("group", { name: /netto/i });
    expect(within(netto).getByText("€ 900,00")).toBeInTheDocument();
    expect(within(netto).getByText("€ 1.130,00")).toBeInTheDocument();
  });

  it("toont de totalen per lijstje", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    const totaal = within(screen.getByRole("region", { name: "Kosten" })).getByRole("row", {
      name: /totaal/i,
    });
    expect(within(totaal).getByText("€ 1.600,00")).toBeInTheDocument();
    expect(within(totaal).getByText("€ 1.760,00")).toBeInTheDocument();
  });

  it("laat zien welke lijn al betaald is", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    const rij = screen.getByRole("row", { name: /Traiteur/ });
    expect(within(rij).getByText(/betaald/i)).toBeInTheDocument();
  });

  it("toont de leverancier bij de omschrijving", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    expect(screen.getByText(/De Ryck/)).toBeInTheDocument();
  });

  it("zegt het wanneer er nog niets ingevuld is", () => {
    render(<EventCostsPanel eventId={4} lines={[]} canWrite />);
    expect(screen.getAllByText(/nog geen/i).length).toBeGreaterThan(0);
  });

  it("verbergt de knoppen voor wie niet mag schrijven", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite={false} />);
    expect(screen.queryByRole("button", { name: /toevoegen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bewerken/i })).not.toBeInTheDocument();
  });

  it("toont beide toevoegknoppen voor wie wel mag schrijven", () => {
    render(<EventCostsPanel eventId={4} lines={lijnen} canWrite />);
    expect(screen.getByRole("button", { name: /kostenlijn toevoegen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /opbrengst toevoegen/i })).toBeInTheDocument();
  });
});

// Story 13.15 — de opbrengst van de steunkaarten houdt de app zelf bij.
describe("EventCostsPanel — steunkaarten (Story 13.15)", () => {
  it("toont bij de automatische lijn dat het bedrag uit de steunkaarten komt", () => {
    const kaarten = lijn({ id: 9, kind: "opbrengst", category: "tombola", description: "Steunkaarten", actualAmount: "235", source: "steunkaarten" });
    render(<EventCostsPanel eventId={4} lines={[...lijnen, kaarten]} canWrite />);
    expect(screen.getByRole("row", { name: /Steunkaarten/ })).toHaveTextContent("automatisch uit de steunkaarten");
    expect(screen.getByRole("row", { name: /Eten/ })).not.toHaveTextContent("automatisch");
  });
});
