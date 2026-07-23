// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WorkflowInfo from "./WorkflowInfo";
import { WORKFLOW_PHASES } from "@/lib/workflow/phases";
import { PHASE_LABELS } from "@/lib/workflow/stepbar";

describe("WorkflowInfo", () => {
  // De faselijst wordt uit dezelfde constanten opgebouwd als de motor, dus dit
  // is meteen het vangnet: komt er ooit een fase bij, dan groeit de uitleg mee.
  function phaseList() {
    return within(screen.getByRole("list", { name: "Workflow-fases" }));
  }

  it("toont alle workflow-fases uit de motor zelf, in volgorde", () => {
    render(<WorkflowInfo />);

    const shown = phaseList()
      .getAllByRole("listitem")
      .map((li) => li.textContent?.replace("→", "").trim());

    expect(shown).toEqual(WORKFLOW_PHASES.map((p) => PHASE_LABELS[p]));
  });

  it("legt de drie schakelaars uit", () => {
    render(<WorkflowInfo />);

    expect(screen.getByText(/Workflow ingeschakeld/)).toBeInTheDocument();
    expect(screen.getByText(/Stappenbalk zichtbaar/)).toBeInTheDocument();
    expect(screen.getByText(/Automatische acties/)).toBeInTheDocument();
  });

  it("vermeldt dat een waarschuwing niet blokkeert maar een reden vraagt", () => {
    render(<WorkflowInfo />);
    expect(screen.getByText(/blokkeert/)).toBeInTheDocument();
    expect(screen.getByText(/een reden opgeven/)).toBeInTheDocument();
  });
});
