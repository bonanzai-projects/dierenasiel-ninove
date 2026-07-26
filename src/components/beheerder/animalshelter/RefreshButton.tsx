"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Story 11.4 — "Gegevens ophalen".
 *
 * De pagina haalt de externe gegevens sowieso live op bij elk bezoek; deze knop
 * herlaadt ze zonder dat je het scherm hoeft te verversen. Er wordt uitsluitend
 * gelezen — zie de banner erboven.
 */
export default function RefreshButton() {
  const router = useRouter();
  const [bezig, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={bezig}
      onClick={() => startTransition(() => router.refresh())}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
    >
      {bezig ? "Bezig met ophalen…" : "↻ Gegevens ophalen"}
    </button>
  );
}
