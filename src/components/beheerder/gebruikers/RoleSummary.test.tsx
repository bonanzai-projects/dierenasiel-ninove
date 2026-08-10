// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RoleSummary from "./RoleSummary";

describe("RoleSummary", () => {
  it("toont niets zonder gekozen rol", () => {
    const { container } = render(<RoleSummary role="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("toont niets voor een onbekende rol", () => {
    const { container } = render(<RoleSummary role="tuinman" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("noemt wat een medewerker mag", () => {
    render(<RoleSummary role="medewerker" />);
    expect(screen.getByText(/Medewerker mag:/)).toBeInTheDocument();
    expect(screen.getByText(/Dieren \(bekijken en bewerken\)/)).toBeInTheDocument();
  });

  it("noemt uitdrukkelijk wat een medewerker niet mag", () => {
    render(<RoleSummary role="medewerker" />);
    const niet = screen.getByText(/^Niet:/).parentElement?.textContent ?? "";
    expect(niet).toContain("Evenementen");
    expect(niet).toContain("Gebruikers");
  });

  it("zegt bij de beheerder dat alles toegankelijk is", () => {
    render(<RoleSummary role="beheerder" />);
    expect(screen.getByText(/toegang tot alles/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Niet:/)).toBeNull();
  });

  it("toont voor een dierenarts enkel het medische deel", () => {
    render(<RoleSummary role="dierenarts" />);
    const mag = screen.getByText(/Dierenarts mag:/).parentElement?.textContent ?? "";
    expect(mag).toContain("Medisch dossier");
    expect(mag).not.toContain("Adopties (");
  });
});
