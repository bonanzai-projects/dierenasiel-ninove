import { WORKFLOW_PHASES } from "@/lib/workflow/phases";
import { PHASE_LABELS } from "@/lib/workflow/stepbar";

/**
 * Uitleg bij de workflow-instellingen. De faselijst komt uit dezelfde constanten
 * als de motor zelf, zodat de uitleg niet stilletjes uit de pas kan lopen.
 */
export default function WorkflowInfo() {
  return (
    <div className="space-y-4">
      <p>
        De <strong>workflow</strong> volgt het traject dat een dier bij ons aflegt, van
        binnenkomst tot afgerond dossier. Elk dier zit altijd in precies één fase, en
        die fase schuift stap voor stap op:
      </p>

      <ol aria-label="Workflow-fases" className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
        {WORKFLOW_PHASES.map((phase, i) => (
          <li key={phase} className="flex items-center gap-1">
            <span className="rounded-full bg-[#e8f2ec] px-2.5 py-1 font-medium text-[#1b4332]">
              {PHASE_LABELS[phase] ?? phase}
            </span>
            {i < WORKFLOW_PHASES.length - 1 && <span className="text-gray-400">→</span>}
          </li>
        ))}
      </ol>

      <p>
        Je kan enkel naar de <em>eerstvolgende</em> fase; overslaan of terugkeren kan niet.
        Zo blijft de geschiedenis van een dier betrouwbaar.
      </p>

      <div>
        <p className="font-semibold text-gray-900">Wat levert het op?</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>Takenlijstjes die zichzelf invullen.</strong> Bij het opschuiven naar een
            nieuwe fase maakt het systeem de gebruikelijke taken aan — bij <em>Medisch</em>
            bijvoorbeeld het eerste dierenartsbezoek, de vaccinaties, ontworming en de chip.
            Voor katten komt daar automatisch de sterilisatie bij, voor honden in de fase
            <em> Verblijf</em> de gedragsfiche.
          </li>
          <li>
            <strong>Waarschuwingen vóór een stap.</strong> Bij bepaalde overgangen kijkt het
            systeem of de wettelijke verplichtingen in orde zijn — voor katten chip,
            vaccinatie en sterilisatie vóór ze ter adoptie gaan, en een adoptiecontract vóór
            een dossier afgerond wordt.
          </li>
          <li>
            <strong>Een zichtbaar spoor.</strong> Op de dierpagina zie je in één oogopslag waar
            het dier staat en wie welke stap wanneer gezet heeft.
          </li>
        </ul>
      </div>

      <p>
        Een waarschuwing <strong>blokkeert</strong> je niet: je kan doorgaan, maar dan moet je
        een reden opgeven. Die reden komt in de historiek terecht, zodat achteraf duidelijk is
        waarom er afgeweken werd.
      </p>

      <div>
        <p className="font-semibold text-gray-900">De drie schakelaars</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>Workflow ingeschakeld</strong> — de hoofdschakelaar. Staat die uit, dan
            werkt het asiel zonder fases en doen de twee andere schakelaars niets. Bestaande
            gegevens blijven bewaard; je kan dit gerust weer aanzetten.
          </li>
          <li>
            <strong>Stappenbalk zichtbaar</strong> — toont de fases bovenaan de dierpagina.
            Zet je dit uit, dan blijft de workflow gewoon draaien, maar zien de medewerkers
            hem niet.
          </li>
          <li>
            <strong>Automatische acties</strong> — bepaalt of de taken bij een fase-overgang
            vanzelf aangemaakt worden. Uit betekent: fases blijven werken, maar de taken zet
            je zelf klaar.
          </li>
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Twijfel je? Laat de hoofdschakelaar aan staan en zet eventueel enkel de automatische
        acties uit. Zo houd je het overzicht zonder dat er taken bijkomen die je niet gebruikt.
      </p>
    </div>
  );
}
