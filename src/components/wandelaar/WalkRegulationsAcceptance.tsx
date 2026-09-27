"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptWalkRegulations } from "@/lib/actions/walkers";
import { WALK_REGULATIONS_TITLE } from "@/lib/walkers/regulations";
import WalkRegulationsList, { WalkRegulationsVersion } from "./WalkRegulationsList";

/**
 * Story 10.77 (Sven: "moet ondertekend worden voor de eerste wandeling") — de
 * wandelaar aanvaardt de huidige versie van het reglement vóór hij honden ziet of
 * kan boeken. Ook opnieuw na een nieuwe versie (keuze Johan).
 */
export default function WalkRegulationsAcceptance({ hadOlderVersion }: { hadOlderVersion: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);

  function akkoord() {
    setFout(null);
    startTransition(async () => {
      const r = await acceptWalkRegulations();
      if (r.success) router.refresh();
      else setFout(r.error ?? "Je akkoord kon niet bewaard worden. Probeer opnieuw.");
    });
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-bold text-[#1b4332]">{WALK_REGULATIONS_TITLE}</h2>
      <WalkRegulationsVersion className="mt-0.5 text-xs text-gray-500" />
      <p className="mt-3 text-sm text-gray-700">
        {hadOlderVersion
          ? "Het wandelreglement werd aangepast. Lees de nieuwe versie en bevestig dat je akkoord gaat; daarna kan je weer wandelingen boeken."
          : "Lees het wandelreglement en bevestig dat je akkoord gaat. Daarna kan je een wandeling boeken."}
      </p>

      <div className="mt-4">
        <WalkRegulationsList />
      </div>

      {fout && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {fout}
        </p>
      )}

      <button
        type="button"
        onClick={akkoord}
        disabled={isPending}
        className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Ik heb het wandelreglement gelezen en ga akkoord
      </button>
    </section>
  );
}
