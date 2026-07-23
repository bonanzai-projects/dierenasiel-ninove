import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import BehaviorReportPdf from "./BehaviorReportPdf";
import type { BehaviorRecord, Animal } from "@/types";

// Story 10.27: regressie-guard — bewaakt dat de PDF effectief rendert (o.a. dat
// alle gebruikte fontFamily/fontStyle-combinaties oplosbaar zijn in @react-pdf).

const animal: Pick<Animal, "id" | "name" | "species" | "breed" | "dossierNr" | "identificationNr" | "intakeDate"> = {
  id: 300,
  name: "Rex",
  species: "hond",
  breed: "Labrador",
  dossierNr: "157/004",
  identificationNr: "BE123456789",
  intakeDate: "2026-01-05",
};

const records: BehaviorRecord[] = [
  {
    id: 1,
    animalId: 300,
    date: "2026-01-10",
    checklist: {
      verzorgers_algemeenAgressief: false,
      verzorgers_speeltGraag: true,
      verzorgers_andere: "rustig",
      honden_algemeenAgressief: false,
      honden_speeltGraag: true,
      honden_andere: null,
    },
    notes: "Eerste evaluatie",
    recordedBy: 1,
    createdAt: new Date("2026-01-10"),
  } as BehaviorRecord,
];

async function render(recs: BehaviorRecord[], caregivers: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(BehaviorReportPdf, {
    animal,
    records: recs,
    caregivers,
    generatedAt: "8 juni 2026",
  }) as any;
  return renderToBuffer(element);
}

describe("BehaviorReportPdf", () => {
  it("renders a non-empty PDF buffer with records", async () => {
    const buffer = await render(records, ["Sven Vanderrusten", "Martine Van Den Steen"]);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1", 0, 5)).toBe("%PDF-");
  });

  it("renders the empty-template variant (no records, no caregivers)", async () => {
    const buffer = await render([], []);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1", 0, 5)).toBe("%PDF-");
  });

  // Story 10.28: zonder de max-3-limiet kan een langverblijver veel evaluaties
  // hebben — de matrix wordt dan over meerdere blokken verdeeld.
  // Ruimere timeout: het renderen van meerdere matrix-blokken duurt onder
  // parallelle test-load meer dan de standaard 5s.
  it("renders a long stay with more records than fit in one matrix block", async () => {
    const many: BehaviorRecord[] = Array.from({ length: 14 }, (_, i) => ({
      ...records[0],
      id: i + 1,
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    })) as BehaviorRecord[];

    const buffer = await render(many, ["Sven Vanderrusten"]);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1", 0, 5)).toBe("%PDF-");
  }, 30000);
});
