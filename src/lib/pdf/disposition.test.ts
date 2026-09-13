import { describe, it, expect } from "vitest";
import { pdfContentDisposition, pdfDownloadUrl, wantsPdfDownload } from "./disposition";

// Story 10.71 — Sven: de PDF "visualiseren in programma en niet downloaden … uiteraard wel
// mogelijk maken dat we ook kunnen downloaden".

describe("pdfContentDisposition", () => {
  it("toont de PDF standaard in de browser", () => {
    expect(pdfContentDisposition("bezoekrapport.pdf", false)).toBe('inline; filename="bezoekrapport.pdf"');
  });

  it("downloadt enkel op vraag", () => {
    expect(pdfContentDisposition("bezoekrapport.pdf", true)).toBe('attachment; filename="bezoekrapport.pdf"');
  });
});

describe("wantsPdfDownload", () => {
  it("is waar enkel bij download=1", () => {
    expect(wantsPdfDownload(new URLSearchParams("download=1"))).toBe(true);
    expect(wantsPdfDownload(new URLSearchParams("van=2026-01-01"))).toBe(false);
    expect(wantsPdfDownload(new URLSearchParams("download=0"))).toBe(false);
  });
});

describe("pdfDownloadUrl", () => {
  it("zet download=1 achter een adres zonder zoekparameters", () => {
    expect(pdfDownloadUrl("/api/rapporten/bezoekrapport/7/pdf")).toBe("/api/rapporten/bezoekrapport/7/pdf?download=1");
  });

  it("behoudt bestaande zoekparameters (de gekozen datums)", () => {
    expect(pdfDownloadUrl("/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13")).toBe(
      "/api/rapporten/bezoekrapporten/pdf?van=2026-01-01&tot=2026-09-13&download=1",
    );
  });
});
