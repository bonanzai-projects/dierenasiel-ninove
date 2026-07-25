// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AddressMap from "./AddressMap";

describe("AddressMap", () => {
  it("toont een kaartje voor het opgegeven adres", () => {
    render(<AddressMap address="Brusselsesteenweg 1" municipality="Ninove" />);

    const frame = screen.getByTitle(/kaart/i);
    expect(frame).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("Brusselsesteenweg 1, Ninove, België")),
    );
    expect(frame).toHaveAttribute("src", expect.stringContaining("output=embed"));
  });

  it("toont een link om het adres in Google Maps te openen", () => {
    render(<AddressMap address="Brusselsesteenweg 1" municipality="Ninove" />);

    const link = screen.getByRole("link", { name: /openen in google maps/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("google.com/maps/search/"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("toont een hint i.p.v. een lege kaart zolang er geen adres is", () => {
    render(<AddressMap address="" municipality="Ninove" />);

    expect(screen.queryByTitle(/kaart/i)).toBeNull();
    expect(screen.getByText(/vul een adres in/i)).toBeInTheDocument();
  });
});
