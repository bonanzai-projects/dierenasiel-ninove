"use client";

import { useEffect, useRef, useState } from "react";
import type { Kennel, Animal } from "@/types";
import type { KennelWithOccupancy } from "@/lib/queries/kennels";
import { resolveKennelTilePhotos } from "@/lib/kennels/tile-photos";

interface KennelFloorPlanProps {
  occupancy: KennelWithOccupancy[];
  animalsByKennel: Record<number, Animal[]>;
  // Story 10.19: kennel die in de zijbalk wordt bewerkt → blauwe ring.
  editingKennelId?: number | null;
  // Geselecteerde kennel (voor detail-paneel rechts) — gelift naar parent.
  selectedKennelId?: number | null;
  // Story 10.24: kennel waar een gezocht dier zit → amber pulse + auto-scroll.
  highlightedKennelId?: number | null;
  onSelectKennel?: (kennel: Kennel) => void;
  // Story 10.19+: laag-filter linksboven op grondplan.
  activeLayer?: number;
  availableLayers?: number[];
  onLayerChange?: (layer: number) => void;
}

function getOccupancyColor(count: number, capacity: number): string {
  if (count === 0) return "bg-emerald-400/60 border-emerald-600 hover:bg-emerald-400/80";
  if (count < capacity) return "bg-amber-400/60 border-amber-600 hover:bg-amber-400/80";
  return "bg-red-400/60 border-red-600 hover:bg-red-400/80";
}

// numeric kolommen komen als string uit pg/Drizzle; converteer naar number.
function num(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default function KennelFloorPlan({
  occupancy,
  animalsByKennel,
  editingKennelId = null,
  selectedKennelId = null,
  highlightedKennelId = null,
  onSelectKennel,
  activeLayer,
  availableLayers,
  onLayerChange,
}: KennelFloorPlanProps) {
  const positioned = occupancy.filter(
    (o) => o.kennel.posX !== null && o.kennel.posY !== null && o.kennel.posW !== null && o.kennel.posH !== null,
  );

  // Story 10.24: ref-map voor scroll-naar-kennel bij zoekfunctie.
  const tileRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (highlightedKennelId === null) return;
    const el = tileRefs.current.get(highlightedKennelId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [highlightedKennelId, activeLayer]);

  // Sven heeft soms hokken die op een hogere laag staan — toon altijd minstens
  // de gangbare set 1/2/3 zodat hij snel een nieuwe laag kan activeren.
  const layersToShow = (() => {
    const set = new Set<number>(availableLayers ?? []);
    [1, 2, 3].forEach((n) => set.add(n));
    return Array.from(set).sort((a, b) => a - b);
  })();

  return (
    <div className="space-y-4">
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/grondplan-kennels.png"
          alt="Grondplan kennels"
          className="w-full rounded-xl border border-gray-200 shadow-sm"
          draggable={false}
        />

        {/* Story 10.19+: laag-keuze linksboven (klikbare nummers). */}
        {onLayerChange && (
          <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm backdrop-blur">
            <span className="font-medium text-gray-500">Laag:</span>
            {layersToShow.map((layer, idx) => (
              <span key={layer} className="flex items-center">
                {idx > 0 && <span className="px-0.5 text-gray-300">/</span>}
                <button
                  type="button"
                  onClick={() => onLayerChange(layer)}
                  aria-pressed={activeLayer === layer}
                  className={`rounded px-1.5 py-0.5 transition-colors ${
                    activeLayer === layer
                      ? "bg-[#1b4332] font-semibold text-white"
                      : "text-[#1b4332] hover:bg-emerald-100"
                  }`}
                >
                  {layer}
                </button>
              </span>
            ))}
          </div>
        )}

        {positioned.map(({ kennel, count }) => (
          <KennelTile
            key={kennel.id}
            kennel={kennel}
            count={count}
            animals={animalsByKennel[kennel.id] ?? []}
            isEditing={editingKennelId === kennel.id}
            isSelected={selectedKennelId === kennel.id}
            isHighlighted={highlightedKennelId === kennel.id}
            onSelect={onSelectKennel}
            registerRef={(el) => {
              if (el) tileRefs.current.set(kennel.id, el);
              else tileRefs.current.delete(kennel.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface KennelTileProps {
  kennel: Kennel;
  count: number;
  animals: Animal[];
  isEditing: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  onSelect?: (kennel: Kennel) => void;
  registerRef?: (el: HTMLButtonElement | null) => void;
}

function KennelTile({ kennel, count, animals, isEditing, isSelected, isHighlighted = false, onSelect, registerRef }: KennelTileProps) {
  const x = num(kennel.posX)!;
  const y = num(kennel.posY)!;
  const w = num(kennel.posW)!;
  const h = num(kennel.posH)!;
  const colorClasses = getOccupancyColor(count, kennel.capacity);

  // Foto's van dieren in dit hok — voor de carrousel. Hoofdfoto met terugval op
  // de eerste geüploade foto zodat ook honden zonder gemarkeerde hoofdfoto tonen.
  const photos = resolveKennelTilePhotos(animals);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Story 10.19+: bij meerdere dieren in 1 hok → cycle elke 3.5s tussen foto's.
  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % photos.length);
    }, 3500);
    return () => clearInterval(id);
  }, [photos.length]);

  // Reset bij animals-array wijziging om out-of-bounds te vermijden.
  useEffect(() => {
    if (photoIndex >= photos.length) setPhotoIndex(0);
  }, [photos.length, photoIndex]);

  const hasPhoto = photos.length > 0;
  const currentPhoto = photos[photoIndex];

  return (
    <button
      ref={registerRef}
      type="button"
      onClick={() => onSelect?.(kennel)}
      aria-label={`Kennel ${kennel.code}: ${count} van ${kennel.capacity} bezet`}
      className={`absolute overflow-hidden rounded border-2 text-xs font-bold transition-all ${
        hasPhoto ? "bg-white" : colorClasses
      } ${
        isHighlighted
          ? "ring-4 ring-amber-400 ring-offset-1 animate-pulse"
          : isEditing
            ? "ring-2 ring-blue-500 ring-offset-1 animate-pulse"
            : isSelected
              ? "ring-2 ring-blue-500 ring-offset-1"
              : ""
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
      }}
      title={`${kennel.code} — ${count}/${kennel.capacity} — x:${x.toFixed(1)} y:${y.toFixed(1)} w:${w.toFixed(1)} h:${h.toFixed(1)}${currentPhoto ? ` — ${currentPhoto.name}` : ""}`}
    >
      {hasPhoto && (
        <div className="absolute inset-0 overflow-hidden">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="absolute inset-0 transition-transform duration-700 ease-in-out"
              style={{
                backgroundImage: `url(${photo.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: `translateX(${(idx - photoIndex) * 100}%)`,
              }}
              aria-hidden="true"
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent"
          />
        </div>
      )}
      <span
        className={`absolute inset-x-0 bottom-1 z-10 flex flex-col items-center text-[10px] leading-tight sm:text-xs ${
          hasPhoto ? "text-white drop-shadow" : "text-gray-900"
        }`}
      >
        <span>{kennel.code}</span>
        <span className={`text-[9px] sm:text-[10px] ${hasPhoto ? "text-white/90" : "text-gray-700"}`}>
          {count}/{kennel.capacity}
        </span>
      </span>
    </button>
  );
}
