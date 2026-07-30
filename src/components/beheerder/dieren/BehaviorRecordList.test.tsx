// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BehaviorRecordList from "./BehaviorRecordList";
import type { BehaviorRecordWithRecorder } from "@/types";

const fiche = (over: Partial<BehaviorRecordWithRecorder> = {}): BehaviorRecordWithRecorder =>
  ({
    id: 1,
    animalId: 300,
    date: "2026-06-08",
    checklist: { verzorgers_algemeenAgressief: false, verzorgers_speeltGraag: true },
    notes: null,
    recordedBy: 20,
    recordedByName: "Sven",
    createdAt: new Date("2026-06-08"),
    ...over,
  }) as BehaviorRecordWithRecorder;

describe("BehaviorRecordList", () => {
  it("toont wie de fiche invulde", () => {
    render(<BehaviorRecordList records={[fiche()]} />);
    expect(screen.getByText(/Ingevuld door Sven/)).toBeInTheDocument();
  });

  it("toont niets over de invuller wanneer die onbekend is", () => {
    render(<BehaviorRecordList records={[fiche({ recordedBy: null, recordedByName: null })]} />);
    expect(screen.queryByText(/Ingevuld door/)).not.toBeInTheDocument();
  });

  it("toont nog altijd de datum van de fiche", () => {
    render(<BehaviorRecordList records={[fiche()]} />);
    expect(screen.getByText("2026-06-08")).toBeInTheDocument();
  });

  it("meldt het wanneer er nog geen fiches zijn", () => {
    render(<BehaviorRecordList records={[]} />);
    expect(screen.getByText(/Nog geen gedragsfiches/)).toBeInTheDocument();
  });
});
