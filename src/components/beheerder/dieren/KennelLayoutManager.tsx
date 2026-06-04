"use client";

import { useEffect, useMemo, useState } from "react";
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
        <KennelFloorPlan
          occupancy={filteredOccupancy}
          animalsByKennel={animalsByKennel}
          editingKennelId={editingId}
          selectedKennelId={selectedKennel?.id ?? null}
          highlightedKennelId={highlightedKennelId}
          onSelectKennel={setSelectedKennel}
          activeLayer={activeLayer}
          availableLayers={availableLayers}
          onLayerChange={(l) => {
            setActiveLayer(l);
            setSelectedKennel(null);
            setEditingId(null);
          }}
        />
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
    </div>
  );
}
