"use client";

import { useEffect, useState } from "react";
import { buildMapEmbedUrl, buildMapLinkUrl } from "@/lib/maps/embed";

/** Wat het adressenregister van dit adres maakte (Story 10.56). */
export interface AddressLookup {
  lat: string | null;
  lng: string | null;
  geocodedAddress: string | null;
  geocodeMatch: string | null;
}

interface Props {
  address: string | null | undefined;
  municipality?: string | null;
  /**
   * Bewaarde ligging van een opgeslagen campagne. Aanwezig = er is al opgezocht,
   * dus we mogen het resultaat tonen. Afwezig (nieuw formulier) = zwijgen.
   */
  lookup?: AddressLookup | null;
  /**
   * Wachttijd voor de kaart volgt tijdens het typen. Zonder debounce herlaadt het
   * iframe bij elke toetsaanslag. 0 = meteen (handig in tests / voor vaste adressen).
   */
  debounceMs?: number;
  className?: string;
}

/** Kaartje van het campagne-adres (Story 10.40 — Sven: "makkelijk om te situeren"). */
export default function AddressMap({
  address,
  municipality,
  lookup,
  debounceMs = 700,
  className = "",
}: Props) {
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

  // Bewaarde coördinaten gaan vóór: dan hoeft Google niets meer op te zoeken.
  const coords = lookup?.lat && lookup?.lng ? `${lookup.lat},${lookup.lng}` : null;

  const embedUrl = coords
    ? `https://maps.google.com/maps?q=${encodeURIComponent(coords)}&hl=nl&z=17&output=embed`
    : buildMapEmbedUrl(settled);
  const linkUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`
    : buildMapLinkUrl(settled);

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

      {lookup && <LookupStatus lookup={lookup} />}
    </div>
  );
}

function LookupStatus({ lookup }: { lookup: AddressLookup }) {
  if (lookup.geocodeMatch === "huisnummer") {
    return (
      <p className="mt-1 text-xs text-gray-500">
        Gevonden in het adressenregister als{" "}
        <span className="font-medium text-gray-700">{lookup.geocodedAddress}</span>.
      </p>
    );
  }

  if (lookup.geocodeMatch) {
    return (
      <p className="mt-1 text-xs text-amber-700">
        Het huisnummer is niet teruggevonden — de kaart toont bij benadering{" "}
        <span className="font-medium">{lookup.geocodedAddress}</span>.
      </p>
    );
  }

  return (
    <p className="mt-1 text-xs text-amber-700">
      Dit adres is niet teruggevonden in het Vlaamse adressenregister. Controleer of het klopt;
      de kaart toont zolang enkel een ruwe zoekopdracht.
    </p>
  );
}
