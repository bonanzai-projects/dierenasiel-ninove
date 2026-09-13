// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PdfViewerButton from "./PdfViewer";

// Story 10.71 — een PDF bekijken in het programma, met de mogelijkheid om toch te downloaden.

function toonKnop(src = "/api/rapporten/bezoekrapport/7/pdf") {
  render(
    <PdfViewerButton src={src} title="Bezoekrapport 2026-09-01">
      Bekijken
    </PdfViewerButton>,
  );
}

describe("PdfViewerButton", () => {
  it("toont niets van de PDF zolang er niet geklikt is", () => {
    toonKnop();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("opent de PDF in een venster in het programma", () => {
    toonKnop();
    fireEvent.click(screen.getByRole("button", { name: "Bekijken" }));

    const venster = screen.getByRole("dialog", { name: "Bezoekrapport 2026-09-01" });
    const pdf = venster.querySelector("iframe") as HTMLIFrameElement;
    expect(pdf).not.toBeNull();
    expect(pdf.getAttribute("src")).toBe("/api/rapporten/bezoekrapport/7/pdf");
    expect(pdf).toHaveAttribute("title", "Bezoekrapport 2026-09-01");
  });

  it("biedt een knop om toch te downloaden", () => {
    toonKnop();
    fireEvent.click(screen.getByRole("button", { name: "Bekijken" }));

    expect(screen.getByRole("link", { name: "Downloaden" })).toHaveAttribute(
      "href",
      "/api/rapporten/bezoekrapport/7/pdf?download=1",
    );
  });

  it("behoudt de zoekparameters bij downloaden", () => {
    toonKnop("/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13");
    fireEvent.click(screen.getByRole("button", { name: "Bekijken" }));

    expect(screen.getByRole("link", { name: "Downloaden" })).toHaveAttribute(
      "href",
      "/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13&download=1",
    );
  });

  it("sluit met de knop Sluiten", () => {
    toonKnop();
    fireEvent.click(screen.getByRole("button", { name: "Bekijken" }));
    fireEvent.click(screen.getByRole("button", { name: "Sluiten" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sluit met Escape", () => {
    toonKnop();
    fireEvent.click(screen.getByRole("button", { name: "Bekijken" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
