import { WALK_REGULATIONS, walkRegulationsVersionLabel } from "@/lib/walkers/regulations";

/**
 * Story 10.77 — het wandelreglement als genummerde lijst. Eén weergave voor de
 * publieke pagina, het inschrijfformulier en het aanvaardscherm in de app, zodat
 * overal dezelfde versie staat.
 */

const STIJL = {
  light: {
    nummer: "shrink-0 w-7 h-7 bg-primary/10 text-primary text-sm font-bold rounded-full flex items-center justify-center mt-0.5",
    tekst: "text-text-light leading-relaxed",
  },
  dark: {
    nummer: "shrink-0 w-6 h-6 bg-white/10 text-white/80 text-xs font-bold rounded-full flex items-center justify-center mt-0.5",
    tekst: "text-sm text-white/80 leading-relaxed",
  },
} as const;

export default function WalkRegulationsList({ tone = "light" }: { tone?: "light" | "dark" }) {
  const s = STIJL[tone];
  return (
    <ol className="space-y-3">
      {WALK_REGULATIONS.map((regel, i) => (
        <li key={i} className="flex gap-3">
          <span className={s.nummer}>{i + 1}</span>
          <p className={s.tekst}>{regel}</p>
        </li>
      ))}
    </ol>
  );
}

export function WalkRegulationsVersion({ className }: { className?: string }) {
  return <p className={className}>{`Versie van ${walkRegulationsVersionLabel()}`}</p>;
}
