// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
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

// Story 10.56: bewaarde coördinaten gaan vóór op een zoekterm — Google hoeft
// dan niets meer op te zoeken en kan er dus niet meer naast grijpen.
describe("AddressMap met bewaarde ligging", () => {
  const ligging = {
    lat: "50.782315",
    lng: "4.117176",
    geocodedAddress: "Bosstraat 32A, 1755 Pajottegem",
    geocodeMatch: "huisnummer" as const,
  };

  it("toont de kaart op de bewaarde coördinaten", () => {
    render(<AddressMap address="Bosstraat 32A Leerbeek" municipality="Pajottegem Gooik/ Herne" lookup={ligging} />);

    const frame = screen.getByTitle(/kaart/i);
    expect(frame).toHaveAttribute("src", expect.stringContaining("q=50.782315%2C4.117176"));
    expect(frame).toHaveAttribute("src", expect.not.stringContaining("Bosstraat"));
  });

  it("laat de link naar Google Maps ook naar die coördinaten wijzen", () => {
    render(<AddressMap address="Bosstraat 32A Leerbeek" municipality="Pajottegem" lookup={ligging} />);

    expect(screen.getByRole("link", { name: /openen in google maps/i })).toHaveAttribute(
      "href",
      expect.stringContaining("50.782315%2C4.117176"),
    );
  });

  it("bevestigt het gevonden adres", () => {
    render(<AddressMap address="Bosstraat 32A Leerbeek" municipality="Pajottegem" lookup={ligging} />);
    expect(screen.getByText(/Bosstraat 32A, 1755 Pajottegem/)).toBeInTheDocument();
  });

  it("waarschuwt wanneer enkel de straat gevonden is", () => {
    render(
      <AddressMap
        address="Dorpsstraat"
        municipality="Laarne"
        lookup={{ ...ligging, geocodeMatch: "straat", geocodedAddress: "Dorpsstraat, Laarne" }}
      />,
    );
    expect(screen.getByText(/bij benadering/i)).toBeInTheDocument();
  });

  it("waarschuwt wanneer het adres niet gevonden is, en valt terug op de zoekterm", () => {
    render(
      <AddressMap
        address="hdorpstraat 151200 Laarne"
        municipality="Laarne"
        lookup={{ lat: null, lng: null, geocodedAddress: null, geocodeMatch: null }}
      />,
    );

    expect(screen.getByText(/niet teruggevonden/i)).toBeInTheDocument();
    expect(screen.getByTitle(/kaart/i)).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("hdorpstraat 151200 Laarne")),
    );
  });

  it("zwijgt over de opzoeking zolang er nog niet opgeslagen is", () => {
    render(<AddressMap address="Bosstraat 32A" municipality="Ninove" />);
    expect(screen.queryByText(/adressenregister/i)).toBeNull();
  });
});
