import { describe, it, expect } from "vitest";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import AdoptableAnimalsPdf from "./AdoptableAnimalsPdf";
import type { Animal } from "@/types";

// Story 10.73 — R6-PDF: reden van intake erbij, beschrijving weg (Sven).

const dieren = [
  {
    id: 1, name: "Bo", species: "hond", breed: "Chow Chow", gender: "teef", status: "beschikbaar",
    identificationNr: "981000012345678", intakeDate: "2026-05-26", intakeReason: "ibn",
    shortDescription: "Lieve hond die graag knuffelt",
  },
  {
    id: 2, name: "Mimi", species: "kat", breed: null, gender: "poes", status: "beschikbaar",
    identificationNr: null, intakeDate: "2026-06-01", intakeReason: null, shortDescription: null,
  },
] as unknown as Animal[];

/** Alle tekst in de elementenboom (zelfde techniek als OwnerReturnPdf.test). */
function tekstVan(node: ReactNode): string {
  const stukken: string[] = [];
  const loop = (n: ReactNode): void => {
    if (typeof n === "string" || typeof n === "number") { stukken.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(loop); return; }
    if (!isValidElement(n)) return;
    if (typeof n.type === "function") { loop((n.type as (p: unknown) => ReactNode)(n.props)); return; }
    const props = n.props as { children?: ReactNode };
    if (props.children !== undefined) loop(props.children);
  };
  loop(node);
  return stukken.join(" | ");
}

describe("AdoptableAnimalsPdf", () => {
  it("toont de reden van intake en niet langer de beschrijving", () => {
    const t = tekstVan(AdoptableAnimalsPdf({ animals: dieren, generatedAt: "27 september 2026" }));
    expect(t).toContain("Reden intake");
    expect(t).toContain("Inbeslagname (IBN)");
    expect(t).not.toContain("Beschrijving");
    expect(t).not.toContain("Lieve hond die graag knuffelt");
  });

  it("zet de reden meteen na de intakedatum", () => {
    const t = tekstVan(AdoptableAnimalsPdf({ animals: dieren, generatedAt: "27 september 2026" }));
    expect(t).toContain("Intake datum | Reden intake");
    expect(t).toContain("2026-05-26 | Inbeslagname (IBN)");
    expect(t).toContain("2026-06-01 | -");
  });

  it("rendert als PDF", async () => {
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(AdoptableAnimalsPdf, { animals: dieren, generatedAt: "27 september 2026" }) as any,
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
