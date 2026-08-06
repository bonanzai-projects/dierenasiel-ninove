import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import DraaiboekPdf from "./DraaiboekPdf";
import {
  buildDraaiboekPrint,
  type DraaiboekPrintTask,
} from "@/lib/events/draaiboek-print";

/**
 * Story 13.4 — regressie-guard: bewaakt dat het draaiboek effectief rendert.
 * @react-pdf faalt met een 500 wanneer een fontFamily/fontStyle-combinatie niet
 * oplosbaar is (zie Story 10.27), en dat merk je anders pas in productie.
 */

const evenement = {
  name: "Eetfestijn 2026",
  type: "eetfestijn",
  date: "2026-11-14",
  endDate: "2026-11-15",
  startTime: null,
  endTime: null,
  location: "Parochiezaal Denderwindeke",
  responsible: "Sven",
  expectedVisitors: 300,
  description: "Zaal open vanaf 17u, warme keuken tot 21u.",
};

const taken: DraaiboekPrintTask[] = [
  {
    id: 1,
    phase: "voorbereiding",
    date: "2026-06-01",
    time: null,
    title: "Sponsors zoeken en aanspreken",
    responsible: "Sven",
    notes: "lijst van vorig jaar hergebruiken",
    sortOrder: 0,
    done: true,
  },
  {
    id: 2,
    phase: "dag-zelf",
    date: "2026-11-14",
    time: "16:00",
    title: "Zaal openen",
    responsible: "Katrien",
    notes: null,
    sortOrder: 0,
    done: false,
  },
  {
    id: 3,
    phase: "evaluatie",
    date: null,
    time: null,
    title: "Cijfers opvragen bij Peter",
    responsible: null,
    notes: null,
    sortOrder: 0,
    done: false,
  },
];

const shiften = [
  { id: 1, date: "2026-11-14", startTime: "16:00", endTime: "20:00", post: "Bar", personName: "Katrien", sortOrder: 0 },
  { id: 2, date: "2026-11-14", startTime: null, endTime: null, post: "Kassa", personName: "Martine", sortOrder: 0 },
  { id: 3, date: "2026-11-15", startTime: "22:00", endTime: null, post: "Afbraak", personName: "Peter", sortOrder: 0 },
];

describe("DraaiboekPdf", () => {
  it("rendert een gevuld draaiboek met shiften naar een PDF", async () => {
    const model = buildDraaiboekPrint({
      event: evenement,
      tasks: taken,
      shifts: shiften,
      afgedruktOp: "06/08/2026",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(createElement(DraaiboekPdf, { model }) as any);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  }, 20000);

  it("rendert ook een leeg draaiboek zonder te breken", async () => {
    const model = buildDraaiboekPrint({
      event: { ...evenement, location: null, responsible: null, expectedVisitors: null, description: null },
      tasks: [],
      afgedruktOp: "06/08/2026",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(createElement(DraaiboekPdf, { model }) as any);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  }, 20000);
});
