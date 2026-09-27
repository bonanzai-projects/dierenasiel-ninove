// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/lib/actions/walkers", () => ({ submitWalkerRegistration: vi.fn() }));

import WalkerRegistrationForm from "./WalkerRegistrationForm";

// Story 10.77 — wie zich inschrijft, leest en aanvaardt de nieuwe versie van het reglement.

describe("WalkerRegistrationForm", () => {
  it("toont in de app de nieuwe versie van het reglement", () => {
    render(<WalkerRegistrationForm variant="dark" />);
    fireEvent.click(screen.getByRole("button", { name: "wandelreglement" }));
    expect(screen.getByText("Versie van 5 mei 2026")).toBeInTheDocument();
    expect(screen.getByText(/starten tussen 10 en 10u45/)).toBeInTheDocument();
    expect(screen.queryByText(/11u30/)).toBeNull();
  });

  it("linkt op de website naar de pagina met het reglement", () => {
    render(<WalkerRegistrationForm variant="light" />);
    expect(screen.getByRole("link", { name: "wandelreglement" })).toHaveAttribute("href", "/wandelreglement");
  });
});
