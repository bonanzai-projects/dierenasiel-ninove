// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import UserMenu from "./UserMenu";

const { mockLogout, mockPush } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/actions/auth", () => ({ logout: mockLogout }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockLogout.mockResolvedValue(undefined);
});

describe("UserMenu", () => {
  it("toont de naam en de rol van wie ingelogd is", () => {
    render(<UserMenu userName="Sven" userRole="beheerder" />);
    expect(screen.getByRole("button", { name: /Sven/ })).toBeInTheDocument();
    expect(screen.getByText("beheerder")).toBeInTheDocument();
  });

  it("toont de initialen van de gebruiker", () => {
    render(<UserMenu userName="Katrien Van Damme" userRole="medewerker" />);
    expect(screen.getByText("KV")).toBeInTheDocument();
  });

  it("houdt het menu dicht tot je erop klikt", () => {
    render(<UserMenu userName="Sven" userRole="beheerder" />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const knop = screen.getByRole("button", { name: /Sven/ });
    expect(knop).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(knop);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(knop).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: /Uitloggen/ })).toBeInTheDocument();
  });

  it("sluit het menu met Escape en geeft de focus terug aan de knop", () => {
    render(<UserMenu userName="Sven" userRole="beheerder" />);
    const knop = screen.getByRole("button", { name: /Sven/ });
    fireEvent.click(knop);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(knop).toHaveFocus();
  });

  it("sluit het menu wanneer je ernaast klikt", () => {
    render(<UserMenu userName="Sven" userRole="beheerder" />);
    fireEvent.click(screen.getByRole("button", { name: /Sven/ }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("blijft open wanneer je binnen het menu klikt", () => {
    render(<UserMenu userName="Sven" userRole="beheerder" />);
    fireEvent.click(screen.getByRole("button", { name: /Sven/ }));

    fireEvent.mouseDown(screen.getByRole("menu"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("logt uit en stuurt door naar de loginpagina", async () => {
    render(<UserMenu userName="Sven" userRole="beheerder" />);
    fireEvent.click(screen.getByRole("button", { name: /Sven/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Uitloggen/ }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });
});
