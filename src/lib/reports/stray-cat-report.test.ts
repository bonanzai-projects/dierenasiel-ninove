import { describe, it, expect } from "vitest";
import type { StrayCatCampaign } from "@/types";
import type { CampaignReportStats } from "@/lib/queries/stray-cat-campaigns";
import {
  STRAY_CAT_REPORT_COLUMNS,
  cageInfo,
  fivFelvInfo,
  formatPeriod,
  outcomeLabel,
  strayCatReportRow,
  strayCatSummaryTiles,
} from "./stray-cat-report";

const campagne = (overrides: Partial<StrayCatCampaign> = {}): StrayCatCampaign =>
  ({
    id: 1,
    requestDate: "2026-04-26",
    municipality: "Gooik",
    address: "Schavolliestraat 52",
    cageDeploymentDate: "2026-04-21",
    cageNumbers: "K1,K7,K12",
    inspectionDate: "2026-04-21",
    catDescription: "zwart kater",
    vetName: "Ine Wouters",
    fivStatus: "negatief",
    felvStatus: "negatief",
    outcome: "gecastreerd_uitgezet",
    remarks: null,
    status: "afgerond",
    ...overrides,
  }) as StrayCatCampaign;

describe("STRAY_CAT_REPORT_COLUMNS", () => {
  it("heeft de tien kolommen van het rapport, in volgorde", () => {
    expect(STRAY_CAT_REPORT_COLUMNS.map((c) => c.label)).toEqual([
      "Datum",
      "Gemeente",
      "Adres",
      "Kooi-uitzetting",
      "Inspectie",
      "Kat (beschrijving)",
      "Dierenarts",
      "FIV / FeLV",
      "Uitkomst",
      "Opm.",
    ]);
  });

  it("verdeelt de PDF-breedtes over precies 100%", () => {
    const som = STRAY_CAT_REPORT_COLUMNS.reduce(
      (t, c) => t + Number(c.pdfWidth.replace("%", "")),
      0,
    );
    expect(som).toBe(100);
  });

  it("heeft unieke sleutels", () => {
    const keys = STRAY_CAT_REPORT_COLUMNS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("strayCatReportRow", () => {
  it("vult een cel voor élke kolom", () => {
    const row = strayCatReportRow(campagne());
    for (const kolom of STRAY_CAT_REPORT_COLUMNS) {
      expect(row[kolom.key], `kolom ${kolom.key}`).toBeDefined();
    }
  });

  it("toont een streepje waar niets ingevuld is", () => {
    const row = strayCatReportRow(
      campagne({ inspectionDate: null, catDescription: null, vetName: null, remarks: null }),
    );
    expect(row.inspection).toBe("-");
    expect(row.cat).toBe("-");
    expect(row.vet).toBe("-");
    expect(row.remarks).toBe("-");
  });
});

describe("cageInfo", () => {
  it("zet datum en nummers achter elkaar, met een spatie na elke komma", () => {
    expect(cageInfo(campagne())).toBe("2026-04-21 #K1, K7, K12");
  });

  it("geeft de reeks breekpunten zodat de PDF ze niet middenin afbreekt", () => {
    // Zonder spatie is dit voor @react-pdf een woord dat niet in de kolom past
    // en dat het dus met een koppelteken doorknipt ("#-" + de rest).
    const lang = cageInfo(campagne({ cageNumbers: "K1,K7,K12,K13,K18" }));
    expect(lang).toBe("2026-04-21 #K1, K7, K12, K13, K18");
    expect(lang).not.toContain(",K");
  });

  it("verdraagt rommelige invoer", () => {
    expect(cageInfo(campagne({ cageNumbers: " K1 , ,K7 " }))).toBe("2026-04-21 #K1, K7");
  });

  it("toont enkel de datum wanneer er geen nummers zijn", () => {
    expect(cageInfo(campagne({ cageNumbers: null }))).toBe("2026-04-21");
  });

  it("toont enkel de nummers wanneer er geen datum is", () => {
    expect(cageInfo(campagne({ cageDeploymentDate: null }))).toBe("#K1, K7, K12");
  });

  it("geeft een streepje wanneer er niets is", () => {
    expect(cageInfo(campagne({ cageDeploymentDate: null, cageNumbers: null }))).toBe("-");
  });
});

describe("fivFelvInfo", () => {
  it("zet FIV en FeLV op twee regels", () => {
    expect(fivFelvInfo(campagne())).toBe("FIV: Negatief\nFeLV: Negatief");
  });

  it("toont een streepje voor wat niet getest is", () => {
    expect(fivFelvInfo(campagne({ fivStatus: null, felvStatus: null }))).toBe("FIV: -\nFeLV: -");
  });
});

describe("outcomeLabel", () => {
  it("vertaalt de sleutel naar mensentaal", () => {
    expect(outcomeLabel("gecastreerd_uitgezet")).toBe("Gecastreerd & uitgezet");
    expect(outcomeLabel("gesteriliseerd_uitgezet")).toBe("Gesteriliseerd & uitgezet");
  });

  it("geeft een streepje zonder uitkomst", () => {
    expect(outcomeLabel(null)).toBe("-");
  });
});

describe("formatPeriod", () => {
  it("beschrijft alle vier de gevallen", () => {
    expect(formatPeriod()).toBe("Alle periodes");
    expect(formatPeriod("2026-01-01")).toBe("vanaf 2026-01-01");
    expect(formatPeriod(undefined, "2026-12-31")).toBe("tot 2026-12-31");
    expect(formatPeriod("2026-01-01", "2026-12-31")).toBe("2026-01-01 t/m 2026-12-31");
  });
});

describe("strayCatSummaryTiles", () => {
  const stats = (overrides: Partial<CampaignReportStats> = {}): CampaignReportStats =>
    ({
      total: 3,
      completedCampaigns: 2,
      fivPositive: 0,
      fivTested: 2,
      fivPercentage: 0,
      felvPositive: 0,
      felvTested: 2,
      felvPercentage: 0,
      outcomes: { gecastreerd_uitgezet: 1, gesteriliseerd_uitgezet: 1 },
      ...overrides,
    }) as CampaignReportStats;

  it("geeft de vaste vier plus één tegel per uitkomst", () => {
    const tegels = strayCatSummaryTiles(stats());

    expect(tegels.map((t) => t.label)).toEqual([
      "Totaal",
      "Afgerond",
      "FIV positief",
      "FeLV positief",
      "Gecastreerd & uitgezet",
      "Gesteriliseerd & uitgezet",
    ]);
    expect(tegels.map((t) => t.value)).toEqual(["3", "2", "0 (0%)", "0 (0%)", "1", "1"]);
  });

  it("kapt de uitkomsten niet af", () => {
    const tegels = strayCatSummaryTiles(
      stats({
        outcomes: { gecastreerd_uitgezet: 1, gesteriliseerd_uitgezet: 1, geadopteerd: 2 },
      }),
    );
    expect(tegels).toHaveLength(7);
    expect(tegels.map((t) => t.label)).toContain("Geadopteerd");
  });

  it("toont enkel de vaste vier zonder uitkomsten", () => {
    expect(strayCatSummaryTiles(stats({ outcomes: {} }))).toHaveLength(4);
  });

  it("geeft elke tegel een unieke sleutel", () => {
    const keys = strayCatSummaryTiles(stats()).map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
