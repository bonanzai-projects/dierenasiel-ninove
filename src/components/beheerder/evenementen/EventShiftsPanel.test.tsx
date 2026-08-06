// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import EventShiftsPanel from "./EventShiftsPanel";
import type { EventShiftRow } from "@/lib/actions/event-shifts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/event-shifts", () => ({
  createEventShift: vi.fn(),
  updateEventShift: vi.fn(),
  deleteEventShift: vi.fn(),
}));

const shift = (over: Partial<EventShiftRow> & { id: number }): EventShiftRow =>
  ({
    eventId: 7,
    date: "2026-11-14",
    startTime: null,
    endTime: null,
    post: "Bar",
    personName: "Katrien",
    userId: null,
    notes: null,
    sortOrder: 0,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as EventShiftRow;

const shiften = [
  shift({ id: 1, post: "Bar", personName: "Katrien", startTime: "16:00", endTime: "20:00" }),
  shift({ id: 2, post: "Bar", personName: "Sven", startTime: "20:00", endTime: "23:00" }),
  shift({ id: 3, post: "Kassa", personName: "Martine", startTime: "16:00", endTime: "23:00" }),
  shift({ id: 4, date: "2026-11-15", post: "Afbraak", personName: "Peter" }),
];

beforeEach(() => vi.clearAllMocks());

describe("EventShiftsPanel", () => {
  it("groepeert per dag", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite />);
    expect(screen.getByRole("region", { name: "zaterdag 14/11/2026" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "zondag 15/11/2026" })).toBeInTheDocument();
  });

  it("zet binnen een dag de mensen onder hun post", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite />);
    const zaterdag = screen.getByRole("region", { name: "zaterdag 14/11/2026" });
    const bar = within(zaterdag).getByRole("group", { name: "Bar" });
    expect(within(bar).getByText("Katrien")).toBeInTheDocument();
    expect(within(bar).getByText("Sven")).toBeInTheDocument();
    expect(within(bar).queryByText("Martine")).not.toBeInTheDocument();
  });

  it("toont het uurblok bij elke naam", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite />);
    expect(screen.getByText("16:00 – 20:00")).toBeInTheDocument();
  });

  it("noemt een shift zonder uren 'hele dag'", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite />);
    const zondag = screen.getByRole("region", { name: "zondag 15/11/2026" });
    expect(within(zondag).getByText("hele dag")).toBeInTheDocument();
  });

  it("telt de shiften en de verschillende mensen", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite />);
    const teller = screen.getByLabelText(/bezetting/i);
    expect(teller).toHaveTextContent("4");
    expect(teller).toHaveTextContent("4 shiften");
  });

  it("zegt het wanneer er nog niemand ingepland is", () => {
    render(<EventShiftsPanel eventId={7} shifts={[]} eventDate="2026-11-14" canWrite />);
    expect(screen.getByText(/nog niemand ingepland/i)).toBeInTheDocument();
  });

  it("verbergt de knoppen voor wie niet mag schrijven", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite={false} />);
    expect(screen.queryByRole("button", { name: /inplannen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bewerken/i })).not.toBeInTheDocument();
  });

  it("toont de inplanknop voor wie wel mag schrijven", () => {
    render(<EventShiftsPanel eventId={7} shifts={shiften} eventDate="2026-11-14" canWrite />);
    expect(screen.getByRole("button", { name: /vrijwilliger inplannen/i })).toBeInTheDocument();
  });
});
