type Status = "done" | "review" | "in-progress" | "ready-for-dev" | "backlog";

interface Story {
  id: string;
  title: string;
  status: Status;
}

interface Epic {
  id: number;
  title: string;
  status: "done" | "in-progress" | "backlog";
  stories: Story[];
}

const EPICS: Epic[] = [
  {
    id: 1,
    title: "Backoffice Toegang & Dashboard",
    status: "done",
    stories: [
      { id: "1.1", title: "Beheerder Authenticatie en Sessiebeveiliging", status: "done" },
      { id: "1.2", title: "Rolgebaseerde Toegangscontrole (RBAC)", status: "done" },
      { id: "1.3", title: "Beheerder Layout met Sidebar Navigatie", status: "done" },
      { id: "1.4", title: "Audit Logging Systeem", status: "done" },
      { id: "1.5", title: "Dashboard met Basisoverzicht en Alerts", status: "done" },
    ],
  },
  {
    id: 2,
    title: "Dierenbeheer & Intake",
    status: "done",
    stories: [
      { id: "2.1", title: "Dier Registreren bij Intake", status: "done" },
      { id: "2.2", title: "Dierenoverzicht met Zoek- en Filterfunctie", status: "done" },
      { id: "2.3", title: "Dier Profiel Bewerken en Websitemarkering", status: "done" },
      { id: "2.4", title: "Foto's en Bijlagen Uploaden", status: "done" },
      { id: "2.5", title: "Kennel Toewijzing en Beheer", status: "done" },
      { id: "2.6", title: "Status Wijzigen en Uitstroom Registreren", status: "done" },
      { id: "2.7", title: "IBN-intake met 60-dagen Deadline", status: "done" },
      { id: "2.8", title: "Verwaarlozing Rapport bij IBN", status: "done" },
      { id: "2.9", title: "Gedragsfiches Invullen (wekelijks per hond)", status: "done" },
      { id: "2.10", title: "Voedingsplan per Dier", status: "done" },
    ],
  },
  {
    id: 3,
    title: "Medische Opvolging",
    status: "done",
    stories: [
      { id: "3.1", title: "Vaccinaties en Ontwormingen Registreren", status: "done" },
      { id: "3.2", title: "Dierenarts Bezoeken Loggen", status: "done" },
      { id: "3.3", title: "Operaties Registreren", status: "done" },
      { id: "3.4", title: "Medicatie Voorschrijven", status: "done" },
      { id: "3.5", title: "Medicatie Dagelijks Afvinken", status: "done" },
      { id: "3.6", title: "To-do Lijst per Dier", status: "done" },
      { id: "3.7", title: "Medische Alerts op Dashboard", status: "done" },
      { id: "3.8", title: "Bezoekrapport Contractdierenarts", status: "done" },
    ],
  },
  {
    id: 4,
    title: "Adoptieproces",
    status: "done",
    stories: [
      { id: "4.1", title: "Adoptie-aanvraag Ontvangen en Screenen", status: "done" },
      { id: "4.2", title: "Kandidaat-adoptant Categoriseren", status: "done" },
      { id: "4.3", title: "Kennismaking Organiseren", status: "done" },
      { id: "4.4", title: "Adoptiecontract Opmaken", status: "done" },
      { id: "4.5", title: "DogID/CatID Overdracht (Automatische Taak)", status: "done" },
      { id: "4.6", title: "Post-adoptie Opvolging", status: "done" },
    ],
  },
  {
    id: 5,
    title: "Wandelaarsbeheer",
    status: "done",
    stories: [
      { id: "5.1", title: "Wandelaar Online Registratie", status: "done" },
      { id: "5.2", title: "Wandelaar Profiel Beheren en Goedkeuren", status: "done" },
      { id: "5.3", title: "Wandeling Boeken", status: "done" },
      { id: "5.4", title: "Wandeling Inchecken en Uitchecken", status: "done" },
      { id: "5.5", title: "Wandelgeschiedenis en Statistieken", status: "done" },
      { id: "5.6", title: "Wandelclub", status: "done" },
      { id: "5.7", title: "Realtime Wandeloverzicht", status: "done" },
    ],
  },
  {
    id: 6,
    title: "Workflow Engine",
    status: "done",
    stories: [
      { id: "6.1", title: "Workflow Instellingen en Feature Toggles", status: "done" },
      { id: "6.2", title: "Workflow Fase-overgang Engine", status: "done" },
      { id: "6.3", title: "Transition Guards met Override", status: "done" },
      { id: "6.4", title: "Automatische Acties bij Fase-overgang", status: "done" },
      { id: "6.5", title: "Visuele Stappenbalk op Dierprofiel", status: "done" },
      { id: "6.6", title: "Workflow Historie Bekijken", status: "done" },
    ],
  },
  {
    id: 7,
    title: "Rapportage & Mailing",
    status: "done",
    stories: [
      { id: "7.1", title: "Rapportage Framework en Dierenoverzicht", status: "done" },
      { id: "7.2", title: "Medische en Wettelijke Rapporten", status: "done" },
      { id: "7.3", title: "Adoptie, Kennel en Publicatierapporten", status: "done" },
      { id: "7.4", title: "Wandel- en Workflow Rapporten", status: "done" },
      { id: "7.5", title: "Mailinglijsten en Opvolgingsmails", status: "done" },
    ],
  },
  {
    id: 8,
    title: "GDPR & Compliance",
    status: "done",
    stories: [
      { id: "8.1", title: "Persoonsgegevens Anonimiseren", status: "done" },
      { id: "8.2", title: "Persoonsgegevens Exporteren", status: "done" },
      { id: "8.3", title: "Bewaartermijnen Monitoring en Data Minimalisatie", status: "done" },
    ],
  },
  {
    id: 9,
    title: "Zwerfkattenbeleid",
    status: "done",
    stories: [
      { id: "9.1", title: "Zwerfkat-campagne Registreren en Opvolgen", status: "done" },
      { id: "9.2", title: "Zwerfkattenbeleid Overzicht en Filters", status: "done" },
      { id: "9.3", title: "Zwerfkattenbeleid Rapportage", status: "done" },
    ],
  },
  {
    id: 10,
    title: "Klantfeedback Sven (post-go-live iteratie 2)",
    status: "in-progress",
    stories: [
      { id: "10.1", title: "Dashboard: adoptie via uitstroomregistratie verschijnt niet bij recente adopties", status: "done" },
      { id: "10.2", title: "Adoptie-formulier behoudt ingevulde velden bij validatiefout", status: "done" },
      { id: "10.3", title: "Fix stale tests voor kennismakingen animalId-validatie", status: "done" },
      { id: "10.4", title: "Scroll-to-first-error UX op adoptie-formulier", status: "done" },
      { id: "10.5", title: "Dashboard bucket '(nog) niet ter adoptie' in Dieren per Status", status: "done" },
      { id: "10.6", title: "Kolom 'Ter adoptie' op dierenoverzicht", status: "done" },
      { id: "10.7", title: "Kooinummer-picker met uniekheid per actieve zwerfkat-campagne + klikbare rij op overzicht", status: "done" },
      { id: "10.8", title: "Dashboard-widget: lopende zwerfkat-opdrachten", status: "done" },
      { id: "10.9", title: "Inspectie-log: meerdere inspecties per zwerfkat-campagne (incl. lege)", status: "done" },
      { id: "10.10", title: "Bezoekrapport: diagnose-keuzelijst met uitbreidbare suggesties", status: "done" },
      { id: "10.11", title: "Beheerder-intake: link naar publiek adoptie-formulier (balie/telefoon)", status: "done" },
      { id: "10.12", title: "Dierfoto's op kennel-grondplan + demo-backfill", status: "done" },
      { id: "10.13", title: "Wandeldagen weekpatroon (instelbaar via /instellingen, validatie bij boeking)", status: "done" },
      { id: "10.14", title: "Admin wandelaar-intake: reglement-checkbox + kinderen-vraag", status: "done" },
      { id: "10.15", title: "Wandelaar reactiveren na desactivatie", status: "done" },
      { id: "10.16", title: "Dashboard tile Recente adoptie aanvragen", status: "done" },
      { id: "10.17", title: "Mails van gemeente uploaden bij zwerfkat-campagne", status: "done" },
      { id: "10.18", title: "Gemeente-logo bibliotheek voor zwerfkat-module", status: "done" },
      { id: "10.19", title: "Kennel positie-beheer met live trial & error", status: "done" },
      { id: "10.20", title: "Adoptiecontracten — tabbladen, status-workflow, upload + digitaal handtekenen", status: "done" },
    ],
  },
];

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; icon: string }> = {
  done: { label: "Afgerond", bg: "bg-emerald-100", text: "text-emerald-800", icon: "check-circle" },
  review: { label: "In review", bg: "bg-blue-100", text: "text-blue-800", icon: "eye" },
  "in-progress": { label: "In ontwikkeling", bg: "bg-amber-100", text: "text-amber-800", icon: "code" },
  "ready-for-dev": { label: "Klaar voor dev", bg: "bg-purple-100", text: "text-purple-800", icon: "arrow-right" },
  backlog: { label: "Gepland", bg: "bg-gray-100", text: "text-gray-500", icon: "clock" },
};

function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function EpicStatusBadge({ status }: { status: "done" | "in-progress" | "backlog" }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    done: { label: "Afgerond", bg: "bg-emerald-100", text: "text-emerald-800" },
    "in-progress": { label: "Actief", bg: "bg-amber-100", text: "text-amber-800" },
    backlog: { label: "Gepland", bg: "bg-gray-100", text: "text-gray-500" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600">
        {done}/{total}
      </span>
    </div>
  );
}

export default function VoortgangPage() {
  const allStories = EPICS.flatMap((e) => e.stories);
  const totalStories = allStories.length;
  const doneStories = allStories.filter((s) => s.status === "done").length;
  const reviewStories = allStories.filter((s) => s.status === "review").length;
  const inProgressStories = allStories.filter((s) => s.status === "in-progress").length;
  const lastDone = [...allStories].reverse().find((s) => s.status === "done");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
        Projectvoortgang
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Overzicht van alle epics en stories voor het Dierenasiel Ninove platform.
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Totaal stories</p>
          <p className="mt-1 text-2xl font-bold text-[#1b4332]">{totalStories}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">Afgerond</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{doneStories}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">In review</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{reviewStories}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">In ontwikkeling</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{inProgressStories}</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Totale voortgang</h2>
          {lastDone && (
            <span className="text-xs text-gray-400">
              Laatst afgerond: Story {lastDone.id}
            </span>
          )}
        </div>
        <div className="mt-3">
          <ProgressBar done={doneStories} total={totalStories} />
        </div>
      </div>

      {/* Epics */}
      <div className="mt-8 space-y-6">
        {EPICS.map((epic) => {
          const epicDone = epic.stories.filter((s) => s.status === "done").length;
          return (
            <div
              key={epic.id}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
            >
              {/* Epic header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b4332] text-xs font-bold text-white">
                    {epic.id}
                  </span>
                  <h3 className="font-heading text-sm font-bold text-[#1b4332]">
                    {epic.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-gray-400 sm:inline">
                    {epicDone}/{epic.stories.length} stories
                  </span>
                  <EpicStatusBadge status={epic.status} />
                </div>
              </div>

              {/* Epic progress bar */}
              <div className="px-5 pt-3">
                <ProgressBar done={epicDone} total={epic.stories.length} />
              </div>

              {/* Stories list */}
              <div className="divide-y divide-gray-50 px-5 pb-2 pt-2">
                {epic.stories.map((story) => (
                  <div
                    key={story.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      {story.status === "done" ? (
                        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : story.status === "backlog" ? (
                        <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className={`text-sm ${story.status === "done" ? "text-gray-500 line-through" : story.status === "backlog" ? "text-gray-400" : "font-medium text-gray-700"}`}>
                        <span className="font-mono text-xs text-gray-400">{story.id}</span>{" "}
                        {story.title}
                      </span>
                    </div>
                    <StatusBadge status={story.status} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pb-8 text-center text-xs text-gray-400">
        Laatst bijgewerkt: 4 maart 2026
      </div>
    </div>
  );
}
