// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/lib/actions/walkers", () => ({ createWalkerManual: vi.fn() }));

import WalkerCreateForm from "./WalkerCreateForm";

// Story 10.77 — een medewerker aanvaardt het reglement niet meer in naam van de wandelaar.

describe("WalkerCreateForm", () => {
  it("vraagt geen vinkje voor het reglement, maar legt uit dat de wandelaar zelf aanvaardt", () => {
    render(<WalkerCreateForm onClose={() => {}} />);
    expect(screen.queryByLabelText(/Wandelreglement is met de wandelaar besproken/)).toBeNull();
    expect(screen.getByText(/aanvaardt het wandelreglement zelf in de wandelaar-app/)).toBeInTheDocument();
  });
});
