import { describe, it, expect } from "vitest";
import {
  STANDARD_TASKS,
  standardTasksFor,
  shiftDate,
  nextEditionDefaults,
  buildNextEdition,
  type CopySource,
} from "./copy";

const bron: CopySource = {
  event: {
    id: 5,
    name: "Eetfestijn 2026",
    type: "eetfestijn",
    date: "2026-11-14",
    endDate: "2026-11-15",
    startTime: "18:00",
    endTime: null,
    location: "Parochiezaal Denderwindeke",
    responsible: "Sven",
    expectedVisitors: 300,
    description: "Zaal open vanaf 17u.",
  },
  tasks: [
    { phase: "voorbereiding", title: "Sponsors zoeken", date: "2026-06-01", time: null, responsible: "Sven", notes: "lijst hergebruiken", sortOrder: 0 },
    { phase: "dag-zelf", title: "Zaal openen", date: "2026-11-14", time: "16:00", responsible: "Katrien", notes: null, sortOrder: 1 },
    { phase: "voorbereiding", title: "Zonder datum", date: null, time: null, responsible: null, notes: null, sortOrder: 2 },
  ],
  costs: [
    { kind: "kost", category: "drank", description: "Drank", budgetAmount: "400", actualAmount: "560", supplier: "De Ryck", sortOrder: 0 },
    { kind: "opbrengst", category: "eten", description: "Eten", budgetAmount: "2500", actualAmount: "2890", supplier: null, sortOrder: 1 },
    { kind: "kost", category: "tshirts", description: "T-shirts", budgetAmount: "250", actualAmount: null, supplier: null, sortOrder: 2 },
  ],
  shifts: [
    { date: "2026-11-14", startTime: "16:00", endTime: "20:00", post: "Bar", personName: "Katrien", notes: null, sortOrder: 0 },
    { date: "2026-11-15", startTime: null, endTime: null, post: "Afbraak", personName: "Peter", notes: null, sortOrder: 1 },
  ],
};

describe("standaardtaken", () => {
  // Sven, vraag 8 (2026-08-06).
  it("bevat de taken die Sven opsomde", () => {
    const titels = STANDARD_TASKS.map((t) => t.title);
    expect(titels).toContain("Sponsors zoeken en aanspreken");
    expect(titels).toContain("Communicatie opmaken en verspreiden");
    expect(titels).toContain("Bestellingen plaatsen");
    expect(titels).toContain("Vrijwilligers koppelen aan het evenement");
    expect(titels).toContain("Afvinklijst maken: wie heeft wat gedaan");
  });

  it("houdt 'traiteur afspreken' bij het eetfestijn", () => {
    expect(standardTasksFor("eetfestijn").map((t) => t.title)).toContain("Traiteur afspreken");
    expect(standardTasksFor("kerstmarkt").map((t) => t.title)).not.toContain("Traiteur afspreken");
  });

  it("geeft elke standaardtaak een fase en een volgorde", () => {
    const taken = standardTasksFor("eetfestijn");
    expect(taken.length).toBe(6);
    taken.forEach((t, i) => {
      expect(t.phase.length).toBeGreaterThan(0);
      expect(t.sortOrder).toBe(i);
    });
  });
});

describe("shiftDate", () => {
  it("schuift een datum op met het aantal dagen", () => {
    expect(shiftDate("2026-11-14", 365)).toBe("2027-11-14");
  });

  it("schuift over een maandgrens", () => {
    expect(shiftDate("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("laat een lege datum leeg", () => {
    expect(shiftDate(null, 10)).toBeNull();
  });
});

describe("nextEditionDefaults", () => {
  it("stelt een jaar later voor, met het jaartal in de naam bijgewerkt", () => {
    expect(nextEditionDefaults({ name: "Eetfestijn 2026", date: "2026-11-14" })).toEqual({
      name: "Eetfestijn 2027",
      date: "2027-11-14",
    });
  });

  it("laat de naam ongemoeid wanneer er geen jaartal in staat", () => {
    expect(nextEditionDefaults({ name: "Zomermarkt", date: "2026-08-30" }).name).toBe("Zomermarkt");
  });

  it("wijzigt enkel een jaartal dat bij de datum hoort", () => {
    expect(nextEditionDefaults({ name: "Quiz 100 jaar", date: "2026-03-01" }).name).toBe("Quiz 100 jaar");
  });
});

describe("buildNextEdition", () => {
  const opties = { name: "Eetfestijn 2027", date: "2027-11-13", include: { tasks: true, costs: true, shifts: true } };

  it("neemt de gegevens van het evenement over, met de nieuwe naam en datum", () => {
    const { event } = buildNextEdition(bron, opties);
    expect(event).toMatchObject({
      name: "Eetfestijn 2027",
      type: "eetfestijn",
      status: "concept",
      date: "2027-11-13",
      location: "Parochiezaal Denderwindeke",
      responsible: "Sven",
      copiedFromEventId: 5,
    });
  });

  it("schuift de einddatum mee op met dezelfde afstand", () => {
    const { event } = buildNextEdition(bron, opties);
    // 14/11/2026 -> 13/11/2027 is 364 dagen; de einddatum schuift evenveel op.
    expect(event.endDate).toBe("2027-11-14");
  });

  it("begint als concept, niet als gepland", () => {
    expect(buildNextEdition(bron, opties).event.status).toBe("concept");
  });

  it("kopieert de draaiboektaken met dezelfde verschuiving, en niet afgevinkt", () => {
    const { tasks } = buildNextEdition(bron, opties);
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      phase: "voorbereiding",
      title: "Sponsors zoeken",
      date: "2027-05-31",
      responsible: "Sven",
      notes: "lijst hergebruiken",
      done: false,
    });
    expect(tasks[1].date).toBe("2027-11-13");
    expect(tasks[1].time).toBe("16:00");
  });

  it("laat een taak zonder datum zonder datum", () => {
    expect(buildNextEdition(bron, opties).tasks[2].date).toBeNull();
  });

  it("maakt van het werkelijke bedrag van vorig jaar de begroting van dit jaar", () => {
    const { costs } = buildNextEdition(bron, opties);
    expect(costs[0]).toMatchObject({
      kind: "kost",
      category: "drank",
      description: "Drank",
      supplier: "De Ryck",
      budgetAmount: "560",
      actualAmount: null,
      paid: false,
    });
  });

  it("valt terug op de oude begroting wanneer er geen werkelijk bedrag was", () => {
    expect(buildNextEdition(bron, opties).costs[2].budgetAmount).toBe("250");
  });

  it("kopieert de shiften met dezelfde verschuiving", () => {
    const { shifts } = buildNextEdition(bron, opties);
    expect(shifts).toHaveLength(2);
    expect(shifts[0]).toMatchObject({ date: "2027-11-13", post: "Bar", personName: "Katrien" });
    expect(shifts[1].date).toBe("2027-11-14");
  });

  it("laat weg wat je niet mee wil nemen", () => {
    const kaal = buildNextEdition(bron, {
      ...opties,
      include: { tasks: false, costs: false, shifts: false },
    });
    expect(kaal.tasks).toEqual([]);
    expect(kaal.costs).toEqual([]);
    expect(kaal.shifts).toEqual([]);
    expect(kaal.event.name).toBe("Eetfestijn 2027");
  });

  it("neemt de evaluatie NIET mee — die hoort bij die editie", () => {
    const resultaat = buildNextEdition(bron, opties);
    expect(resultaat).not.toHaveProperty("evaluation");
  });
});
