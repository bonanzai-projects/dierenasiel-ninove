// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { VetInspectionReport } from "@/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/actions/vet-inspection-reports", () => ({
  signVetInspectionReport: vi.fn(),
  deleteVetInspectionReport: vi.fn(),
}));

import InspectionReportView from "./InspectionReportView";

const rapport = {
  id: 7,
  visitDate: "2026-09-01",
  vetName: "Dr. Peeters",
  vetSignature: false,
  signedAt: null,
  animalsTreated: [],
  animalsEuthanized: [],
  abnormalBehavior: [],
  recommendations: null,
} as unknown as VetInspectionReport;

// Story 10.71 — Sven: de PDF "visualiseren in programma en niet downloaden".

describe("InspectionReportView — PDF (Story 10.71)", () => {
  it("downloadt niet meer rechtstreeks", () => {
    render(<InspectionReportView report={rapport} />);
    expect(screen.queryByRole("link", { name: "PDF downloaden" })).toBeNull();
  });

  it("toont de PDF in een venster, met de mogelijkheid om toch te downloaden", () => {
    render(<InspectionReportView report={rapport} />);
    fireEvent.click(screen.getByRole("button", { name: "PDF bekijken" }));

    const venster = screen.getByRole("dialog");
    expect(venster.querySelector("iframe")?.getAttribute("src")).toBe("/api/rapporten/bezoekrapport/7/pdf");
    expect(screen.getByRole("link", { name: "Downloaden" })).toHaveAttribute(
      "href",
      "/api/rapporten/bezoekrapport/7/pdf?download=1",
    );
  });
});
