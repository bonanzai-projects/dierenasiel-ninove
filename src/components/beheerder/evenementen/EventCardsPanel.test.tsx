// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const h = vi.hoisted(() => ({
  create: vi.fn(),
  settle: vi.fn(),
  reopen: vi.fn(),
  remove: vi.fn(),
  add: vi.fn(),
  drawApp: vi.fn(),
  removeDraw: vi.fn(),
}));
vi.mock("@/lib/actions/event-cards", () => ({
  createCardSeries: h.create,
  settleCardSeries: h.settle,
  reopenCardSeries: h.reopen,
  deleteCardSeries: h.remove,
  addCardDraw: h.add,
  drawCardByApp: h.drawApp,
  deleteCardDraw: h.removeDraw,
}));

import EventCardsPanel, { type CardSeriesRow, type CardDrawRow } from "./EventCardsPanel";

// Story 13.15 — Sven (12 sep 2026): nummers per verkoper, € 5, onverkochte nummers terug, en de app mag trekken.

const reeks = (over: Partial<CardSeriesRow> & { id: number }): CardSeriesRow => ({
  eventId: 4,
  seller: "Martine",
  numberFrom: 1,
  numberTo: 50,
  price: "5.00",
  unsoldNumbers: [],
  settledAt: null,
  ...over,
});

const reeksen = [
  reeks({ id: 1, settledAt: new Date("2026-10-01T10:00:00Z"), unsoldNumbers: [3, 4, 5] }),
  reeks({ id: 2, seller: "Jan", numberFrom: 51, numberTo: 75 }),
];
const trekkingen: CardDrawRow[] = [{ id: 7, eventId: 4, number: 12, prize: "Fles wijn", drawnByApp: true }];

const OK = { success: true, data: undefined, message: "Gelukt." };

function toon(props: Partial<Parameters<typeof EventCardsPanel>[0]> = {}) {
  return render(<EventCardsPanel eventId={4} series={reeksen} draws={trekkingen} canWrite {...props} />);
}

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset().mockResolvedValue(OK);
});

describe("EventCardsPanel", () => {
  it("toont per verkoper de nummers, wat verkocht is, wat terugkwam en het bedrag", () => {
    toon();
    const martine = screen.getByRole("row", { name: /Martine/ });
    expect(martine).toHaveTextContent("1–50");
    expect(martine).toHaveTextContent("47 / 50");
    expect(martine).toHaveTextContent("3–5");
    expect(martine).toHaveTextContent("€ 235,00");
    const jan = screen.getByRole("row", { name: /Jan/ });
    expect(jan).toHaveTextContent("51–75");
    expect(jan).toHaveTextContent("uitgedeeld");
  });

  it("toont de totalen", () => {
    toon();
    expect(screen.getByText(/75 kaarten uitgedeeld · 47 verkocht · 3 onverkocht terug · € 235,00/)).toBeInTheDocument();
    expect(screen.getByText(/1 reeks nog open \(25 kaarten\)/)).toBeInTheDocument();
  });

  it("legt uit wat te doen als er nog geen kaarten zijn", () => {
    toon({ series: [], draws: [] });
    expect(screen.getByText(/Nog geen steunkaarten/)).toBeInTheDocument();
  });

  it("stelt het volgende vrije nummer voor bij een nieuwe reeks, en € 5", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "+ Reeks meegeven" }));
    expect(screen.getByLabelText("Van nummer")).toHaveValue(76);
    expect(screen.getByLabelText("Prijs per kaart")).toHaveValue("5");
    fireEvent.change(screen.getByLabelText("Verkoper"), { target: { value: "Els" } });
    fireEvent.change(screen.getByLabelText("Tot nummer"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Reeks bewaren" }));
    await waitFor(() => expect(h.create).toHaveBeenCalled());
    const fd = h.create.mock.calls[0][1] as FormData;
    expect([fd.get("eventId"), fd.get("seller"), fd.get("numberFrom"), fd.get("numberTo"), fd.get("price")]).toEqual(["4", "Els", "76", "100", "5"]);
  });

  it("rekent een reeks af met de onverkochte nummers", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Afrekenen: Jan" }));
    fireEvent.change(screen.getByLabelText("Onverkochte nummers (Jan)"), { target: { value: "70-75" } });
    fireEvent.click(screen.getByRole("button", { name: "Afrekenen" }));
    await waitFor(() => expect(h.settle).toHaveBeenCalled());
    const fd = h.settle.mock.calls[0][1] as FormData;
    expect([fd.get("id"), fd.get("unsold")]).toEqual(["2", "70-75"]);
    expect(await screen.findByText("Gelukt.")).toBeInTheDocument();
  });

  it("vult bij het aanpassen van een afgerekende reeks de onverkochte nummers al in", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Aanpassen: Martine" }));
    expect(screen.getByLabelText("Onverkochte nummers (Martine)")).toHaveValue("3–5");
  });

  it("toont de winnende nummers en laat de app trekken", async () => {
    toon();
    const winnaars = screen.getByRole("list", { name: "Winnende nummers" });
    expect(within(winnaars).getByText(/12/)).toBeInTheDocument();
    expect(winnaars).toHaveTextContent("Fles wijn");
    expect(winnaars).toHaveTextContent("door de app getrokken");
    fireEvent.change(screen.getByLabelText("Prijs voor de trekking door de app"), { target: { value: "Hoofdprijs" } });
    fireEvent.click(screen.getByRole("button", { name: "Laat de app trekken" }));
    await waitFor(() => expect(h.drawApp).toHaveBeenCalled());
    expect((h.drawApp.mock.calls[0][1] as FormData).get("prize")).toBe("Hoofdprijs");
  });

  it("laat een zelf getrokken nummer invullen", async () => {
    toon();
    fireEvent.change(screen.getByLabelText("Winnend nummer"), { target: { value: "33" } });
    fireEvent.click(screen.getByRole("button", { name: "Invullen" }));
    await waitFor(() => expect(h.add).toHaveBeenCalled());
    expect((h.add.mock.calls[0][1] as FormData).get("number")).toBe("33");
  });

  it("toont enkel wie het mag zien: geen knoppen of formulieren zonder schrijfrecht", () => {
    toon({ canWrite: false });
    expect(screen.queryByRole("button", { name: "+ Reeks meegeven" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Afrekenen/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Laat de app trekken" })).toBeNull();
    expect(screen.getByRole("row", { name: /Martine/ })).toBeInTheDocument();
  });
});
