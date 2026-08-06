/**
 * Epic 13, story 13.9 — de evaluatie na afloop.
 *
 * Sven, vraag 23 (2026-08-06): *"Voorlopig ik omdat ik dit belangrijk vind om uit te
 * leren en te groeien"*. Vraag 24: een verslag voor het bestuur hoeft niet — "bestuur
 * is martine en katrien".
 *
 * Vraag 22 verklaart de cijfers: het bezoekersaantal komt uit een Excel van Peter;
 * *"Kan ook zien hoeveel kaarten er gebruikt worden op het eetfestijn. Aantal betalende
 * borden en opbrengst wordt zo berekend."* Daarom precies díé drie getallen.
 *
 * Pure logica, geen database.
 */
import { formatAmount, summarizeCosts, type CostAmounts } from "./costs";

export interface EvaluationNumbers {
  visitors: number | null;
  ticketsUsed: number | null;
  paidPlates: number | null;
}

export interface EvaluationTexts {
  wentWell: string | null;
  couldBeBetter: string | null;
  agreements: string | null;
}

export interface EvaluationInputs {
  costs: readonly CostAmounts[];
  shiftCount: number;
  tasksDone: number;
  tasksTotal: number;
  evaluation: EvaluationNumbers | null;
}

export interface EvaluationFigure {
  label: string;
  waarde: string;
}

/** Opbrengst per betalend bord — het cijfer om edities mee te vergelijken. */
export function perPlate(revenue: number, plates: number | null): number | null {
  if (!plates || plates <= 0) return null;
  return Math.round((revenue / plates) * 100) / 100;
}

/**
 * De cijfers die vanzelf uit de fiche volgen, plus wat Sven zelf invulde.
 *
 * Wat niemand ingevuld heeft, valt weg in plaats van als nul te verschijnen:
 * "0 bezoekers" is geen meting maar een leeg veld, en dat verschil telt wanneer je
 * volgend jaar terugkijkt.
 */
export function evaluationFigures({
  costs,
  shiftCount,
  tasksDone,
  tasksTotal,
  evaluation,
}: EvaluationInputs): EvaluationFigure[] {
  const totalen = summarizeCosts(costs);
  const cijfers: EvaluationFigure[] = [
    { label: "Netto-resultaat", waarde: formatAmount(totalen.netto.werkelijk) },
  ];

  if (evaluation?.visitors) {
    cijfers.push({ label: "Bezoekers", waarde: String(evaluation.visitors) });
  }
  if (evaluation?.ticketsUsed) {
    cijfers.push({ label: "Kaarten gebruikt", waarde: String(evaluation.ticketsUsed) });
  }
  if (evaluation?.paidPlates) {
    cijfers.push({ label: "Betalende borden", waarde: String(evaluation.paidPlates) });

    const perBord = perPlate(totalen.opbrengsten.werkelijk, evaluation.paidPlates);
    if (perBord !== null) {
      cijfers.push({ label: "Opbrengst per bord", waarde: formatAmount(perBord) });
    }
  }

  if (shiftCount > 0) {
    cijfers.push({ label: "Vrijwilligersshiften", waarde: String(shiftCount) });
  }
  if (tasksTotal > 0) {
    cijfers.push({ label: "Draaiboek", waarde: `${tasksDone} van ${tasksTotal}` });
  }

  return cijfers;
}

/** Staat er iets in de evaluatie, of is ze nog leeg? */
export function hasEvaluationContent(
  evaluation: (EvaluationNumbers & EvaluationTexts) | null,
): boolean {
  if (!evaluation) return false;
  const getallen = [evaluation.visitors, evaluation.ticketsUsed, evaluation.paidPlates];
  if (getallen.some((g) => g !== null && g !== undefined)) return true;
  const teksten = [evaluation.wentWell, evaluation.couldBeBetter, evaluation.agreements];
  return teksten.some((t) => (t ?? "").trim() !== "");
}
