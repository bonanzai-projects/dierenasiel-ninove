"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Animal } from "@/types";
import { calculateAge, speciesLabel, genderLabel, statusLabel, formatDate } from "@/lib/utils";
import { resolveWebsiteDescription } from "@/lib/animals/animal-descriptions";

export default function AnimalProfile({ animal }: { animal: Animal }) {
  const allImages = [
    ...(animal.imageUrl ? [animal.imageUrl] : []),
    ...(animal.images || []),
  ];
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="pt-28 pb-20 bg-bg">
      <div className="max-w-5xl mx-auto px-6">
        {/* Back link */}
        <Link
          href={
            animal.species === "hond"
              ? "/honden-ter-adoptie"
              : animal.species === "kat"
              ? "/katten-ter-adoptie"
              : "/andere-dieren"
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent transition-colors mb-8"
        >
          ← Terug naar overzicht
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-warm to-warm-dark">
              {allImages.length > 0 ? (
                <Image
                  src={allImages[activeImage]}
                  alt={animal.name}
                  width={800}
                  height={800}
                  className="w-full h-auto"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-9xl">
                  {animal.species === "hond" ? "🐕" : animal.species === "kat" ? "🐈" : "🐾"}
                </div>
              )}
              {animal.badge && (
                <span
                  className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-sm font-bold text-white ${
                    animal.badge === "nieuw"
                      ? "bg-accent"
                      : animal.badge === "dringend"
                      ? "bg-red-500"
                      : "bg-primary"
                  }`}
                >
                  {animal.badge.charAt(0).toUpperCase() + animal.badge.slice(1)}
                </span>
              )}
            </div>

            {/* Thumbnail gallery */}
            {allImages.length > 1 && (
              <div className="flex gap-3 mt-4">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 transition-all ${
                      i === activeImage
                        ? "ring-3 ring-accent ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${animal.name} foto ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-primary-dark mb-4">
              {animal.name}
            </h1>

            {/* Quick info */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: "Soort", value: speciesLabel(animal.species) },
                { label: "Ras", value: animal.breed || "Onbekend" },
                { label: "Geslacht", value: genderLabel(animal.gender) },
                { label: "Leeftijd", value: calculateAge(animal.dateOfBirth) },
                // Story 10.29: null = onbekend (nog niet vastgesteld), niet "Nee".
                { label: "Gecastreerd/Gesteriliseerd", value: animal.isNeutered == null ? "Onbekend" : animal.isNeutered ? "Ja" : "Nee" },
                { label: "Status", value: statusLabel(animal.status || "beschikbaar") },
              ].map((item) => (
                <div key={item.label} className="bg-gray-100 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-text-light uppercase tracking-wide mb-1">
                    {item.label}
                  </div>
                  <div className="font-bold text-primary-dark">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              <h3 className="font-heading text-xl font-bold text-primary-dark mb-3">
                Over {animal.name}
              </h3>
              <div className="text-text-light leading-relaxed whitespace-pre-line">
                {/* Story 10.32: eigen websitetekst, met terugval op de uitgebreide beschrijving. */}
                {resolveWebsiteDescription(animal.websiteDescription, animal.description)}
              </div>
            </div>

            {animal.intakeDate && (
              <p className="text-xs text-text-light mt-6">
                In het asiel sinds: {formatDate(animal.intakeDate)}
              </p>
            )}

            {/* CTA */}
            <div className="mt-8 flex gap-4 flex-wrap">
              <Link
                href={`/contact?dier=${animal.name}`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-full font-bold shadow-lg shadow-accent/40 hover:bg-accent/90 hover:-translate-y-0.5 transition-all"
              >
                Interesse in {animal.name}? Neem contact op →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
