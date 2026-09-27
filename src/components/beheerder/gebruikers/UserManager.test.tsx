// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("./UserForm", () => ({ default: () => <div>gebruikersformulier</div> }));
vi.mock("./RolePermissionsInfo", () => ({ default: () => null }));

import UserManager from "./UserManager";

// Story 10.78 — de gebruikerslijst filteren op rol, en per rol samen tonen.

const gebruiker = (id: number, name: string, role: string) => ({
  id, name, role, email: `${name.toLowerCase()}@example.com`, isActive: true, lastLoginAt: null, createdAt: new Date(`2026-0${id}-01`),
});

const gebruikers = [
  gebruiker(1, "Wim", "wandelaar"),
  gebruiker(2, "Sven", "beheerder"),
  gebruiker(3, "Nathalie", "medewerker"),
  gebruiker(4, "Anke", "medewerker"),
  gebruiker(5, "Dirk", "dierenarts"),
];

const namenInTabel = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((rij) => within(rij).getAllByRole("cell")[0].textContent);

describe("UserManager — filter op rol", () => {
  it("toont knoppen per rol met het aantal, en 'Alle' is gekozen", () => {
    render(<UserManager users={gebruikers} />);
    const filter = screen.getByRole("group", { name: "Filter op rol" });
    expect(within(filter).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Alle (5)", "Beheerder (1)", "Medewerker (2)", "Dierenarts (1)", "Wandelaar (1)",
    ]);
    expect(within(filter).getByRole("button", { name: "Alle (5)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("zet iedereen per rol samen in de lijst", () => {
    render(<UserManager users={gebruikers} />);
    expect(namenInTabel()).toEqual(["Sven", "Anke", "Nathalie", "Dirk", "Wim"]);
  });

  it("toont enkel de gekozen rol, en 'Alle' weer iedereen", () => {
    render(<UserManager users={gebruikers} />);
    fireEvent.click(screen.getByRole("button", { name: "Medewerker (2)" }));
    expect(namenInTabel()).toEqual(["Anke", "Nathalie"]);
    expect(screen.getByRole("button", { name: "Medewerker (2)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Alle (5)" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Alle (5)" }));
    expect(namenInTabel()).toHaveLength(5);
  });

  it("toont de rol 'Wandelaar' met zijn label in de tabel", () => {
    render(<UserManager users={gebruikers} />);
    fireEvent.click(screen.getByRole("button", { name: "Wandelaar (1)" }));
    const rij = within(screen.getByRole("table")).getAllByRole("row")[1];
    expect(within(rij).getAllByRole("cell")[2]).toHaveTextContent("Wandelaar");
  });

  it("valt terug op 'Alle' als de gekozen rol niet meer voorkomt", () => {
    const { rerender } = render(<UserManager users={gebruikers} />);
    fireEvent.click(screen.getByRole("button", { name: "Dierenarts (1)" }));
    rerender(<UserManager users={gebruikers.filter((u) => u.role !== "dierenarts")} />);
    expect(namenInTabel()).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Alle (4)" })).toHaveAttribute("aria-pressed", "true");
  });
});
