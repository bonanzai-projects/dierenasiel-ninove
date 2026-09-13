// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SuppliersManager from "./SuppliersManager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/suppliers", () => ({
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
}));

const lev = (over: Record<string, unknown> & { id: number; name: string }) => ({
  phone: null,
  email: null,
  website: null,
  notes: null,
  street: null,
  houseNumber: null,
  postalCode: null,
  city: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  eventCount: 0,
  ...over,
});

const lijst = [
  lev({ id: 1, name: "Brouwerij De Ryck", phone: "0470 12 34 56", eventCount: 2 }),
  lev({ id: 2, name: "Chiro Ninove", eventCount: 1 }),
  lev({ id: 3, name: "Verhuur Van Damme", eventCount: 0 }),
];

beforeEach(() => vi.clearAllMocks());

// Story 13.16 — de leverancierslijst zelf.
describe("SuppliersManager", () => {
  it("toont elke leverancier met zijn contactgegevens en het aantal evenementen", () => {
    render(<SuppliersManager suppliers={lijst} canWrite />);
    const rij = screen.getByRole("row", { name: /Brouwerij De Ryck/ });
    expect(within(rij).getByRole("link", { name: "0470 12 34 56" })).toHaveAttribute("href", "tel:0470123456");
    expect(within(rij).getByText("2 evenementen")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Chiro Ninove/ })).getByText("1 evenement")).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Verhuur Van Damme/ })).getByText("Nog niet gebruikt"),
    ).toBeInTheDocument();
  });

  it("zonder schrijfrecht: geen knoppen om te wijzigen", () => {
    render(<SuppliersManager suppliers={lijst} canWrite={false} />);
    expect(screen.queryByRole("button", { name: /Nieuwe leverancier/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Bewerken/ })).toBeNull();
  });

  it("met schrijfrecht: '+ Nieuwe leverancier' opent een leeg formulier", () => {
    render(<SuppliersManager suppliers={lijst} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: "+ Nieuwe leverancier" }));
    expect(screen.getByLabelText(/Naam/)).toHaveValue("");
    expect(screen.getByLabelText("Gsm")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Website")).toBeInTheDocument();
  });

  it("toont een uitnodiging wanneer de lijst leeg is", () => {
    render(<SuppliersManager suppliers={[]} canWrite />);
    expect(screen.getByText(/Nog geen leveranciers/)).toBeInTheDocument();
  });
});

// Story 13.18 — Sven: "adres: straat + nr + postcode + gemeente (aparte velden aub)".
describe("SuppliersManager — adres", () => {
  const verhuur = lev({
    id: 4,
    name: "Verhuur Van Damme",
    street: "Kerkstraat",
    houseNumber: "12",
    postalCode: "9400",
    city: "Ninove",
  });

  it("het formulier heeft straat, nr, postcode en gemeente als aparte velden", () => {
    render(<SuppliersManager suppliers={lijst} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: "+ Nieuwe leverancier" }));
    for (const label of ["Straat", "Nr", "Postcode", "Gemeente"]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
  });

  it("vult bij bewerken het bestaande adres in", () => {
    render(<SuppliersManager suppliers={[verhuur]} canWrite />);
    fireEvent.click(screen.getByRole("button", { name: "Bewerken" }));
    expect(screen.getByLabelText("Straat")).toHaveValue("Kerkstraat");
    expect(screen.getByLabelText("Nr")).toHaveValue("12");
    expect(screen.getByLabelText("Postcode")).toHaveValue("9400");
    expect(screen.getByLabelText("Gemeente")).toHaveValue("Ninove");
  });

  it("toont het adres in de lijst, bij de contactgegevens", () => {
    render(<SuppliersManager suppliers={[verhuur]} canWrite={false} />);
    const rij = screen.getByRole("row", { name: /Verhuur Van Damme/ });
    expect(within(rij).getByRole("link", { name: "Kerkstraat 12, 9400 Ninove" })).toBeInTheDocument();
  });
});
