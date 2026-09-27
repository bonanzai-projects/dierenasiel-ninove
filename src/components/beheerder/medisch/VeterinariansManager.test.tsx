// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const h = vi.hoisted(() => ({ mockDelete: vi.fn(), mockCreate: vi.fn(), mockUpdate: vi.fn(), mockRefresh: vi.fn() }));
vi.mock("@/lib/actions/veterinarians", () => ({
  deleteVeterinarian: h.mockDelete,
  createVeterinarian: h.mockCreate,
  updateVeterinarian: h.mockUpdate,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: h.mockRefresh }) }));

import VeterinariansManager from "./VeterinariansManager";

// Story 10.81 — de dierenartsenlijst (Sven: "van bepaalde dierenartsen een fiche kunnen bijhouden").

const fiche = (id: number, name: string, extra: Record<string, string | null> = {}) => ({
  id, name, practice: null, street: null, houseNumber: null, postalCode: null, city: null,
  phone: null, mobile: null, email: null, orderNumber: null, notes: null,
  createdAt: new Date(), updatedAt: new Date(), ...extra,
});

const lijst = [
  fiche(3, "Dr. Ine Wouters", {
    practice: "Dierenkliniek De Dender", street: "Kerkstraat", houseNumber: "12", postalCode: "9400", city: "Ninove",
    phone: "054 12 34 56", email: "ine@dedender.be", orderNumber: "N1234",
  }),
  fiche(4, "Dr. Peeters"),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VeterinariansManager", () => {
  it("toont elke dierenarts met praktijk, adres, contact en ordenummer", () => {
    render(<VeterinariansManager veterinarians={lijst} canWrite />);
    const rij = screen.getByText("Dr. Ine Wouters").closest("tr")!;
    expect(rij).toHaveTextContent("Dierenkliniek De Dender");
    expect(rij).toHaveTextContent("Kerkstraat 12, 9400 Ninove");
    expect(rij).toHaveTextContent("054 12 34 56");
    expect(rij).toHaveTextContent("ine@dedender.be");
    expect(rij).toHaveTextContent("N1234");
  });

  it("legt uit wat te doen als de lijst leeg is", () => {
    render(<VeterinariansManager veterinarians={[]} canWrite />);
    expect(screen.getByText(/Nog geen dierenartsen/)).toBeInTheDocument();
  });

  it("opent het formulier voor een nieuwe dierenarts", () => {
    render(<VeterinariansManager veterinarians={lijst} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: "+ Nieuwe dierenarts" }));
    expect(screen.getByLabelText(/^Naam/)).toBeInTheDocument();
    expect(screen.getByLabelText("Praktijk")).toBeInTheDocument();
    expect(screen.getByLabelText("Ordenummer")).toBeInTheDocument();
  });

  it("verwijdert na bevestiging", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    h.mockDelete.mockResolvedValue({ success: true, data: { id: 4 } });
    render(<VeterinariansManager veterinarians={lijst} canWrite />);
    const rij = screen.getByText("Dr. Peeters").closest("tr")!;
    fireEvent.click(within(rij).getByRole("button", { name: "Verwijderen" }));
    await waitFor(() => expect(h.mockDelete).toHaveBeenCalledWith(4));
    expect(h.mockRefresh).toHaveBeenCalled();
  });

  it("toont geen knoppen aan wie enkel mag kijken", () => {
    render(<VeterinariansManager veterinarians={lijst} canWrite={false} />);
    expect(screen.queryByRole("button", { name: "+ Nieuwe dierenarts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bewerken" })).toBeNull();
  });
});
