/**
 * Epic 13, story 13.4 — het draaiboek op papier.
 *
 * Sven (vraag 6, 2026-08-06): "Op papier maar ik wil de mogelijkheid ook laten om
 * op gsm en iPad of pc te kunnen schakelen", en (vraag 30) "Ik zou het ook
 * afdrukbaar maken, voor Martine vindt ze makkelijker".
 *
 * Pure logica: hier wordt bepaald WAT er op het blad komt. Het tekenen gebeurt in
 * `DraaiboekPdf`. Zo blijft de indeling testbaar zonder een PDF te renderen.
 */
import { DRAAIBOEK_PHASES, groupTasksByPhase, draaiboekProgress } from "./draaiboek";
import { eventTypeLabel } from "./types";
import { formatEventPeriod } from "./list";
import { formatShiftTime, groupShiftsByDay, type Shift } from "./shifts";
import { materialLine, needsReturn, originLabel, sortMaterials, type Material } from "./materials";

export interface DraaiboekPrintTask {
  id: number;
  phase: string;
  date: string | null;
  time: string | null;
  title: string;
  responsible: string | null;
  notes: string | null;
  sortOrder: number;
  done: boolean;
}

export interface DraaiboekPrintEvent {
  name: string;
  type: string;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  responsible?: string | null;
  expectedVisitors?: number | null;
  description?: string | null;
}

export interface DraaiboekPrintRow {
  moment: string;
  titel: string;
  wie: string;
  notitie: string;
  done: boolean;
}

export interface DraaiboekPrintSection {
  label: string;
  hint: string;
  taken: DraaiboekPrintRow[];
}

/** Story 13.6 — "wie staat waar", per dag en per post, achteraan het blad. */
export interface DraaiboekPrintShiftDay {
  label: string;
  posten: { post: string; regels: string[] }[];
}

/** Story 13.11 — het materiaal, met wat er nog terug moet. */
export interface DraaiboekPrintMaterial {
  regel: string;
  herkomst: string;
  /** "" wanneer er niets terug hoeft. */
  terug: string;
}

export interface DraaiboekPrintModel {
  titel: string;
  ondertitel: string;
  gegevens: { label: string; waarde: string }[];
  omschrijving: string;
  fasen: DraaiboekPrintSection[];
  shiftDagen: DraaiboekPrintShiftDay[];
  materialen: DraaiboekPrintMaterial[];
  voortgang: { done: number; total: number; pct: number };
  leeg: boolean;
  afgedruktOp: string;
}

const WEEKDAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"] as const;

/**
 * "za 14/11 · 16:00". De weekdag staat erbij omdat een eetfestijn over twee dagen
 * loopt: "za" en "zo" lezen sneller dan twee datums vergelijken.
 *
 * De datum wordt op de middag in UTC gelezen. Zo kan geen enkele tijdzone- of
 * zomeruursprong de dag een plaats doen opschuiven.
 */
export function printMoment(task: { date: string | null; time: string | null }): string {
  let dag = "";
  if (task.date) {
    const [jaar, maand, dagNr] = task.date.split("-");
    const weekdag = WEEKDAGEN[new Date(`${task.date}T12:00:00Z`).getUTCDay()] ?? "";
    dag = `${weekdag} ${dagNr}/${maand}`.trim();
    if (!jaar) dag = "";
  }
  return [dag, task.time].filter(Boolean).join(" · ");
}

function tekst(waarde: string | null | undefined): string {
  return (waarde ?? "").trim();
}

/**
 * "Eetfestijn 2026" → "draaiboek-eetfestijn-2026.pdf". Accenten worden ontdaan van
 * hun teken; wie het bestand doormailt, wil geen `caf%C3%A9` in de naam.
 */
export function draaiboekFileName(event: { name: string; id: number }): string {
  const slug = event.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // de losse accenttekens die NFD achterlaat
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `draaiboek-${slug || event.id}.pdf`;
}

export function buildDraaiboekPrint({
  event,
  tasks,
  shifts = [],
  materials = [],
  afgedruktOp,
}: {
  event: DraaiboekPrintEvent;
  tasks: readonly DraaiboekPrintTask[];
  /** Story 13.6 — optioneel: zonder shiften blijft het blad zoals het was. */
  shifts?: readonly Shift[];
  /** Story 13.11 — idem voor de materiaallijst. */
  materials?: readonly Material[];
  afgedruktOp: string;
}): DraaiboekPrintModel {
  const gegevens: { label: string; waarde: string }[] = [];
  if (tekst(event.location)) gegevens.push({ label: "Locatie", waarde: tekst(event.location) });
  if (tekst(event.responsible)) {
    gegevens.push({ label: "Verantwoordelijke", waarde: tekst(event.responsible) });
  }
  if (event.expectedVisitors) {
    gegevens.push({ label: "Verwachte bezoekers", waarde: String(event.expectedVisitors) });
  }

  // Lege fasen vallen weg. Op het scherm tonen ze wat er nog ontbreekt; op papier
  // is een kop zonder taken enkel een lege plek waar niets mee te doen valt.
  const fasen = groupTasksByPhase(tasks)
    .filter((groep) => groep.tasks.length > 0)
    .map((groep) => ({
      label: groep.label,
      hint: DRAAIBOEK_PHASES.find((f) => f.key === groep.phase)?.hint ?? "",
      taken: groep.tasks.map((t) => ({
        moment: printMoment(t),
        titel: t.title,
        wie: tekst(t.responsible),
        notitie: tekst(t.notes),
        done: t.done,
      })),
    }));

  // "Katrien 16:00 – 20:00" — één regel per persoon, gegroepeerd per post.
  const shiftDagen = groupShiftsByDay(shifts).map((dag) => ({
    label: dag.label,
    posten: dag.posten.map((groep) => ({
      post: groep.post,
      regels: groep.shifts.map(
        (s) => `${s.personName} · ${formatShiftTime(s.startTime, s.endTime)}`,
      ),
    })),
  }));

  // Op papier telt vooral: wat is het, van wie komt het, en moet het terug?
  const materialen = sortMaterials(materials).map((m) => ({
    regel: materialLine(m),
    herkomst: originLabel(m.origin),
    terug: needsReturn(m.origin) ? (m.returned ? "terugbezorgd" : "moet terug") : "",
  }));

  return {
    titel: event.name,
    ondertitel: `${eventTypeLabel(event.type)} · ${formatEventPeriod(event)}`,
    gegevens,
    omschrijving: tekst(event.description),
    fasen,
    shiftDagen,
    materialen,
    voortgang: draaiboekProgress(tasks),
    leeg: tasks.length === 0,
    afgedruktOp,
  };
}
