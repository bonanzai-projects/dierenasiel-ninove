"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import KennelFloorPlan from "./KennelFloorPlan";
import KennelSidebarList from "./KennelSidebarList";
import KennelCreateForm from "./KennelCreateForm";
import KennelDetailPanel from "./KennelDetailPanel";
import { SPECIES_LABELS } from "@/lib/constants";
import type { Animal, Kennel } from "@/types";
import type { KennelWithOccupancy } from "@/lib/queries/kennels";

interface Props {
  kennels: Kennel[];
  occupancy: KennelWithOccupancy[];
  animalsByKennel: Record<number, Animal[]>;
  allAnimals: Animal[];
}

export default function KennelLayoutManager({
  kennels,
  occupancy,
  animalsByKennel,
  allAnimals,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedKennel, setSelectedKennel] = useState<Kennel | null>(null);
  const [activeLayer, setActiveLayer] = useState<number>(1);
  // Story 10.24: zoekfunctie state
  const [highlightedKennelId, setHighlightedKennelId] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  // Story 10.45: het grondplan groot in een venster, zonder de zijkolommen.
  const [planOpVolledigScherm, setPlanOpVolledigScherm] = useState(false);

  // Story 10.19+: bepaal welke lagen daadwerkelijk in gebruik zijn (sorteer oplopend).
  const availableLayers = useMemo(() => {
    const set = new Set<number>();
    kennels.forEach((k) => set.add(k.layer ?? 1));
    if (set.size === 0) set.add(1);
    return Array.from(set).sort((a, b) => a - b);
  }, [kennels]);

  // Story 10.24: alfabetisch gesorteerde dieren-lijst voor dropdown.
  const sortedAnimals = useMemo(() => {
    return [...allAnimals].sort((a, b) =>
      a.name.localeCompare(b.name, "nl", { sensitivity: "base" }),
    );
  }, [allAnimals]);

  const filteredKennels = kennels.filter((k) => (k.layer ?? 1) === activeLayer);
  const filteredOccupancy = occupancy.filter((o) => (o.kennel.layer ?? 1) === activeLayer);

  // Story 10.24: highlight verdwijnt na 1.5s.
  useEffect(() => {
    if (highlightedKennelId === null) return;
    const id = setTimeout(() => setHighlightedKennelId(null), 1500);
    return () => clearTimeout(id);
  }, [highlightedKennelId]);

  // Story 10.24: zoekmelding verdwijnt na 3s.
  useEffect(() => {
    if (searchMessage === null) return;
    const id = setTimeout(() => setSearchMessage(null), 3000);
    return () => clearTimeout(id);
  }, [searchMessage]);

  // Story 10.45: Escape sluit het venster — zelfde gewoonte als elders in de backoffice.
  useEffect(() => {
    if (!planOpVolledigScherm) return;
    function opToets(e: KeyboardEvent) {
      if (e.key === "Escape") setPlanOpVolledigScherm(false);
    }
    document.addEventListener("keydown", opToets);
    return () => document.removeEventListener("keydown", opToets);
  }, [planOpVolledigScherm]);

  function handleAnimalSearch(animalIdRaw: string) {
    setSearchValue(animalIdRaw);
    if (!animalIdRaw) {
      setSearchMessage(null);
      return;
    }
    const animalId = Number(animalIdRaw);
    const animal = allAnimals.find((a) => a.id === animalId);
    if (!animal) return;
    if (animal.kennelId === null || animal.kennelId === undefined) {
      setSelectedKennel(null);
      setHighlightedKennelId(null);
      setSearchMessage("Dit dier zit (nog) niet in een kennel");
      // M3: reset dropdown zodat user dezelfde "no-kennel" dier opnieuw kan
      // proberen of een ander dier kan kiezen zonder eerst placeholder te kiezen.
      setSearchValue("");
      return;
    }
    const kennel = kennels.find((k) => k.id === animal.kennelId);
    if (!kennel) {
      setSelectedKennel(null);
      setHighlightedKennelId(null);
      setSearchMessage("Dit dier zit (nog) niet in een kennel");
      setSearchValue("");
      return;
    }
    setSearchMessage(null);
    const layer = kennel.layer ?? 1;
    if (layer !== activeLayer) setActiveLayer(layer);
    setSelectedKennel(kennel);
    setHighlightedKennelId(kennel.id);
  }

  // Story 10.45: het plan wordt op twee plaatsen getoond (in de pagina en op
  // volledig scherm). Alleen de klik op een hok verschilt, de rest blijft gelijk.
  const planEigenschappen = {
    occupancy: filteredOccupancy,
    animalsByKennel,
    editingKennelId: editingId,
    selectedKennelId: selectedKennel?.id ?? null,
    highlightedKennelId,
    activeLayer,
    availableLayers,
    onLayerChange: (l: number) => {
      setActiveLayer(l);
      setSelectedKennel(null);
      setEditingId(null);
    },
  };

  return (
    // 2-rijen grid op lg: rij 1 = legende/zoek (alleen middenkolom), rij 2 =
    // grondplan + detailpaneel. Zo lijnen de bovenkant van het grondplan en
    // van het 'Kennel bezetting'-paneel exact uit (geen magische pixels).
    <div className="grid items-start gap-4 lg:grid-cols-[280px_1fr_320px] lg:grid-rows-[auto_minmax(0,1fr)]">
      {/* Linker kolom: blijft vast in beeld; overspant beide rijen. */}
      <div className="order-3 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <KennelCreateForm defaultLayer={activeLayer} />
        <KennelSidebarList
          kennels={filteredKennels}
          editingId={editingId}
          onEditingChange={setEditingId}
          onSelectKennel={setSelectedKennel}
        />
      </div>

      {/* Legende + zoek — rij 1, middenkolom. Houdt rij 2 (grondplan + paneel) uitgelijnd. */}
      <div className="order-1 flex flex-wrap items-center gap-4 text-sm lg:order-none lg:col-start-2 lg:row-start-1">
        <div className="flex items-center gap-2">
          <label htmlFor="kennel-search-animal" className="font-semibold text-[#1b4332]">
            Zoek:
          </label>
          <select
            id="kennel-search-animal"
            value={searchValue}
            onChange={(e) => handleAnimalSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          >
            <option value="">— Kies dier —</option>
            {sortedAnimals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({SPECIES_LABELS[a.species] ?? a.species})
              </option>
            ))}
          </select>
        </div>
        <span aria-hidden="true" className="hidden h-5 w-px bg-gray-300 sm:block" />
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded border border-emerald-600 bg-emerald-400/60" />
          <span>Leeg</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded border border-amber-600 bg-amber-400/60" />
          <span>Deels bezet</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded border border-red-600 bg-red-400/60" />
          <span>Vol</span>
        </div>
        <button
          type="button"
          onClick={() => setPlanOpVolledigScherm(true)}
          className="ml-auto rounded-md border border-[#1b4332] px-2.5 py-1 text-sm font-medium text-[#1b4332] transition-colors hover:bg-emerald-50"
        >
          ⛶ Volledig scherm
        </button>
      </div>

      {/* Grondplan — rij 2, middenkolom. */}
      <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-2">
        {searchMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900"
          >
            {searchMessage}
          </div>
        )}
        <KennelFloorPlan {...planEigenschappen} onSelectKennel={setSelectedKennel} />
      </div>

      {/* Rechter kolom: detailpaneel — rij 2 zodat de bovenkant uitlijnt met het grondplan. */}
      <div className="order-4 space-y-4 lg:order-none lg:col-start-3 lg:row-start-2 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto lg:pl-1">
        {selectedKennel && (
          <KennelDetailPanel
            kennel={selectedKennel}
            animals={animalsByKennel[selectedKennel.id] ?? []}
            allAnimals={allAnimals}
            onClose={() => setSelectedKennel(null)}
          />
        )}
      </div>

      {/*
        Story 10.45 — het plan groot in beeld, zonder de zijkolommen. Een klik op
        een hok doet hetzelfde als in de gewone weergave: het venster gaat dicht
        en het detailpaneel van dat hok staat open.

        Story 10.46 — het plan neemt de volle breedte; wat er niet op past lees
        je al scrollend. In de hoogte persen maakte de vakjes niet groter, want
        het plan is staand en schermen zijn liggend.
      */}
      {planOpVolledigScherm &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Grondplan op volledig scherm"
            className="fixed inset-0 z-[90] overflow-y-auto bg-black/85"
            onClick={() => setPlanOpVolledigScherm(false)}
          >
            <button
              type="button"
              onClick={() => setPlanOpVolledigScherm(false)}
              className="fixed right-4 top-4 z-10 rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-800 shadow hover:bg-white"
            >
              Sluiten
            </button>
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              <KennelFloorPlan
                {...planEigenschappen}
                onSelectKennel={(kennel) => {
                  setSelectedKennel(kennel);
                  setPlanOpVolledigScherm(false);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
