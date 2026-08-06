import { describe, it, expect } from "vitest";
import {
  availableYears,
  eventYear,
  buildYearOverview,
  type YearOverviewInput,
} from "./yearly";

const input: YearOverviewInput = {
  events: [
    { id: 1, name: "Eetfestijn 2026", type: "eetfestijn", status: "afgelopen", date: "2026-11-14", endDate: "2026-11-15" },
    { id: 2, name: "Kerstmarkt Ninove", type: "kerstmarkt", status: "gepland", date: "2026-12-12", endDate: null },
    { id: 3, name: "Benefiet", type: "benefiet", status: "geannuleerd", date: "2026-03-01", endDate: null },
    { id: 4, name: "Eetfestijn 2025", type: "eetfestijn", status: "afgelopen", date: "2025-11-15", endDate: null },
  ],
  costs: [
    { eventId: 1, kind: "kost", budgetAmount: "2000", actualAmount: "2325" },
    { eventId: 1, kind: "opbrengst", budgetAmount: "3500", actualAmount: "4030" },
    { eventId: 2, kind: "kost", budgetAmount: "150", actualAmount: null },
    { eventId: 3, kind: "kost", budgetAmount: null, actualAmount: "75" },
    { eventId: 4, kind: "opbrengst", budgetAmount: null, actualAmount: "3600" },
  ],
  evaluations: [
    { eventId: 1, visitors: 280, paidPlates: 289 },
    { eventId: 4, visitors: 250, paidPlates: null },
  ],
};

describe("eventYear", () => {
  it("leest het jaar uit de begindatum", () => {
    expect(eventYear({ date: "2026-11-14" })).toBe(2026);
  });
});

describe("availableYears", () => {
  it("geeft de jaren waarin iets georganiseerd werd, recentste eerst", () => {
    expect(availableYears(input.events)).toEqual([2026, 2025]);
  });

  it("blijft leeg zonder evenementen", () => {
    expect(availableYears([])).toEqual([]);
  });
});

describe("buildYearOverview", () => {
  it("neemt enkel de evenementen van dat jaar, chronologisch", () => {
    const overzicht = buildYearOverview(input, 2026);
    expect(overzicht.rijen.map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it("rekent per evenement kosten, opbrengsten en netto uit", () => {
    const rij = buildYearOverview(input, 2026).rijen.find((r) => r.id === 1)!;
    expect(rij).toMatchObject({
      naam: "Eetfestijn 2026",
      kosten: 2325,
      opbrengsten: 4030,
      netto: 1705,
      bezoekers: 280,
    });
  });

  it("laat bezoekers leeg wanneer ze niet gemeten zijn", () => {
    const rij = buildYearOverview(input, 2026).rijen.find((r) => r.id === 2)!;
    expect(rij.bezoekers).toBeNull();
  });

  it("telt het jaar op", () => {
    const overzicht = buildYearOverview(input, 2026);
    expect(overzicht.totalen).toEqual({
      kosten: 2400,
      opbrengsten: 4030,
      netto: 1630,
      bezoekers: 280,
      aantal: 3,
    });
  });

  it("laat zien dat een evenement geannuleerd was, maar telt zijn kosten wel mee", () => {
    const overzicht = buildYearOverview(input, 2026);
    const rij = overzicht.rijen.find((r) => r.id === 3)!;
    expect(rij.status).toBe("geannuleerd");
    expect(rij.kosten).toBe(75);
    // 2325 + 0 + 75 = 2400
    expect(overzicht.totalen.kosten).toBe(2400);
  });

  it("werkt voor een jaar zonder evenementen", () => {
    const overzicht = buildYearOverview(input, 2024);
    expect(overzicht.rijen).toEqual([]);
    expect(overzicht.totalen).toEqual({
      kosten: 0, opbrengsten: 0, netto: 0, bezoekers: 0, aantal: 0,
    });
  });

  it("telt de bezoekers van meerdere evenementen op", () => {
    const overzicht = buildYearOverview(
      {
        ...input,
        evaluations: [
          { eventId: 1, visitors: 280, paidPlates: null },
          { eventId: 2, visitors: 120, paidPlates: null },
        ],
      },
      2026,
    );
    expect(overzicht.totalen.bezoekers).toBe(400);
  });
});
