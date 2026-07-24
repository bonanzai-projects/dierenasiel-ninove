// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CalendarView from "./CalendarView";
import type { CalendarEvent } from "@/lib/calendar/events";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

const events: CalendarEvent[] = [
  { id: "kennismaking-1", category: "adopties", date: "2026-07-15", time: "14:00", title: "Kennismaking: Rex", href: "/beheerder/adoptie" },
  { id: "walk-1", category: "wandelingen", date: "2026-07-15", time: "10:00", title: "Wandeling: Bella", href: "/beheerder/dieren/2" },
];

function renderMonth() {
  render(<CalendarView view="maand" refDate="2026-07-15" todayStr="2026-07-15" events={events} />);
}

describe("CalendarView — maandweergave", () => {
  it("toont de maandtitel en de weekdagkoppen (maandag eerst)", () => {
    renderMonth();
    expect(screen.getByText("Juli 2026")).toBeInTheDocument();
    expect(screen.getByText("Ma")).toBeInTheDocument();
    expect(screen.getByText("Zo")).toBeInTheDocument();
  });

  it("toont de events uit de bronnen", () => {
    renderMonth();
    expect(screen.getAllByText("Kennismaking: Rex").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10:00 Wandeling: Bella").length).toBeGreaterThan(0);
  });

  it("verbergt een categorie wanneer je de filter uitzet", () => {
    renderMonth();
    expect(screen.getAllByText("Kennismaking: Rex").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Adopties/i }));
    expect(screen.queryByText("Kennismaking: Rex")).toBeNull();
    expect(screen.getAllByText("10:00 Wandeling: Bella").length).toBeGreaterThan(0);
  });

  it("linkt de vorige/volgende maand-navigatie correct", () => {
    renderMonth();
    expect(screen.getByLabelText("Vorige")).toHaveAttribute("href", "/beheerder/kalender?view=maand&d=2026-06-01");
    expect(screen.getByLabelText("Volgende")).toHaveAttribute("href", "/beheerder/kalender?view=maand&d=2026-08-01");
  });
});

describe("CalendarView — dag-detail (Story 12.3)", () => {
  it("opent een dialoog met de items van de aangeklikte dag", () => {
    renderMonth();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByLabelText("Bekijk 2026-07-15"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Woensdag 15 juli 2026")).toBeInTheDocument();
    expect(screen.getAllByText("Kennismaking: Rex").length).toBeGreaterThan(0);
  });

  it("sluit het paneel via de sluitknop", () => {
    renderMonth();
    fireEvent.click(screen.getByLabelText("Bekijk 2026-07-15"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Sluiten"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// Story 12.6: week- en dagweergave.
describe("CalendarView — week/dag-weergave (Story 12.6)", () => {
  it("toont een view-switcher met Maand/Week/Dag", () => {
    renderMonth();
    expect(screen.getByRole("link", { name: "Maand" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "/beheerder/kalender?view=week&d=2026-07-15");
    expect(screen.getByRole("link", { name: "Dag" })).toHaveAttribute("href", "/beheerder/kalender?view=dag&d=2026-07-15");
  });

  it("weekweergave toont 7 dagkoppen die naar de dagweergave linken en de events", () => {
    render(<CalendarView view="week" refDate="2026-07-15" todayStr="2026-07-15" events={events} />);
    // Navigatie verschuift een week.
    expect(screen.getByLabelText("Vorige")).toHaveAttribute("href", "/beheerder/kalender?view=week&d=2026-07-08");
    expect(screen.getByLabelText("Volgende")).toHaveAttribute("href", "/beheerder/kalender?view=week&d=2026-07-22");
    // De woensdag-events staan in de week (pill met tijd).
    expect(screen.getAllByText("14:00 Kennismaking: Rex").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10:00 Wandeling: Bella").length).toBeGreaterThan(0);
  });

  it("dagweergave toont de agenda van één dag met een prefill-link", () => {
    render(<CalendarView view="dag" refDate="2026-07-15" todayStr="2026-07-15" events={events} />);
    expect(screen.getByText("Woensdag 15 juli 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorige")).toHaveAttribute("href", "/beheerder/kalender?view=dag&d=2026-07-14");
    expect(screen.getByText(/Nieuw item op deze dag/i)).toHaveAttribute("href", "/beheerder/kalender/nieuw?date=2026-07-15");
  });

  it("dagweergave op een lege dag toont 'geen items'", () => {
    render(<CalendarView view="dag" refDate="2026-07-20" todayStr="2026-07-15" events={events} />);
    expect(screen.getByText(/Geen items op deze dag/i)).toBeInTheDocument();
  });
});
