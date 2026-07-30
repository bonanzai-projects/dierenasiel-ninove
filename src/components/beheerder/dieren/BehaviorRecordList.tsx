import { BEHAVIOR_VERZORGERS_ITEMS, BEHAVIOR_HONDEN_ITEMS } from "@/lib/constants";
import { behaviorRecorder } from "@/lib/reports/behavior-report-format";
import type { BehaviorRecordWithRecorder } from "@/types";

interface BehaviorRecordListProps {
  records: BehaviorRecordWithRecorder[];
  onEdit?: (record: BehaviorRecordWithRecorder) => void;
}

function formatBool(val: unknown): string {
  if (val === true) return "Ja";
  if (val === false) return "Nee";
  return "—";
}

function BoolBadge({ val }: { val: unknown }) {
  if (val === true) {
    return <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Ja</span>;
  }
  if (val === false) {
    return <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Nee</span>;
  }
  return <span className="text-xs text-gray-400">—</span>;
}

function PositiveBadge({ val }: { val: unknown }) {
  if (val === true) {
    return <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Ja</span>;
  }
  if (val === false) {
    return <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Nee</span>;
  }
  return <span className="text-xs text-gray-400">—</span>;
}

const POSITIVE_KEYS = new Set([
  "verzorgers_gemakkelijkWandeling",
  "verzorgers_speeltGraag",
  "honden_speeltGraag",
]);

function renderSection(
  title: string,
  items: readonly { key: string; label: string }[],
  checklist: Record<string, unknown>,
  andereKey: string,
) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-[#1b4332] uppercase tracking-wide">{title}</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            {POSITIVE_KEYS.has(item.key)
              ? <PositiveBadge val={checklist[item.key]} />
              : <BoolBadge val={checklist[item.key]} />
            }
          </div>
        ))}
      </div>
      {typeof checklist[andereKey] === "string" && checklist[andereKey] && (
        <p className="mt-1 text-xs text-gray-500">
          Andere: <span className="text-gray-700">{String(checklist[andereKey])}</span>
        </p>
      )}
    </div>
  );
}

export default function BehaviorRecordList({ records, onEdit }: BehaviorRecordListProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-500">Nog geen gedragsfiches ingevuld.</p>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => {
        const checklist = record.checklist as Record<string, unknown>;

        // Count concerning items (agressief = true)
        const allItems = [...BEHAVIOR_VERZORGERS_ITEMS, ...BEHAVIOR_HONDEN_ITEMS];
        const aggressiveCount = allItems
          .filter((i) => !POSITIVE_KEYS.has(i.key))
          .filter((i) => checklist[i.key] === true).length;

        return (
          <details
            key={record.id}
            className="rounded-lg border border-gray-200 bg-white"
          >
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-gray-800">
                  {record.date}
                </span>
                {behaviorRecorder(record) && (
                  <span className="text-xs text-gray-500">
                    Ingevuld door {behaviorRecorder(record)}
                  </span>
                )}
                {aggressiveCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {aggressiveCount} agressief
                  </span>
                )}
              </div>
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(record);
                  }}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Bewerken
                </button>
              )}
            </summary>

            <div className="border-t border-gray-100 px-4 py-3 space-y-4">
              {renderSection("1. Gedrag tegenover de verzorgers", BEHAVIOR_VERZORGERS_ITEMS, checklist, "verzorgers_andere")}
              {renderSection("2. Gedrag tegenover andere honden", BEHAVIOR_HONDEN_ITEMS, checklist, "honden_andere")}

              {record.notes && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Opmerkingen: </span>
                  <span className="text-gray-800">{record.notes}</span>
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
