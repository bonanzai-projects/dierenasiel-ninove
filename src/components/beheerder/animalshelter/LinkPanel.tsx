"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ignoreAnimalShelterAnimal,
  linkAnimalShelterAnimal,
} from "@/lib/actions/animalshelter";

/**
 * Story 11.5 — handmatig koppelen, ontkoppelen en een extern dier bewust negeren.
 *
 * Dit is de uitweg voor alles wat de automatische matching niet kan of niet mag
 * beslissen: dieren zonder chip, dubbele chips, en dieren die bij AnimalShelter
 * staan maar bij ons niet thuishoren.
 */

interface Props {
  externalId: number;
  animalId: number | null;
  localName: string | null;
  kandidaten: { id: number; name: string; species: string | null }[];
  genegeerd: boolean;
}

export default function LinkPanel({
  externalId,
  animalId,
  localName,
  kandidaten,
  genegeerd,
}: Props) {
  const router = useRouter();
  const [bezig, startTransition] = useTransition();
  const [keuze, setKeuze] = useState("");
  const [fout, setFout] = useState<string | null>(null);

  function voerUit(actie: () => Promise<{ success: boolean; error?: string }>) {
    setFout(null);
    startTransition(async () => {
      const result = await actie();
      if (!result.success) {
        setFout(result.error ?? "Er ging iets mis.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <h2 className="font-heading text-sm font-semibold text-[#1b4332]">Koppeling</h2>

      {animalId ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-700">
            Gekoppeld aan{" "}
            <Link href={`/beheerder/dieren/${animalId}`} className="font-medium text-[#1b4332] hover:underline">
              {localName}
            </Link>
            .
          </p>
          <button
            type="button"
            disabled={bezig}
            onClick={() => voerUit(() => linkAnimalShelterAnimal(externalId, null))}
            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Koppeling losmaken
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Dit dier is nog niet aan een fiche gekoppeld.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="koppel-dier" className="sr-only">
              Koppelen aan een dier
            </label>
            <select
              id="koppel-dier"
              value={keuze}
              onChange={(e) => setKeuze(e.target.value)}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Kies een dier uit onze database…</option>
              {kandidaten.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                  {k.species ? ` (${k.species})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bezig || !keuze}
              onClick={() => voerUit(() => linkAnimalShelterAnimal(externalId, Number(keuze)))}
              className="rounded-lg bg-[#1b4332] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
            >
              Koppelen
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          disabled={bezig}
          onClick={() => voerUit(() => ignoreAnimalShelterAnimal(externalId, !genegeerd))}
          className="text-xs text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
        >
          {genegeerd
            ? "Dit dier niet meer negeren"
            : "Dit dier negeren (hoort niet bij onze werking)"}
        </button>
      </div>

      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {fout}
        </p>
      )}
    </div>
  );
}
