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

// Story 10.81 — de volledige gegevens van de dierenarts uit de lijst.
describe("InspectionReportView — dierenarts (Story 10.81)", () => {
  const fiche = {
    name: "Dr. Peeters", practice: "Dierenkliniek De Dender", street: "Kerkstraat", houseNumber: "12",
    postalCode: "9400", city: "Ninove", phone: "054 12 34 56", mobile: null, email: "info@dedender.be",
    orderNumber: "N1234", notes: "komt op dinsdag",
  };

  it("toont praktijk, adres, telefoon, e-mail en ordenummer onder de naam", () => {
    render(<InspectionReportView report={rapport} veterinarian={fiche} />);
    const blok = screen.getByText("Dierenarts").parentElement!;
    expect(blok).toHaveTextContent("Dr. Peeters");
    expect(blok).toHaveTextContent("Dierenkliniek De Dender");
    expect(blok).toHaveTextContent("Kerkstraat 12, 9400 Ninove");
    expect(blok).toHaveTextContent("054 12 34 56");
    expect(blok).toHaveTextContent("info@dedender.be");
    expect(blok).toHaveTextContent("Ordenummer: N1234");
    expect(blok).not.toHaveTextContent("komt op dinsdag");
  });

  it("toont enkel de naam bij een getypte dierenarts", () => {
    render(<InspectionReportView report={rapport} veterinarian={null} />);
    const blok = screen.getByText("Dierenarts").parentElement!;
    expect(blok).toHaveTextContent(/^DierenartsDr\. Peeters$/);
  });
});
