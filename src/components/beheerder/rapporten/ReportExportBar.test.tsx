// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("van=2026-01-01&tot=2026-09-13"),
}));

import ReportExportBar from "./ReportExportBar";

// Story 10.71 — R11 toont zijn PDF in het programma; de andere rapporten blijven zoals ze zijn.

describe("ReportExportBar", () => {
  it("zonder viewInApp: blijft de gewone link 'PDF Export' (andere rapporten)", () => {
    render(<ReportExportBar pdfUrl="/api/rapporten/kennels/pdf" filenamePrefix="kennelbezetting" />);

    expect(screen.getByRole("link", { name: /PDF Export/ })).toHaveAttribute(
      "href",
      "/api/rapporten/kennels/pdf?van=2026-01-01&tot=2026-09-13",
    );
    expect(screen.queryByRole("button", { name: /PDF bekijken/ })).toBeNull();
  });

  it("met viewInApp: opent de PDF in een venster, met de gekozen datums", () => {
    render(
      <ReportExportBar
        pdfUrl="/api/rapporten/bezoekrapporten/pdf"
        filenamePrefix="bezoekrapporten"
        viewInApp
        pdfTitle="R11 — Bezoekrapporten contractdierenarts"
      />,
    );

    expect(screen.queryByRole("link", { name: /PDF Export/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /PDF bekijken/ }));

    const venster = screen.getByRole("dialog", { name: "R11 — Bezoekrapporten contractdierenarts" });
    expect(venster.querySelector("iframe")?.getAttribute("src")).toBe(
      "/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13",
    );
    expect(screen.getByRole("link", { name: "Downloaden" })).toHaveAttribute(
      "href",
      "/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13&download=1",
    );
  });
});
