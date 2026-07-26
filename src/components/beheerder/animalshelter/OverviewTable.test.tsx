// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import OverviewTable from "./OverviewTable";
import type { OverviewModel } from "@/lib/animalshelter/overview";

const model: OverviewModel = {
  entries: [
    {
      externalId: 1, externalName: "Rocky", externalNumber: 2502157, category: "dogs",
      animalId: 11, localName: "Rocco", matchMethod: "chip", open: 2, genegeerd: 1,
      bucket: "verschillen",
    },
    {
      externalId: 2, externalName: "Gaston", externalNumber: 2602001, category: "dogs",
      animalId: 12, localName: "Gaston", matchMethod: "chip", open: 0, genegeerd: 0,
      bucket: "gelijk",
    },
    {
      externalId: 3, externalName: "Felix", externalNumber: 2601022, category: "cats",
      animalId: null, localName: null, matchMethod: null, open: 0, genegeerd: 0,
      bucket: "enkel_extern",
    },
    {
      externalId: 4, externalName: "Dubbel", externalNumber: null, category: "cats",
      animalId: null, localName: null, matchMethod: null, open: 0, genegeerd: 0,
      bucket: "ambigu", kandidaten: [{ id: 20, name: "Mia" }, { id: 21, name: "Mia" }],
    },
    {
      externalId: 5, externalName: "Varken (vondeling)", externalNumber: null, category: "other",
      animalId: null, localName: null, matchMethod: null, open: 0, genegeerd: 0,
      bucket: "genegeerd",
    },
  ],
  enkelLokaal: [{ id: 30, name: "Tim", species: "hond" }],
  tellers: { verschillen: 1, gelijk: 1, enkel_extern: 1, ambigu: 1, genegeerd: 1, enkelLokaal: 1 },
};

const toon = () => render(<OverviewTable model={model} />);

describe("OverviewTable — het overzicht (Story 11.4)", () => {
  it("toont een teller per emmer", () => {
    toon();
    expect(screen.getByRole("button", { name: /verschillen \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enkel bij animalshelter \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enkel bij ons \(1\)/i })).toBeInTheDocument();
  });

  it("begint bij de dieren die een beslissing vragen", () => {
    toon();
    expect(screen.getByRole("link", { name: /Rocky/ })).toBeInTheDocument();
    expect(screen.queryByText("Gaston")).toBeNull();
  });

  it("linkt door naar het vergelijkingsscherm van dat dier", () => {
    toon();
    expect(screen.getByRole("link", { name: /Rocky/ })).toHaveAttribute(
      "href",
      "/beheerder/animalshelter/1",
    );
  });

  it("toont hoeveel verschillen openstaan en hoeveel er genegeerd zijn", () => {
    toon();
    const rij = screen.getByRole("row", { name: /Rocky/ });
    expect(within(rij).getByText(/2 verschillen/i)).toBeInTheDocument();
    expect(within(rij).getByText(/1 genegeerd/i)).toBeInTheDocument();
  });

  it("laat wisselen naar een andere emmer", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /enkel bij animalshelter \(1\)/i }));

    expect(screen.getByRole("link", { name: /Felix/ })).toBeInTheDocument();
    expect(screen.queryByText("Rocky")).toBeNull();
  });

  it("wijst vanuit 'enkel bij AnimalShelter' de weg naar het importscherm", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /enkel bij animalshelter \(1\)/i }));

    expect(screen.getByRole("link", { name: /dieren overnemen/i })).toHaveAttribute(
      "href",
      "/beheerder/animalshelter/importeren",
    );
  });

  it("toont onze eigen dieren die AnimalShelter niet kent", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /enkel bij ons \(1\)/i }));

    expect(screen.getByText("Tim")).toBeInTheDocument();
    expect(screen.getByText(/staat niet bij animalshelter/i)).toBeInTheDocument();
  });

  it("waarschuwt bij een ambigue match in plaats van te gokken", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: /keuze nodig \(1\)/i }));

    expect(screen.getByText(/2 dieren met dezelfde/i)).toBeInTheDocument();
  });

  it("meldt netjes dat een emmer leeg is", () => {
    render(
      <OverviewTable
        model={{ entries: [], enkelLokaal: [], tellers: { ...model.tellers, verschillen: 0 } }}
      />,
    );
    expect(screen.getByText(/niets te tonen/i)).toBeInTheDocument();
  });
});
