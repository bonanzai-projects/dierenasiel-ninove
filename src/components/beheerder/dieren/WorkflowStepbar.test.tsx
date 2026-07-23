// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WorkflowStepbar from "./WorkflowStepbar";
import { WORKFLOW_PHASES } from "@/lib/workflow/phases";
import { PHASE_LABELS } from "@/lib/workflow/stepbar";
import { getPhaseDescription } from "@/lib/workflow/phase-descriptions";

vi.mock("@/lib/actions/workflow", () => ({
  transitionAnimalPhase: vi.fn(),
}));

function renderBar(species = "hond", currentPhase = "intake") {
  return render(
    <WorkflowStepbar
      currentPhase={currentPhase}
      animalId={310}
      animalName="Thor"
      animalSpecies={species}
      todos={[]}
    />,
  );
}

/** De tooltip die bij een fase-bolletje hoort. */
function tooltipFor(phaseLabel: string) {
  const heading = screen.getByText(new RegExp(`Om in «${phaseLabel}» te geraken`));
  return heading.closest("[role='tooltip']") as HTMLElement;
}

describe("WorkflowStepbar — toegangsvoorwaarden per fase (hover)", () => {
  it("toont bij elke fase een tooltip", () => {
    renderBar();
    expect(screen.getAllByRole("tooltip")).toHaveLength(6);
  });

  it("meldt bij 'Verblijf' dat de chip geregistreerd moet zijn", () => {
    renderBar();
    expect(
      within(tooltipFor("Verblijf")).getByText("Chip-/identificatienummer is geregistreerd"),
    ).toBeInTheDocument();
  });

  it("toont voor een kat de drie wettelijke voorwaarden vóór 'Adoptie'", () => {
    renderBar("kat");
    const tooltip = within(tooltipFor("Adoptie"));

    expect(tooltip.getByText("Chip-/identificatienummer is geregistreerd")).toBeInTheDocument();
    expect(tooltip.getByText("Vaccinatie is toegediend")).toBeInTheDocument();
    expect(tooltip.getByText("Sterilisatie/castratie is uitgevoerd")).toBeInTheDocument();
  });

  it("toont die kattenvoorwaarden niet bij een hond", () => {
    renderBar("hond");
    expect(
      within(tooltipFor("Adoptie")).getByText(/Geen voorwaarden/),
    ).toBeInTheDocument();
  });

  it("meldt bij 'Afgerond' dat er een adoptiecontract moet zijn", () => {
    renderBar();
    expect(
      within(tooltipFor("Afgerond")).getByText("Adoptiecontract is opgemaakt"),
    ).toBeInTheDocument();
  });

  it("legt bij elke fase ook kort uit waar die over gaat", () => {
    renderBar();

    for (const phase of WORKFLOW_PHASES) {
      const label = PHASE_LABELS[phase];
      expect(
        within(tooltipFor(label)).getByText(getPhaseDescription(phase)),
      ).toBeInTheDocument();
    }
  });

  it("meldt expliciet wanneer een fase geen voorwaarden heeft", () => {
    renderBar();
    expect(within(tooltipFor("Intake")).getByText(/Geen voorwaarden/)).toBeInTheDocument();
    expect(within(tooltipFor("Registratie")).getByText(/Geen voorwaarden/)).toBeInTheDocument();
  });
});
