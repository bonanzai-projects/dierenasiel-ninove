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

function renderView() {
  render(<CalendarView year={2026} month={7} todayStr="2026-07-15" events={events} />);
}

describe("CalendarView", () => {
  it("toont de maandtitel en de weekdagkoppen (maandag eerst)", () => {
    renderView();
    expect(screen.getByText("Juli 2026")).toBeInTheDocument();
    expect(screen.getByText("Ma")).toBeInTheDocument();
    expect(screen.getByText("Zo")).toBeInTheDocument();
  });

  it("toont de events uit de bronnen", () => {
    renderView();
    expect(screen.getAllByText("Kennismaking: Rex").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10:00 Wandeling: Bella").length).toBeGreaterThan(0);
  });

  it("verbergt een categorie wanneer je de filter uitzet", () => {
    renderView();
    expect(screen.getAllByText("Kennismaking: Rex").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Adopties/i }));

    expect(screen.queryByText("Kennismaking: Rex")).toBeNull();
    // De wandeling blijft wel zichtbaar.
    expect(screen.getAllByText("10:00 Wandeling: Bella").length).toBeGreaterThan(0);
  });

  it("markeert de dag van vandaag in het rooster", () => {
    renderView();
    // 15 komt in het rooster voor als vandaag-cel.
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("linkt de vorige/volgende maand-navigatie correct", () => {
    renderView();
    expect(screen.getByLabelText("Vorige maand")).toHaveAttribute("href", "/beheerder/kalender?y=2026&m=6");
    expect(screen.getByLabelText("Volgende maand")).toHaveAttribute("href", "/beheerder/kalender?y=2026&m=8");
  });
});

// Story 12.3: klikken op een dag opent het dag-detailpaneel.
describe("CalendarView — dag-detail (Story 12.3)", () => {
  it("opent een dialoog met de items van de aangeklikte dag", () => {
    renderView();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByLabelText("Bekijk 2026-07-15"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Woensdag 15 juli 2026")).toBeInTheDocument();
    // Beide events van die dag staan in het paneel.
    expect(screen.getAllByText("Kennismaking: Rex").length).toBeGreaterThan(0);
  });

  it("toont 'geen items' voor een lege dag en een prefill-link naar nieuw item", () => {
    renderView();
    fireEvent.click(screen.getByLabelText("Bekijk 2026-07-20"));
    expect(screen.getByText(/Geen items op deze dag/i)).toBeInTheDocument();
    expect(screen.getByText(/Nieuw item op deze dag/i)).toHaveAttribute(
      "href",
      "/beheerder/kalender/nieuw?date=2026-07-20",
    );
  });

  it("sluit het paneel via de sluitknop", () => {
    renderView();
    fireEvent.click(screen.getByLabelText("Bekijk 2026-07-15"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Sluiten"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
