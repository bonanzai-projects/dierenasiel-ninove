// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SupplierContact from "./SupplierContact";

// Story 13.16 — gsm, mail en website van een leverancier, klikbaar onder een regel.

describe("SupplierContact", () => {
  it("toont gsm, mail en website als links", () => {
    render(
      <SupplierContact
        supplier={{ phone: "0470 12 34 56", email: "info@deryck.be", website: "https://www.deryck.be" }}
      />,
    );
    expect(screen.getByRole("link", { name: "0470 12 34 56" })).toHaveAttribute("href", "tel:0470123456");
    expect(screen.getByRole("link", { name: "info@deryck.be" })).toHaveAttribute(
      "href",
      "mailto:info@deryck.be",
    );
    const site = screen.getByRole("link", { name: "www.deryck.be" });
    expect(site).toHaveAttribute("href", "https://www.deryck.be");
    expect(site).toHaveAttribute("target", "_blank");
    expect(site.getAttribute("rel")).toContain("noopener");
  });

  it("toont het adres als link naar Google Maps (Story 13.18)", () => {
    render(
      <SupplierContact
        supplier={{
          phone: null,
          email: null,
          website: null,
          street: "Kerkstraat",
          houseNumber: "12",
          postalCode: "9400",
          city: "Ninove",
        }}
      />,
    );
    const adres = screen.getByRole("link", { name: "Kerkstraat 12, 9400 Ninove" });
    expect(adres).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Kerkstraat%2012%2C%209400%20Ninove",
    );
    expect(adres).toHaveAttribute("target", "_blank");
    expect(adres.getAttribute("rel")).toContain("noopener");
  });

  it("toont niets zonder leverancier of zonder gegevens", () => {
    const { container, rerender } = render(<SupplierContact supplier={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SupplierContact supplier={{ phone: null, email: null, website: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
