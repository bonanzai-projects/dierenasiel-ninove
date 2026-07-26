import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import KennelCardPdf from "./KennelCardPdf";
import { buildKennelCard } from "@/lib/animals/kennel-card";

/**
 * Story 10.43 — regressie-guard: bewaakt dat de kennelkaart effectief rendert.
 * @react-pdf faalt met een 500 wanneer een fontFamily/fontStyle-combinatie niet
 * oplosbaar is (zie Story 10.27), en dat merk je anders pas in productie.
 */

const volledig = buildKennelCard({
  animal: {
    name: "Bo",
    aliasName: "Shana",
    species: "hond",
    breed: "Chow Chow",
    gender: "reu",
    isNeutered: false,
    dateOfBirth: "2024-10-27",
    intakeDate: "2026-05-06",
    weightOnArrival: "24,5",
  },
  lastVaccination: "2026-06-15",
  lastDeworming: "2026-07-01",
});

const leeg = buildKennelCard({
  animal: {
    name: "Naamloos",
    aliasName: null,
    species: null,
    breed: null,
    gender: null,
    isNeutered: null,
    dateOfBirth: null,
    intakeDate: null,
    weightOnArrival: null,
  },
  lastVaccination: null,
  lastDeworming: null,
});

describe("KennelCardPdf", () => {
  it("rendert een volledig ingevulde kaart", async () => {
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(KennelCardPdf, { kaart: volledig }) as any,
    );
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rendert ook een kaart waarvan bijna niets ingevuld is", async () => {
    // Een vers binnengebracht dier heeft vaak alleen een naam; de kaart moet dan
    // gewoon lege schrijflijnen tonen in plaats van te crashen.
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(KennelCardPdf, { kaart: leeg }) as any,
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
