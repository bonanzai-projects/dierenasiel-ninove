// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";

vi.mock("@/components/ui/AnimateOnScroll", () => ({
  default: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

import WandelreglementPage from "./page";

// Story 10.77 — de publieke pagina toont dezelfde, nieuwe versie van het reglement.

describe("/wandelreglement", () => {
  it("toont Sven's versie van 5 mei 2026", () => {
    render(<WandelreglementPage />);
    expect(screen.getByText("Versie van 5 mei 2026")).toBeInTheDocument();
    expect(screen.getByText(/starten tussen 10 en 10u45/)).toBeInTheDocument();
    expect(screen.getByText(/wandelkaart onmiddellijk worden ingetrokken/)).toBeInTheDocument();
    expect(screen.queryByText(/11u30/)).toBeNull();
  });
});
