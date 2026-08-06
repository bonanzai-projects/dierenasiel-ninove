// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import DraaiboekPanel from "./DraaiboekPanel";
import type { EventTaskRow } from "@/lib/actions/event-tasks";

const { mockToggle } = vi.hoisted(() => ({ mockToggle: vi.fn() }));

vi.mock("@/lib/actions/event-tasks", () => ({
  createEventTask: vi.fn(),
  updateEventTask: vi.fn(),
  deleteEventTask: vi.fn(),
  toggleEventTask: mockToggle,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const taak = (over: Partial<EventTaskRow> & { id: number }): EventTaskRow =>
  ({
    eventId: 4,
    phase: "voorbereiding",
    title: "Zaal reserveren",
    date: null,
    time: null,
    responsible: null,
    notes: null,
    sortOrder: 0,
    done: false,
    doneAt: null,
    doneByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as EventTaskRow;

beforeEach(() => {
  vi.clearAllMocks();
  mockToggle.mockResolvedValue({ success: true, data: {} });
});

describe("DraaiboekPanel", () => {
  it("toont de drie fasen, ook wanneer ze leeg zijn", () => {
    render(<DraaiboekPanel eventId={4} tasks={[]} canWrite />);
    expect(screen.getByText("Voorbereiding")).toBeInTheDocument();
    expect(screen.getByText("De dag zelf")).toBeInTheDocument();
    expect(screen.getByText("Afbraak & nazorg")).toBeInTheDocument();
  });

  it("toont een taak met haar uur en verantwoordelijke", () => {
    render(
      <DraaiboekPanel
        eventId={4}
        tasks={[taak({ id: 1, phase: "dag-zelf", title: "Frituur aanzetten", time: "16:00", responsible: "Katrien" })]}
        canWrite
      />,
    );
    expect(screen.getByText("Frituur aanzetten")).toBeInTheDocument();
    expect(screen.getByText(/16:00/)).toBeInTheDocument();
    expect(screen.getByText(/Katrien/)).toBeInTheDocument();
  });

  it("toont hoeveel taken al af zijn", () => {
    render(
      <DraaiboekPanel
        eventId={4}
        tasks={[taak({ id: 1, done: true }), taak({ id: 2 }), taak({ id: 3 })]}
        canWrite
      />,
    );
    expect(screen.getByText(/1 van 3/)).toBeInTheDocument();
  });

  it("vinkt een taak af via de actie", () => {
    render(<DraaiboekPanel eventId={4} tasks={[taak({ id: 1 })]} canWrite />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Zaal reserveren/ }));
    expect(mockToggle).toHaveBeenCalledWith(1, true);
  });

  it("vinkt een afgevinkte taak weer uit", () => {
    render(<DraaiboekPanel eventId={4} tasks={[taak({ id: 1, done: true })]} canWrite />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Zaal reserveren/ }));
    expect(mockToggle).toHaveBeenCalledWith(1, false);
  });

  it("opent een invoerformulier met de fase al ingevuld", () => {
    const { container } = render(<DraaiboekPanel eventId={4} tasks={[]} canWrite />);
    const knoppen = screen.getAllByRole("button", { name: /Taak toevoegen/ });
    fireEvent.click(knoppen[1]); // de tweede fase: "De dag zelf"

    const verborgen = container.querySelector('input[name="phase"]') as HTMLInputElement;
    expect(verborgen).not.toBeNull();
    expect(verborgen.value).toBe("dag-zelf");
    expect((container.querySelector('input[name="eventId"]') as HTMLInputElement).value).toBe("4");
  });

  it("toont geen knoppen of vinkjes zonder schrijfrecht", () => {
    render(<DraaiboekPanel eventId={4} tasks={[taak({ id: 1 })]} canWrite={false} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Taak toevoegen/ })).not.toBeInTheDocument();
    expect(screen.getByText("Zaal reserveren")).toBeInTheDocument();
  });

  it("zet een afgevinkte taak visueel door", () => {
    render(<DraaiboekPanel eventId={4} tasks={[taak({ id: 1, done: true })]} canWrite />);
    expect(screen.getByText("Zaal reserveren").className).toContain("line-through");
  });

  it("groepeert elke taak onder haar eigen fase", () => {
    render(
      <DraaiboekPanel
        eventId={4}
        tasks={[
          taak({ id: 1, phase: "afbraak", title: "Zaal poetsen" }),
          taak({ id: 2, phase: "voorbereiding", title: "Zaal reserveren" }),
        ]}
        canWrite
      />,
    );
    const afbraak = screen.getByRole("region", { name: "Afbraak & nazorg" });
    expect(within(afbraak).getByText("Zaal poetsen")).toBeInTheDocument();
    expect(within(afbraak).queryByText("Zaal reserveren")).not.toBeInTheDocument();
  });

  // Story 13.8 — te laat is te laat, ook op de fiche zelf.
  describe("timing-labels", () => {
    const VANDAAG = "2026-08-06";

    it("markeert een taak die te laat is", () => {
      render(
        <DraaiboekPanel
          eventId={4}
          tasks={[taak({ id: 1, title: "Traiteur bellen", date: "2026-08-01" })]}
          canWrite
          today={VANDAAG}
        />,
      );
      expect(screen.getByText("5 dagen te laat")).toBeInTheDocument();
    });

    it("markeert een taak van vandaag", () => {
      render(
        <DraaiboekPanel
          eventId={4}
          tasks={[taak({ id: 1, date: VANDAAG })]}
          canWrite
          today={VANDAAG}
        />,
      );
      expect(screen.getByText("Vandaag")).toBeInTheDocument();
    });

    it("zwijgt over een taak die nog ver weg is", () => {
      render(
        <DraaiboekPanel
          eventId={4}
          tasks={[taak({ id: 1, date: "2026-12-01" })]}
          canWrite
          today={VANDAAG}
        />,
      );
      expect(screen.queryByText(/te laat|Vandaag|Morgen|over \d+ dagen/)).not.toBeInTheDocument();
    });

    it("zwijgt over een taak die al afgevinkt is", () => {
      render(
        <DraaiboekPanel
          eventId={4}
          tasks={[taak({ id: 1, date: "2026-08-01", done: true })]}
          canWrite
          today={VANDAAG}
        />,
      );
      expect(screen.queryByText(/te laat/)).not.toBeInTheDocument();
    });

    it("zwijgt wanneer de dag van vandaag niet meegegeven is", () => {
      render(
        <DraaiboekPanel eventId={4} tasks={[taak({ id: 1, date: "2026-08-01" })]} canWrite />,
      );
      expect(screen.queryByText(/te laat/)).not.toBeInTheDocument();
    });
  });
});
