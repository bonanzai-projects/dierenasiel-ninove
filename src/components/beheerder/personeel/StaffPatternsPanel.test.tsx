// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { StaffPattern } from "@/lib/staff/patterns";

const h = vi.hoisted(() => ({ mockCreate: vi.fn(), mockStop: vi.fn() }));
vi.mock("@/lib/actions/staff-patterns", () => ({ createStaffPattern: h.mockCreate, stopStaffPattern: h.mockStop }));

import StaffPatternsPanel from "./StaffPatternsPanel";

// Story 14.8 — Sven: "ja dat herhaalt zich maar soms ook niet (verlof)".

const patroon = (over: Partial<StaffPattern> & { id: number }): StaffPattern => ({
  userId: 21,
  userName: "Katrien",
  userRole: "medewerker",
  weekday: 1,
  startTime: "08:00",
  endTime: "12:00",
  task: null,
  validFrom: "2026-09-01",
  validUntil: null,
  ...over,
});

const lijst = [
  patroon({ id: 3 }),
  patroon({ id: 4, userId: 30, userName: "Els Wandel", userRole: "wandelaar", weekday: 7, startTime: null, endTime: null, task: "Kuis honden", validFrom: "2026-10-04" }),
];

const mensen = [
  { userId: 20, name: "Sven", group: "team" as const },
  { userId: 21, name: "Katrien", group: "team" as const },
  { userId: 30, name: "Els Wandel", group: "wandelaar" as const },
];

function toon(props: Partial<Parameters<typeof StaffPatternsPanel>[0]> = {}) {
  return render(
    <StaffPatternsPanel patterns={lijst} today="2026-09-28" currentUserId={21} mayManageOthers={false} people={[]} {...props} />,
  );
}

beforeEach(() => {
  h.mockCreate.mockReset().mockResolvedValue({ success: true, data: undefined, message: "Bewaard." });
  h.mockStop.mockReset().mockResolvedValue({ success: true, data: undefined, message: "Vast moment gestopt." });
});

describe("StaffPatternsPanel", () => {
  it("toont elk vast moment met wie, wanneer en sinds wanneer", () => {
    toon();
    const katrien = screen.getByText("Katrien").closest("li")!;
    expect(katrien).toHaveTextContent("elke maandag · 08:00–12:00");
    expect(katrien).toHaveTextContent("sinds 01/09/2026");
    const els = screen.getByText("Els Wandel").closest("li")!;
    expect(els).toHaveTextContent("elke zondag · hele dag · Kuis honden");
    expect(els).toHaveTextContent("vanaf 04/10/2026");
  });

  it("legt uit wat te doen als er nog niets staat", () => {
    toon({ patterns: [] });
    expect(screen.getByText(/Nog geen vaste momenten/)).toBeInTheDocument();
  });

  it("laat je je eigen vaste moment stoppen, niet dat van een ander", () => {
    toon();
    expect(screen.getByRole("button", { name: /Stoppen: Katrien/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Stoppen: Els Wandel/ })).toBeNull();
  });

  it("laat de leiding elk vast moment stoppen", () => {
    toon({ mayManageOthers: true, people: mensen });
    expect(screen.getByRole("button", { name: /Stoppen: Els Wandel/ })).toBeInTheDocument();
  });

  it("stopt na bevestiging", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    toon();
    fireEvent.click(screen.getByRole("button", { name: /Stoppen: Katrien/ }));
    await waitFor(() => expect(h.mockStop).toHaveBeenCalled());
    expect((h.mockStop.mock.calls[0][1] as FormData).get("id")).toBe("3");
    expect(await screen.findByText("Vast moment gestopt.")).toBeInTheDocument();
  });

  it("stopt niet zonder bevestiging", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    toon();
    fireEvent.click(screen.getByRole("button", { name: /Stoppen: Katrien/ }));
    expect(h.mockStop).not.toHaveBeenCalled();
  });

  it("zet een eigen vast moment zonder personenkeuze", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "+ Vast moment toevoegen" }));
    expect(screen.queryByLabelText("Voor wie")).toBeNull();
    fireEvent.change(screen.getByLabelText("Weekdag"), { target: { value: "3" } });
    expect(screen.getByLabelText("Vanaf")).toHaveValue("2026-09-28");
    fireEvent.click(screen.getByRole("button", { name: "Bewaren" }));
    await waitFor(() => expect(h.mockCreate).toHaveBeenCalled());
    const fd = h.mockCreate.mock.calls[0][1] as FormData;
    expect(fd.get("weekday")).toBe("3");
    expect(fd.get("validFrom")).toBe("2026-09-28");
    expect(fd.get("userId")).toBeNull();
  });

  it("laat de leiding kiezen voor wie: het team of een wandelaar", () => {
    toon({ mayManageOthers: true, people: mensen });
    fireEvent.click(screen.getByRole("button", { name: "+ Vast moment toevoegen" }));
    const keuze = screen.getByLabelText("Voor wie") as HTMLSelectElement;
    expect(within(keuze).getByRole("option", { name: "Ikzelf" })).toHaveValue("");
    expect(within(keuze).getByRole("group", { name: "Team" })).toBeInTheDocument();
    expect(within(keuze).getByRole("group", { name: "Wandelaars" })).toBeInTheDocument();
    expect(within(keuze).getByRole("option", { name: "Els Wandel" })).toHaveValue("30");
  });

  it("toont de fout en houdt het formulier open", async () => {
    h.mockCreate.mockResolvedValue({ success: false, error: "Je hebt al een vast moment dat daarmee botst", values: { weekday: "1" } });
    toon();
    fireEvent.click(screen.getByRole("button", { name: "+ Vast moment toevoegen" }));
    fireEvent.change(screen.getByLabelText("Weekdag"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Bewaren" }));
    expect(await screen.findByText(/al een vast moment dat daarmee botst/)).toBeInTheDocument();
    expect(screen.getByLabelText("Weekdag")).toHaveValue("1");
  });
});
