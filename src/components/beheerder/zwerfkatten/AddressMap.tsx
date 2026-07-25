"use client";

import { useEffect, useState } from "react";
import { buildMapEmbedUrl, buildMapLinkUrl } from "@/lib/maps/embed";

interface Props {
  address: string | null | undefined;
  municipality?: string | null;
  /**
   * Wachttijd voor de kaart volgt tijdens het typen. Zonder debounce herlaadt het
   * iframe bij elke toetsaanslag. 0 = meteen (handig in tests / voor vaste adressen).
   */
  debounceMs?: number;
  className?: string;
}

/** Kaartje van het campagne-adres (Story 10.40 — Sven: "makkelijk om te situeren"). */
export default function AddressMap({ address, municipality, debounceMs = 700, className = "" }: Props) {
  // De ingetypte waarde pas na een adempauze doorgeven aan de kaart.
  const [settled, setSettled] = useState({ address, municipality });

  useEffect(() => {
    if (debounceMs <= 0) {
      setSettled({ address, municipality });
      return;
    }
    const timer = setTimeout(() => setSettled({ address, municipality }), debounceMs);
    return () => clearTimeout(timer);
  }, [address, municipality, debounceMs]);

  const embedUrl = buildMapEmbedUrl(settled);
  const linkUrl = buildMapLinkUrl(settled);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="block text-sm font-medium text-gray-700">Ligging</span>
        {linkUrl && (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900"
          >
            Openen in Google Maps
          </a>
        )}
      </div>

      {embedUrl ? (
        <iframe
          title="Kaart van de locatie"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="mt-1 h-64 w-full rounded-lg border border-gray-300"
        />
      ) : (
        <p className="mt-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-8 text-center text-sm text-gray-500">
          Vul een adres in om de locatie op de kaart te zien.
        </p>
      )}
    </div>
  );
}
