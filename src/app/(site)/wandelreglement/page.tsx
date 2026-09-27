import type { Metadata } from "next";
import Link from "next/link";
import AnimateOnScroll from "@/components/ui/AnimateOnScroll";
import WalkRegulationsList, { WalkRegulationsVersion } from "@/components/wandelaar/WalkRegulationsList";

export const metadata: Metadata = {
  title: "Wandelreglement",
  description:
    "Reglement en uren voor het wandelen met de asielhonden van Dierenasiel Ninove.",
};

export default function WandelreglementPage() {
  return (
    <div className="pt-28 pb-20 bg-bg">
      <div className="max-w-3xl mx-auto px-6">
        <AnimateOnScroll className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
            <span className="inline-block w-8 h-0.5 bg-accent rounded" />
            Wandelen
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-dark mb-5">
            Wandelreglement
          </h1>
          <p className="text-text-light leading-relaxed max-w-lg mx-auto">
            Neem onderstaand reglement door voor je met een van de honden wenst
            te wandelen.
          </p>
          <WalkRegulationsVersion className="mt-2 text-sm text-text-light" />
        </AnimateOnScroll>

        <AnimateOnScroll className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {/* Story 10.77: dezelfde tekst als het inschrijfformulier en de wandelaar-app. */}
            <WalkRegulationsList />
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll>
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="font-heading text-xl font-bold text-primary-dark mb-4">
              Wandeluren
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { day: "Maandag", hours: "10:00 - 12:00" },
                { day: "Woensdag", hours: "10:00 - 12:00" },
                { day: "Vrijdag", hours: "10:00 - 12:00" },
                { day: "Zaterdag", hours: "10:00 - 12:00" },
              ].map((item) => (
                <div
                  key={item.day}
                  className="bg-gray-50 rounded-xl p-4 flex justify-between items-center"
                >
                  <span className="font-semibold text-primary-dark">
                    {item.day}
                  </span>
                  <span className="text-text-light font-mono">
                    {item.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll className="mt-10">
          <div className="bg-primary/5 rounded-2xl p-8 text-center">
            <h2 className="font-heading text-xl font-bold text-primary-dark mb-3">
              Wil je wandelen met onze honden?
            </h2>
            <p className="text-text-light mb-6 max-w-md mx-auto">
              Registreer je online als wandelaar. Na goedkeuring door de
              coördinator kan je onze honden uitlaten.
            </p>
            <Link
              href="/wandelaar-registratie"
              className="inline-block px-8 py-3 bg-accent text-white rounded-full font-bold shadow-lg shadow-accent/40 hover:bg-accent/90 hover:-translate-y-0.5 transition-all"
            >
              Registreer als wandelaar →
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </div>
  );
}
