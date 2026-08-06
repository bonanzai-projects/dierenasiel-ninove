// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import EventEvaluationPanel from "./EventEvaluationPanel";
import type { EventEvaluationRow } from "@/lib/actions/event-evaluations";
import type { CostLine } from "@/lib/events/costs";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/event-evaluations", () => ({ saveEventEvaluation: vi.fn() }));

const kosten: CostLine[] = [
  { id: 1, kind: "kost", category: "drank", description: "Drank", budgetAmount: "400", actualAmount: "560", supplier: null, paid: false, sortOrder: 0 },
  { id: 2, kind: "opbrengst", category: "eten", description: "Eten", budgetAmount: "2500", actualAmount: "2890", supplier: null, paid: true, sortOrder: 1 },
];

const evaluatie = (over: Partial<EventEvaluationRow> = {}): EventEvaluationRow =>
  ({
    id: 1,
    eventId: 12,
    visitors: 280,
    ticketsUsed: 310,
    paidPlates: 289,
    wentWell: "De frituur draaide vlot",
    couldBeBetter: "Te weinig volk aan de afwas",
    agreements: null,
    updatedByUserId: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as EventEvaluationRow;

const basis = { eventId: 12, costs: kosten, shiftCount: 22, tasksDone: 11, tasksTotal: 13 };

beforeEach(() => vi.clearAllMocks());

describe("EventEvaluationPanel", () => {
  it("toont het netto-resultaat, ook zonder ingevulde evaluatie", () => {
    render(<EventEvaluationPanel {...basis} evaluation={null} canWrite />);
    expect(screen.getByText("Netto-resultaat")).toBeInTheDocument();
    expect(screen.getByText("€ 2.330,00")).toBeInTheDocument();
  });

  it("nodigt uit om ze in te vullen wanneer ze leeg is", () => {
    render(<EventEvaluationPanel {...basis} evaluation={null} canWrite />);
    expect(screen.getByText(/nog geen evaluatie/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /evaluatie invullen/i })).toBeInTheDocument();
  });

  it("toont de cijfers van Sven en de opbrengst per bord", () => {
    render(<EventEvaluationPanel {...basis} evaluation={evaluatie()} canWrite />);
    expect(screen.getByText("Betalende borden")).toBeInTheDocument();
    expect(screen.getByText("289")).toBeInTheDocument();
    expect(screen.getByText("Opbrengst per bord")).toBeInTheDocument();
    expect(screen.getByText("€ 10,00")).toBeInTheDocument();
  });

  it("toont de bezetting en het afgewerkte draaiboek", () => {
    render(<EventEvaluationPanel {...basis} evaluation={evaluatie()} canWrite />);
    expect(screen.getByText("Vrijwilligersshiften")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("11 van 13")).toBeInTheDocument();
  });

  it("toont de ingevulde teksten, en laat een leeg blok weg", () => {
    render(<EventEvaluationPanel {...basis} evaluation={evaluatie()} canWrite />);
    expect(screen.getByText("De frituur draaide vlot")).toBeInTheDocument();
    expect(screen.getByText("Wat kon beter")).toBeInTheDocument();
    expect(screen.queryByText("Afspraken voor volgende keer")).not.toBeInTheDocument();
  });

  it("opent het formulier met de bestaande waarden", () => {
    render(<EventEvaluationPanel {...basis} evaluation={evaluatie()} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: /evaluatie bewerken/i }));
    expect(screen.getByLabelText("Bezoekers")).toHaveValue("280");
    expect(screen.getByLabelText("Wat liep goed")).toHaveValue("De frituur draaide vlot");
  });

  it("verbergt de knop voor wie niet mag schrijven", () => {
    render(<EventEvaluationPanel {...basis} evaluation={evaluatie()} canWrite={false} />);
    expect(screen.queryByRole("button", { name: /evaluatie/i })).not.toBeInTheDocument();
  });

  it("laat een cijfer weg dat niet gemeten is", () => {
    render(
      <EventEvaluationPanel
        {...basis}
        evaluation={evaluatie({ visitors: null, ticketsUsed: null, paidPlates: null })}
        canWrite
      />,
    );
    expect(screen.queryByText("Bezoekers")).not.toBeInTheDocument();
    expect(screen.queryByText("Betalende borden")).not.toBeInTheDocument();
    expect(screen.queryByText("Opbrengst per bord")).not.toBeInTheDocument();
    // Wat wél uit de fiche volgt, blijft staan.
    expect(screen.getByText("Netto-resultaat")).toBeInTheDocument();
    expect(screen.getByText("Vrijwilligersshiften")).toBeInTheDocument();
  });
});
