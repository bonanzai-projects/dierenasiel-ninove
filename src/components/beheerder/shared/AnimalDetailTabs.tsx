"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { type ReactNode, useCallback } from "react";
import { hasUnsavedChanges } from "@/lib/forms/unsaved-changes";

const TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "medisch", label: "Medisch" },
  { key: "zorg", label: "Zorg & Opvolging" },
  { key: "bestanden", label: "Bestanden" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

interface AnimalDetailTabsProps {
  children: Record<TabKey, ReactNode>;
  openTodoCount?: number;
}

export default function AnimalDetailTabs({
  children,
  openTodoCount = 0,
}: AnimalDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = (searchParams.get("tab") as TabKey) || "overzicht";
  const isValidTab = TABS.some((t) => t.key === activeTab);
  const currentTab = isValidTab ? activeTab : "overzicht";

  const setTab = useCallback(
    (tab: TabKey) => {
      // Story 10.33: van tabblad wisselen unmount het bewerkformulier en gooit
      // niet-opgeslagen invoer weg. Eerst bevestigen.
      if (hasUnsavedChanges()) {
        const proceed = window.confirm(
          "Je hebt niet-opgeslagen wijzigingen. Als je van tabblad wisselt, gaan die verloren.\n\nToch wisselen?",
        );
        if (!proceed) return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overzicht") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return (
    <div>
      {/* Tab bar — lichte huisstijl-tint met rand: duidelijk als menustrook
          herkenbaar, zonder de felheid van een volvlakse donkergroene balk. */}
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-emerald-200 bg-[#e8f2ec] p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-all ${
              currentTab === tab.key
                ? "bg-white text-[#1b4332] shadow ring-1 ring-emerald-200"
                : "text-[#2d6a4f] hover:bg-white/60 hover:text-[#1b4332]"
            }`}
          >
            {tab.label}
            {tab.key === "zorg" && openTodoCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
                {openTodoCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">{children[currentTab]}</div>
    </div>
  );
}
