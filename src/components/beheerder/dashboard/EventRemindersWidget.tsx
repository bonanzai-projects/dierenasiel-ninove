import Link from "next/link";
import { getEventTaskReminders } from "@/lib/queries/events";
import { reminderCounts, type Reminder } from "@/lib/events/reminders";

/**
 * Story 13.8 — het seintje dat Sven vroeg: draaiboektaken die te laat zijn of
 * eraan komen, op de plek waar hij toch elke dag kijkt.
 */
function pill(urgency: Reminder["urgency"]): string {
  if (urgency === "verlopen") return "text-red-700 bg-red-100";
  if (urgency === "vandaag") return "text-orange-700 bg-orange-100";
  return "text-yellow-700 bg-yellow-100";
}

export default async function EventRemindersWidget() {
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const alle = await getEventTaskReminders(vandaag);
  const tellers = reminderCounts(alle);
  // Meer dan acht regels maakt van een seintje een tweede takenlijst.
  const zichtbaar = alle.slice(0, 8);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎉</span>
        <h3 className="font-heading text-sm font-bold text-[#1b4332]">Evenementen — timing</h3>
        {tellers.verlopen > 0 && (
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            {tellers.verlopen} te laat
          </span>
        )}
      </div>

      {tellers.totaal === 0 ? (
        <p className="mt-4 text-center text-sm text-gray-400">
          Niets dat aandacht vraagt de komende twee weken
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {zichtbaar.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/beheerder/evenementen/${r.eventId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-800">{r.title}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {[r.eventName, r.responsible].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${pill(r.urgency)}`}
                  >
                    {r.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {alle.length > zichtbaar.length && (
            <p className="mt-2 text-center text-xs text-gray-500">
              en nog {alle.length - zichtbaar.length} andere
            </p>
          )}
        </>
      )}
    </div>
  );
}
