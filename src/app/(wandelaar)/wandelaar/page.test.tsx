// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const h = vi.hoisted(() => ({
  mockGetSession: vi.fn(), mockGetWalker: vi.fn(), mockGetDogs: vi.fn(), mockGetWalks: vi.fn(), mockGetWalkDays: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/queries/walks", () => ({
  getWalkerByUserId: h.mockGetWalker,
  getDogsAvailableForWalking: h.mockGetDogs,
  getWalksByWalkerId: h.mockGetWalks,
}));
vi.mock("@/lib/queries/shelter-settings", () => ({ getWalkDays: h.mockGetWalkDays }));
vi.mock("@/lib/actions/walkers", () => ({ acceptWalkRegulations: vi.fn() }));
vi.mock("@/components/wandelaar/AvailableDogsGrid", () => ({ default: () => <div>honden-om-te-wandelen</div> }));
vi.mock("@/components/wandelaar/MyWalksSection", () => ({ default: () => <div>mijn-wandelingen</div> }));
vi.mock("@/components/wandelaar/WalkerNotApprovedMessage", () => ({ default: () => <div>nog-niet-goedgekeurd</div> }));
vi.mock("@/components/layout/LogoutButton", () => ({ default: () => <button type="button">Afmelden</button> }));

import WandelaarDashboard from "./page";

// Story 10.77 — zonder akkoord met het huidige reglement geen honden en geen boekingen.

const wandelaar = { id: 1, userId: 99, firstName: "Jan", status: "approved", regulationsRead: true, regulationsVersion: "2026-05-05" };

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetSession.mockResolvedValue({ userId: 99, role: "wandelaar", email: "jan@example.com", name: "Jan" });
  h.mockGetDogs.mockResolvedValue([]);
  h.mockGetWalks.mockResolvedValue([]);
  h.mockGetWalkDays.mockResolvedValue([1, 3, 5, 6]);
});

async function toon() {
  render(await WandelaarDashboard());
}

describe("WandelaarDashboard", () => {
  it("toont eerst het reglement als de huidige versie nog niet aanvaard is", async () => {
    h.mockGetWalker.mockResolvedValue({ ...wandelaar, regulationsVersion: null });
    await toon();
    expect(screen.getByRole("button", { name: "Ik heb het wandelreglement gelezen en ga akkoord" })).toBeInTheDocument();
    expect(screen.getByText(/Het wandelreglement werd aangepast/)).toBeInTheDocument();
    expect(screen.queryByText("honden-om-te-wandelen")).toBeNull();
    expect(screen.queryByText("mijn-wandelingen")).toBeNull();
    expect(screen.getByRole("button", { name: "Afmelden" })).toBeInTheDocument();
  });

  it("toont de honden en wandelingen na akkoord", async () => {
    h.mockGetWalker.mockResolvedValue(wandelaar);
    await toon();
    expect(screen.getByText("honden-om-te-wandelen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ga akkoord/ })).toBeNull();
  });

  it("toont nog steeds 'niet goedgekeurd' voor wie nog niet goedgekeurd is", async () => {
    h.mockGetWalker.mockResolvedValue({ ...wandelaar, status: "pending", regulationsVersion: null });
    await toon();
    expect(screen.getByText("nog-niet-goedgekeurd")).toBeInTheDocument();
  });
});
