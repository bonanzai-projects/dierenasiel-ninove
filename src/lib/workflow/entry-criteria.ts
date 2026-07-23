import { WORKFLOW_PHASES, type WorkflowPhase } from "./phases";
import { evaluateGuards } from "./guards";

/**
 * De voorwaarden om in een fase te geraken, in leesbare taal.
 *
 * Ze worden **afgeleid uit de guard-engine zelf**: we evalueren de controles van
 * de overgang naar die fase met een context waarin niets ingevuld is, zodat elke
 * controle aanslaat. De codes die terugkomen, vertalen we naar een positieve
 * formulering. Zo kan de uitleg niet uit de pas lopen met wat het systeem
 * werkelijk controleert — komt er een guard bij, dan verschijnt die vanzelf.
 */

export const ENTRY_CRITERIA_LABELS: Record<string, string> = {
  identification_missing: "Chip-/identificatienummer is geregistreerd",
  cat_chip_missing: "Chip-/identificatienummer is geregistreerd",
  cat_vaccination_missing: "Vaccinatie is toegediend",
  cat_neutering_missing: "Sterilisatie/castratie is uitgevoerd",
  adoption_contract_missing: "Adoptiecontract is opgemaakt",
};

/** De fase die aan `phase` voorafgaat, of null voor de eerste fase. */
function previousPhase(phase: WorkflowPhase): WorkflowPhase | null {
  const index = WORKFLOW_PHASES.indexOf(phase);
  return index > 0 ? WORKFLOW_PHASES[index - 1] : null;
}

/**
 * Voorwaarden om `phase` binnen te gaan. `species` bepaalt de soort-specifieke
 * controles (voor katten gelden er extra wettelijke verplichtingen); zonder
 * soort worden enkel de soort-onafhankelijke controles getoond.
 */
export function getEntryCriteria(
  phase: WorkflowPhase | string,
  species?: string,
): string[] {
  const target = phase as WorkflowPhase;
  const from = previousPhase(target);
  if (!from) return [];

  // Context waarin niets aanwezig is → elke controle slaat aan en levert
  // zo de volledige lijst voorwaarden op.
  const warnings = evaluateGuards(from, target, {
    animal: {
      id: 0,
      species: species ?? "",
      identificationNr: null,
      isNeutered: false,
    },
    hasVaccinations: false,
    hasAdoptionContract: false,
  });

  const seen = new Set<string>();
  const criteria: string[] = [];
  for (const warning of warnings) {
    const label = ENTRY_CRITERIA_LABELS[warning.code] ?? warning.message;
    if (seen.has(label)) continue;
    seen.add(label);
    criteria.push(label);
  }
  return criteria;
}
