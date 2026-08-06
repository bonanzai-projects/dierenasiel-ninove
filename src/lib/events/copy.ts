/**
 * Epic 13, story 13.10 — niet bij nul beginnen.
 *
 * Twee kanten van dezelfde vraag van Sven:
 *
 * - **Standaardtaken** (vraag 8, 2026-08-06): *"Bij het eetfestijn is dat sponsors zoeken
 *   en aanspreken, traiteur afspreken, communicatie opmaken/verspreiden, bestellingen
 *   plaatsen, vrijwilligers/medewerkers koppelen aan een evenement, afvinklijsten kunnen
 *   maken wie heeft wat gedaan."*
 * - **Volgende editie**: het draaiboek en de cijfers van dit jaar zijn het beste begin
 *   voor volgend jaar. Vandaag zit die kennis "jammer genoeg in een hoofd" (vraag 5).
 *
 * Pure logica, geen database.
 */

export interface StandardTask {
  title: string;
  phase: string;
  /** Leeg = voor elk soort evenement. */
  types?: readonly string[];
  sortOrder: number;
}

/** De taken die Sven letterlijk opsomde. Alleen de traiteur is eetfestijn-eigen. */
export const STANDARD_TASKS: readonly Omit<StandardTask, "sortOrder">[] = [
  { title: "Sponsors zoeken en aanspreken", phase: "voorbereiding" },
  { title: "Traiteur afspreken", phase: "voorbereiding", types: ["eetfestijn"] },
  { title: "Communicatie opmaken en verspreiden", phase: "voorbereiding" },
  { title: "Bestellingen plaatsen", phase: "voorbereiding" },
  { title: "Vrijwilligers koppelen aan het evenement", phase: "voorbereiding" },
  { title: "Afvinklijst maken: wie heeft wat gedaan", phase: "dag-zelf" },
] as const;

export function standardTasksFor(type: string): StandardTask[] {
  return STANDARD_TASKS.filter((t) => !t.types || t.types.includes(type)).map((t, i) => ({
    ...t,
    sortOrder: i,
  }));
}

const DAY_MS = 86_400_000;

/** Schuift een ISO-datum op met n dagen. Op de middag in UTC gelezen (DST-veilig). */
export function shiftDate(date: string | null, offsetDays: number): string | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00Z`);
  return new Date(d.getTime() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

function diffDays(vanaf: string, tot: string): number {
  return Math.round(
    (new Date(`${tot}T12:00:00Z`).getTime() - new Date(`${vanaf}T12:00:00Z`).getTime()) / DAY_MS,
  );
}

/**
 * Een jaar later, met het jaartal in de naam mee opgeschoven — maar enkel wanneer
 * dát jaartal ook het jaar van de datum is. "Quiz 100 jaar" blijft "Quiz 100 jaar".
 */
export function nextEditionDefaults({ name, date }: { name: string; date: string }): {
  name: string;
  date: string;
} {
  const jaar = Number(date.slice(0, 4));
  const nieuweDatum = shiftDate(date, 365) as string;
  const nieuwJaar = Number(nieuweDatum.slice(0, 4));
  return {
    name: name.includes(String(jaar)) ? name.replace(String(jaar), String(nieuwJaar)) : name,
    date: nieuweDatum,
  };
}

export interface CopySource {
  event: {
    id: number;
    name: string;
    type: string;
    date: string;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    responsible: string | null;
    expectedVisitors: number | null;
    description: string | null;
  };
  tasks: readonly {
    phase: string;
    title: string;
    date: string | null;
    time: string | null;
    responsible: string | null;
    notes: string | null;
    sortOrder: number;
  }[];
  costs: readonly {
    kind: string;
    category: string;
    description: string;
    budgetAmount: string | null;
    actualAmount: string | null;
    supplier: string | null;
    sortOrder: number;
  }[];
  shifts: readonly {
    date: string;
    startTime: string | null;
    endTime: string | null;
    post: string;
    personName: string;
    notes: string | null;
    sortOrder: number;
  }[];
}

export interface CopyOptions {
  name: string;
  date: string;
  include: { tasks: boolean; costs: boolean; shifts: boolean };
}

/**
 * Bouwt de volgende editie. Alle datums schuiven mee met dezelfde afstand als de
 * begindatum, zodat "drie maanden vooraf" drie maanden vooraf blijft.
 *
 * Drie bewuste keuzes:
 * - De nieuwe editie begint als **concept**, niet als gepland. Ze is nog niet beslist.
 * - Het **werkelijke** bedrag van vorig jaar wordt de **begroting** van dit jaar. Dat is
 *   precies wat een begroting hoort te zijn voor wie er nog nooit een maakte (vraag 14).
 * - De **evaluatie gaat niet mee**: die hoort bij die editie. Ze blijft wel raadpleegbaar
 *   via `copiedFromEventId`.
 */
export function buildNextEdition(bron: CopySource, opties: CopyOptions) {
  const offset = diffDays(bron.event.date, opties.date);

  return {
    event: {
      name: opties.name,
      type: bron.event.type,
      status: "concept",
      date: opties.date,
      endDate: shiftDate(bron.event.endDate, offset),
      startTime: bron.event.startTime,
      endTime: bron.event.endTime,
      location: bron.event.location,
      responsible: bron.event.responsible,
      expectedVisitors: bron.event.expectedVisitors,
      description: bron.event.description,
      copiedFromEventId: bron.event.id,
    },
    tasks: opties.include.tasks
      ? bron.tasks.map((t) => ({
          phase: t.phase,
          title: t.title,
          date: shiftDate(t.date, offset),
          time: t.time,
          responsible: t.responsible,
          notes: t.notes,
          sortOrder: t.sortOrder,
          done: false,
        }))
      : [],
    costs: opties.include.costs
      ? bron.costs.map((c) => ({
          kind: c.kind,
          category: c.category,
          description: c.description,
          // Wat het vorig jaar écht kostte, is de beste raming voor dit jaar.
          budgetAmount: c.actualAmount ?? c.budgetAmount,
          actualAmount: null,
          supplier: c.supplier,
          paid: false,
          sortOrder: c.sortOrder,
        }))
      : [],
    shifts: opties.include.shifts
      ? bron.shifts.map((s) => ({
          date: shiftDate(s.date, offset) as string,
          startTime: s.startTime,
          endTime: s.endTime,
          post: s.post,
          personName: s.personName,
          notes: s.notes,
          sortOrder: s.sortOrder,
        }))
      : [],
  };
}
