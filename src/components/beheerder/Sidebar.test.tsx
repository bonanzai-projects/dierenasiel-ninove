// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Sidebar from "./Sidebar";
import type { NavItem } from "@/lib/navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/beheerder" }));

const items: NavItem[] = [
  { label: "Dashboard", href: "/beheerder", icon: "🏠", requiredPermission: null },
  { label: "Dieren", href: "/beheerder/dieren", icon: "🐾", requiredPermission: "animal:read" },
];

describe("Sidebar", () => {
  it("toont de navigatie-items", () => {
    render(<Sidebar items={items} />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dieren/ })).toBeInTheDocument();
  });

  it("bevat geen uitlogknop meer — uitloggen zit in het accountmenu rechtsboven", () => {
    render(<Sidebar items={items} />);
    expect(screen.queryByRole("button", { name: /Uitloggen/ })).not.toBeInTheDocument();
  });
});
