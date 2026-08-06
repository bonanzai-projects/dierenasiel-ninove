import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getYearOverviewData } from "@/lib/queries/events";
import { availableYears, buildYearOverview } from "@/lib/events/yearly";
import { eventStatusLabel, eventStatusPill, eventTypeLabel } from "@/lib/events/types";
import { formatAmount } from "@/lib/events/costs";
import { formatEventPeriod } from "@/lib/events/list";
import InfoButton from "@/components/beheerder/shared/InfoButton";

interface Props {
  searchParams: Promise<{ jaar?: string }>;
}

/**
 * Story 13.12 — het jaar in één tabel. Bij veertien evenementen per jaar (vraag 2)
 * is dit de plek waar losse evenementen een geschiedenis worden.
 */
export default async function JaaroverzichtPage({ searchParams }: Props) {
  const permCheck = await requirePermission("event:read");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder");
  }

  const data = await getYearOverviewData();
  const jaren = availableYears(data.events);

  const { jaar: gevraagd } = await searchParams;
  const huidig = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }).slice(0, 4);
  const gekozen =
    (gevraagd && jaren.includes(Number(gevraagd)) ? Number(gevraagd) : undefined) ??
    jaren[0] ??
    Number(huidig);

  const overzicht = buildYearOverview(data, gekozen);

  return (
    <div className="space-y-6">
      <Link href="/beheerder/evenementen" className="text-sm text-[#2d6a4f] hover:underline">
        ← Terug naar evenementen
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Jaaroverzicht</h1>
        <InfoButton title="Werken met het jaaroverzicht" label="Uitleg over het jaaroverzicht">
          <p>
            Alle evenementen van één jaar, met wat ze kostten en opbrachten. De bedragen zijn de
            <span className="font-medium"> werkelijke</span> bedragen uit het kostenblok van elke
            fiche; wat nog niet ingevuld is, telt als nul.
          </p>
          <p className="mt-2">
            Een geannuleerd evenement blijft in de lijst staan, mét zijn kosten — een afgelaste
            benefiet waarvan het voorschot weg is, heeft het jaar wél geld gekost.
          </p>
        </InfoButton>

        {jaren.length > 1 && (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {jaren.map((j) => (
              <Link
                key={j}
                href={`/beheerder/evenementen/jaaroverzicht?jaar=${j}`}
                className={`rounded-lg border px-3 py-1 text-sm font-medium ${
                  j === gekozen
                    ? "border-[#1b4332] bg-[#1b4332] text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {j}
              </Link>
            ))}
          </div>
        )}
      </div>

      {overzicht.rijen.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">Er staat nog geen enkel evenement in {gekozen}.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Evenementen", waarde: String(overzicht.totalen.aantal) },
              { label: "Kosten", waarde: formatAmount(overzicht.totalen.kosten) },
              { label: "Opbrengsten", waarde: formatAmount(overzicht.totalen.opbrengsten) },
              { label: "Netto", waarde: formatAmount(overzicht.totalen.netto) },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{k.label}</p>
                <p
                  className={`mt-1 text-lg font-semibold tabular-nums ${
                    k.label === "Netto" && overzicht.totalen.netto < 0
                      ? "text-red-700"
                      : "text-[#1b4332]"
                  }`}
                >
                  {k.waarde}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <caption className="sr-only">Evenementen van {gekozen}</caption>
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th scope="col" className="px-4 py-2 font-medium">Evenement</th>
                  <th scope="col" className="px-4 py-2 font-medium">Wanneer</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Bezoekers</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Kosten</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Opbrengsten</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Netto</th>
                </tr>
              </thead>
              <tbody>
                {overzicht.rijen.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/beheerder/evenementen/${r.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {r.naam}
                      </Link>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-gray-500">{eventTypeLabel(r.type)}</span>
                        {r.status !== "afgelopen" && (
                          <span
                            className={`rounded-full border px-1.5 text-[10px] font-medium ${eventStatusPill(r.status)}`}
                          >
                            {eventStatusLabel(r.status)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{formatEventPeriod(r)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {r.bezoekers ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {formatAmount(r.kosten)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {formatAmount(r.opbrengsten)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium tabular-nums ${
                        r.netto < 0 ? "text-red-700" : "text-gray-900"
                      }`}
                    >
                      {formatAmount(r.netto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 font-semibold">
                  <td className="px-4 py-2" colSpan={2}>Totaal {gekozen}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {overzicht.totalen.bezoekers || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatAmount(overzicht.totalen.kosten)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatAmount(overzicht.totalen.opbrengsten)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      overzicht.totalen.netto < 0 ? "text-red-700" : "text-[#1b4332]"
                    }`}
                  >
                    {formatAmount(overzicht.totalen.netto)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
