// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { mockAccept, mockRefresh } = vi.hoisted(() => ({ mockAccept: vi.fn(), mockRefresh: vi.fn() }));
vi.mock("@/lib/actions/walkers", () => ({ acceptWalkRegulations: mockAccept }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

import WalkRegulationsAcceptance from "./WalkRegulationsAcceptance";

// Story 10.77 — vóór de eerste (of volgende) wandeling het huidige reglement aanvaarden.

beforeEach(() => {
  vi.clearAllMocks();
  mockAccept.mockReset();
});

describe("WalkRegulationsAcceptance", () => {
  it("toont het volledige reglement met de versie", () => {
    render(<WalkRegulationsAcceptance hadOlderVersion={false} />);
    expect(screen.getByRole("heading", { name: "Wandelen: reglement en uren van het asiel" })).toBeInTheDocument();
    expect(screen.getByText("Versie van 5 mei 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(18);
    expect(screen.getByText(/starten tussen 10 en 10u45/)).toBeInTheDocument();
  });

  it("zegt dat het reglement aangepast werd als er al een oudere versie aanvaard was", () => {
    render(<WalkRegulationsAcceptance hadOlderVersion />);
    expect(screen.getByText(/Het wandelreglement werd aangepast/)).toBeInTheDocument();
  });

  it("bewaart het akkoord en ververst de pagina", async () => {
    mockAccept.mockResolvedValue({ success: true, data: undefined });
    render(<WalkRegulationsAcceptance hadOlderVersion={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Ik heb het wandelreglement gelezen en ga akkoord" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockAccept).toHaveBeenCalledTimes(1);
  });

  it("toont een fout als het akkoord niet bewaard kon worden", async () => {
    mockAccept.mockResolvedValue({ success: false, error: "Wandelaar profiel niet gevonden." });
    render(<WalkRegulationsAcceptance hadOlderVersion={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Ik heb het wandelreglement gelezen en ga akkoord" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Wandelaar profiel niet gevonden."));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
