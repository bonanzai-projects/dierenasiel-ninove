/**
 * Epic 13, story 13.6 — wie staat waar en wanneer.
 *
 * Sven (vraag 10, 2026-08-06): "Lijkt me toch gemakkelijk als we kunnen aangeven wie
 * waar staat op evenement. Is dus registratie wie wat waar en wanneer." Vandaag is dat
 * "een blad dat al een paar keer herschreven wordt of verloren" (vraag 11), en
 * (vraag 12) "Wij als beheerder vullen de lijsten aan".
 *
 * Bewust GEEN shiftenplanner: geen zelfinschrijving, geen beschikbaarheden, geen
 * conflictdetectie. Dat maakte de zware versie duur; dit is het blad, maar dan één
 * dat niet verloren gaat.
 *
 * Pure logica, geen database.
 */

/** Voorstellen, geen keurslijf: het veld blijft vrije tekst (een marktkraam heeft geen frituur). */
export const SHIFT_POSTS: readonly string[] = [
  "Opbouw",
  "Bar",
  "Kassa",
  "Frituur",
  "Keuken",
  "Bediening",
  "Afwas",
  "Onthaal",
  "Afbraak",
] as const;

export interface Shift {
  id: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  post: string;
  personName: string;
  sortOrder: number;
}

const WEEKDAGEN = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
] as const;

/** "16:00 – 20:00", "vanaf 16:00", "tot 20:00" of "hele dag". */
export function formatShiftTime(start: string | null, eind: string | null): string {
  if (start && eind) return `${start} – ${eind}`;
  if (start) return `vanaf ${start}`;
  if (eind) return `tot ${eind}`;
  return "hele dag";
}

/** "2026-11-14" → "zaterdag 14/11/2026". Op de middag in UTC gelezen, DST-veilig. */
export function dayLabel(iso: string): string {
  const [jaar, maand, dag] = iso.split("-");
  const weekdag = WEEKDAGEN[new Date(`${iso}T12:00:00Z`).getUTCDay()] ?? "";
  return `${weekdag} ${dag}/${maand}/${jaar}`;
}

export interface ShiftPostGroup<T> {
  post: string;
  shifts: T[];
}

export interface ShiftDayGroup<T> {
  date: string;
  label: string;
  posten: ShiftPostGroup<T>[];
}

/**
 * Per dag, en binnen een dag per post — zo staat het op het blad aan de muur:
 * "zaterdag, aan de bar: Katrien 16-20, Sven 20-24".
 *
 * Binnen een post staat "hele dag" vooraan: die geldt voor het hele blok en niet
 * ná het laatste uurtje.
 */
export function groupShiftsByDay<T extends Shift>(shifts: readonly T[]): ShiftDayGroup<T>[] {
  const perDag = new Map<string, T[]>();
  for (const s of shifts) {
    const lijst = perDag.get(s.date);
    if (lijst) lijst.push(s);
    else perDag.set(s.date, [s]);
  }

  return [...perDag.keys()]
    .sort()
    .map((date) => {
      const perPost = new Map<string, T[]>();
      for (const s of perDag.get(date) ?? []) {
        const lijst = perPost.get(s.post);
        if (lijst) lijst.push(s);
        else perPost.set(s.post, [s]);
      }

      return {
        date,
        label: dayLabel(date),
        posten: [...perPost.keys()]
          .sort((a, b) => a.localeCompare(b, "nl"))
          .map((post) => ({
            post,
            shifts: (perPost.get(post) ?? []).sort((a, b) => {
              if (a.startTime !== b.startTime) {
                if (!a.startTime) return -1;
                if (!b.startTime) return 1;
                return a.startTime.localeCompare(b.startTime);
              }
              if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
              return a.id - b.id;
            }),
          })),
      };
    });
}

/**
 * Hoeveel shiften, hoeveel verschillende mensen, over hoeveel dagen. Sven schat
 * 20 à 25 helpers over twee dagen — dit is het cijfer waarmee hij dat nakijkt.
 */
export function shiftSummary(
  shifts: readonly { date: string; personName: string }[],
): { shiften: number; personen: number; dagen: number } {
  const namen = new Set<string>();
  const dagen = new Set<string>();
  for (const s of shifts) {
    const naam = s.personName.trim().toLowerCase();
    if (naam) namen.add(naam);
    dagen.add(s.date);
  }
  return { shiften: shifts.length, personen: namen.size, dagen: dagen.size };
}
