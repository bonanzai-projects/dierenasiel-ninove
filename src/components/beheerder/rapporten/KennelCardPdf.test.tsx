import { describe, it, expect } from "vitest";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToBuffer, Polyline } from "@react-pdf/renderer";
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
    weightKg: "24,5",
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
    weightKg: null,
  },
  lastVaccination: null,
  lastDeworming: null,
});

/**
 * Telt de vinkjes in de opgebouwde elementenboom. Een vinkje is een `<Polyline>`
 * (getekend, niet als letterteken — de standaard PDF-fonts hebben geen ✓).
 */
function telVinkjes(kaart: Parameters<typeof KennelCardPdf>[0]["kaart"]): number {
  let aantal = 0;

  const loop = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      node.forEach(loop);
      return;
    }
    if (!isValidElement(node)) return;

    if (node.type === Polyline) aantal += 1;

    // De kaart is opgebouwd uit eigen deelcomponenten (Keuzes, Vinkje). Die
    // moeten we zelf uitvoeren om bij hun inhoud te komen; de primitieven van
    // @react-pdf zijn gewone strings ("VIEW", "POLYLINE") en stoppen de recursie.
    if (typeof node.type === "function") {
      const component = node.type as (props: unknown) => ReactNode;
      loop(component(node.props));
      return;
    }

    const props = node.props as { children?: ReactNode };
    if (props.children !== undefined) loop(props.children);
  };

  loop(KennelCardPdf({ kaart }));
  return aantal;
}

describe("KennelCardPdf", () => {
  it("zet een vinkje bij het juiste geslacht en bij steriel ja/neen", () => {
    // Sven leest de kaart vanop een meter: een dikkere rand rond het bolletje is
    // niet te onderscheiden, een vinkje wel. Reu + Neen = 2 vinkjes.
    expect(telVinkjes(volledig)).toBe(2);
  });

  it("zet geen vinkje wanneer geslacht of steriel onbekend is", () => {
    expect(telVinkjes(leeg)).toBe(0);
  });

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
