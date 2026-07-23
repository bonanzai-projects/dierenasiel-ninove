import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import AnimalPosterPdf, { type AnimalPosterAnimal } from "./AnimalPosterPdf";

// Story 10.32: regressie-guard — bewaakt dat de affiche effectief rendert
// (o.a. dat alle gebruikte fontFamily/fontStyle-combinaties oplosbaar zijn en
// dat ontbrekende foto's/beschrijving geen crash geven).

const animal: AnimalPosterAnimal = {
  id: 300,
  name: "Kamiel",
  breed: "Amerikaanse Stafford",
  gender: "reu",
  isNeutered: true,
  dateOfBirth: "2021-06-01",
  description: "Hallo daar, ik ben Kamiel.",
};

// 1×1 PNG als data-URL — @react-pdf kan dit zonder netwerk verwerken.
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function render(props: Parameters<typeof AnimalPosterPdf>[0]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(AnimalPosterPdf, props) as any;
  return renderToBuffer(element);
}

describe("AnimalPosterPdf", () => {
  it("rendert een affiche met foto's en eigenschappen", async () => {
    const buffer = await render({
      animal,
      traits: { zindelijk: "ja", katten: "nee", kinderen_tot_14: "ja" },
      photos: [PIXEL, PIXEL, PIXEL, PIXEL],
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1", 0, 5)).toBe("%PDF-");
  }, 30000);

  it("rendert zonder foto's, zonder eigenschappen en zonder beschrijving", async () => {
    const buffer = await render({
      animal: { ...animal, breed: null, dateOfBirth: null, isNeutered: null, description: "" },
      traits: null,
      photos: [],
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1", 0, 5)).toBe("%PDF-");
  }, 30000);

  it("rendert met een oneven aantal foto's (lege cellen in het raster)", async () => {
    const buffer = await render({ animal, traits: {}, photos: [PIXEL, PIXEL, PIXEL] });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1", 0, 5)).toBe("%PDF-");
  }, 30000);
});
