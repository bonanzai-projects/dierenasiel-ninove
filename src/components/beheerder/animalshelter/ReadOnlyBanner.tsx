/**
 * Story 11.4 — de belofte staat permanent op het scherm.
 *
 * Dit bannertje is geen versiering. Het bestuur van het asiel staat nog niet
 * volledig achter de koppeling; wie dit scherm gebruikt, moet zonder na te denken
 * kunnen zien dat er niets de deur uit gaat. De technische onderbouwing staat in
 * `src/lib/animalshelter/http.ts` en wordt bewaakt door `read-only.test.ts`.
 */
export default function ReadOnlyBanner() {
  return (
    <div className="rounded-xl border border-[#1b4332]/20 bg-[#1b4332]/5 px-4 py-3">
      <p className="text-sm font-medium text-[#1b4332]">
        🔒 Alleen lezen — deze toepassing verstuurt nooit gegevens naar AnimalShelter.
      </p>
      <p className="mt-0.5 text-xs text-gray-600">
        Er wordt uitsluitend opgehaald. Overnemen en negeren wijzigen enkel onze eigen fiche.
        Elke oproep naar AnimalShelter wordt geregistreerd in het auditlogboek.
      </p>
    </div>
  );
}
