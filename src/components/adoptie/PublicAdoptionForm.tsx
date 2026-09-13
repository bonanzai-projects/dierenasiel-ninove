"use client";

import { useActionState, useState, useRef, useCallback } from "react";
import { submitPublicAdoptionRequest } from "@/lib/actions/public-adoption";
import type { PublicAdoptionResult } from "@/lib/actions/public-adoption";
import AdoptionPhotoUpload from "./AdoptionPhotoUpload";
import type { AdoptionChoice } from "@/lib/animals/adoption-choice";

type Species = "hond" | "kat" | "andere";

interface Props {
  species: Species;
  adoptableAnimals?: AdoptionChoice[];
}

// --- Question configs per species ---

interface RadioQuestion {
  type: "radio";
  key: string;
  label: string;
  options: string[];
  allowOther?: boolean;
  required?: boolean;
}

interface TextQuestion {
  type: "text";
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface CheckboxQuestion {
  type: "checkbox";
  key: string;
  label: string;
  options: string[];
  allowOther?: boolean;
  required?: boolean;
}

type Question = RadioQuestion | TextQuestion | CheckboxQuestion;

const CAT_QUESTIONS: Question[] = [
  {
    type: "text",
    key: "andereHuisdieren",
    label: "Zijn er al andere katten aanwezig? Honden of andere huisdieren?",
    required: true,
  },
  {
    type: "radio",
    key: "binnenBuiten",
    label: "Wil je een binnenkat of een kat die binnen en buiten kan lopen?",
    options: ["Binnenkat", "Binnen en buiten"],
    required: true,
  },
  {
    type: "radio",
    key: "voorkeurLeeftijd",
    label: "Gaat je voorkeur uit naar een volwassen kat of liever een kitten?",
    options: ["Volwassen kat", "Kitten"],
    required: true,
  },
  {
    type: "radio",
    key: "woningType",
    label: "Welke woning heb je?",
    options: ["Huis", "Appartement"],
    allowOther: true,
    required: true,
  },
  {
    type: "radio",
    key: "eigenaarHuurder",
    label: "Eigenaar of huurder?",
    options: ["Eigenaar", "Huurder"],
    required: true,
  },
  {
    type: "radio",
    key: "huurderDierenToegestaan",
    label: "Als je huurder bent, mag je van de verhuurder dieren houden?",
    options: ["JA", "NEEN"],
    required: true,
  },
  {
    type: "text",
    key: "kinderen",
    label: "Zijn er kinderen aanwezig in het gezin? Indien wel geef hun leeftijd(en)",
    required: true,
  },
  {
    type: "checkbox",
    key: "beschikbareDagen",
    label: "Op welke dagen kan je langskomen? Dit kan op maandag, woensdag, donderdag, vrijdag en zaterdag",
    options: [
      "Maandag (10u30 tot 15u30)",
      "Woensdag (10u30 tot 15u30)",
      "Donderdag (13 tot 16u)",
      "Vrijdag (10u30 tot 15u30)",
      "Zaterdag (10u30 tot 15u30)",
    ],
    required: true,
  },
  {
    type: "text",
    key: "adoptieVoorzien",
    label: "Voor wanneer is de adoptie voorzien?",
    required: true,
  },
];

const DOG_QUESTIONS: Question[] = [
  // --- Info Adoptant ---
  {
    type: "text",
    key: "kinderen",
    label: "Zijn er kinderen/huisgenoten aanwezig in het gezin? Indien wel geef hun leeftijd(en)",
    required: true,
  },
  {
    type: "radio",
    key: "woningType",
    label: "Welke woning heb je?",
    options: ["Huis", "Appartement"],
    allowOther: true,
    required: true,
  },
  {
    type: "radio",
    key: "eigenaarHuurder",
    label: "Ben u eigenaar of huurder?",
    options: ["Eigenaar", "Huurder"],
    required: true,
  },
  {
    type: "radio",
    key: "huurderDierenToegestaan",
    label: "Als je huurder bent, mag je van de verhuurder dieren houden?",
    options: ["Ja", "Neen", "Niet van toepassing"],
    required: true,
  },
  // --- Tuin ---
  {
    type: "radio",
    key: "tuinAanwezig",
    label: "Is er een tuin aanwezig?",
    options: ["Ja", "Neen"],
    required: true,
  },
  {
    type: "radio",
    key: "tuinOmheind",
    label: "Is de tuin ontsnappingsvrij omheind?",
    options: ["Ja", "Neen", "Niet van toepassing"],
    required: true,
  },
  {
    type: "text",
    key: "tuinGrootte",
    label: "Hoe groot is de tuin?",
    required: true,
  },
  {
    type: "checkbox",
    key: "omheiningMateriaal",
    label: "Met welke materialen is de tuin omheind?",
    options: ["Geen omheining", "Draad", "Beplanting", "Schermen /muur"],
    allowOther: true,
    required: true,
  },
  {
    type: "text",
    key: "omheiningHoogte",
    label: "Welke hoogte heeft de omheining?",
    required: true,
  },
  // --- Info ivm adoptie ---
  {
    type: "radio",
    key: "beseftVerantwoordelijkheid",
    label: "Beseft u door een hond te adopteren dat dit een grote verantwoordelijkheid is dat u opneemt en dat dit niet voor even is maar doorgaans voor 10 jaar of langer zal zijn?",
    options: ["Ja", "Neen"],
    required: true,
  },
  {
    type: "radio",
    key: "ervaringDieren",
    label: "Hebt u ervaring met dieren?",
    options: ["Ja", "Neen"],
    required: true,
  },
  {
    type: "text",
    key: "ervaringBeschrijving",
    label: "Indien JA: Welke dieren en beschrijf zo goed mogelijk",
    required: true,
  },
  {
    type: "text",
    key: "huidigeDieren",
    label: "Zijn er momenteel dieren aanwezig waar de hond zal komen te verblijven? Beschrijf zo nauwkeurig mogelijk (diersoort, ras, leeftijd, geslacht, steriel)?",
  },
  {
    type: "text",
    key: "urenAlleen",
    label: "Hoeveel uren per dag zal de hond max alleen zijn?",
    required: true,
  },
  {
    type: "radio",
    key: "verblijfplaats",
    label: "Waar zal de hond verblijven?",
    options: ["Vrij binnen", "Vrij buiten", "Vrij binnen en buiten"],
    allowOther: true,
    required: true,
  },
  {
    type: "checkbox",
    key: "bewegingsbehoefte",
    label: "Hoe denk je te kunnen voldoen aan de bewegingsbehoefte van de hond?",
    options: [
      "Door hem vrij te laten in de tuin",
      "Door met hem dagelijks te wandelen",
      "Door met hem wekelijks te gaan wandelen",
    ],
    allowOther: true,
    required: true,
  },
  {
    type: "checkbox",
    key: "vakanties",
    label: "Aan welke oplossing denk je voor de hond tijdens vakanties?",
    options: [
      "Meenemen!",
      "Door hem te plaatsen bij een familielid",
      "Door hem te plaatsen in een hondenpension",
      "'Dog Sitter' komt bij ons thuis",
    ],
    allowOther: true,
    required: true,
  },
  {
    type: "radio",
    key: "bereidOpleiding",
    label: "Het leven met een hond kan belangrijke inspanningen vereisen. Ben je bereid een opleiding te volgen indien dit nodig zou zijn?",
    options: ["Ja", "Neen", "Misschien"],
    required: true,
  },
  {
    type: "text",
    key: "welkeOpleiding",
    label: "Zo JA! Welke opleiding?",
    required: true,
  },
  {
    type: "text",
    key: "adviesProbleemgedrag",
    label: "Aan wie zou je advies vragen indien de hond probleemgedrag zou vertonen?",
    required: true,
  },
  {
    type: "radio",
    key: "verzekering",
    label: "Ben je van plan om een familiale ongevallenverzekering af te sluiten die kan tussenkomen indien de hond een ongeval zou veroorzaken?",
    options: [
      "Ja heb ik al",
      "Ja ik ga er 1 afsluiten",
      "Neen ik ben niet van plan om me extra te laten verzekeren",
    ],
    required: true,
  },
  {
    type: "text",
    key: "extraInfo",
    label: "Is er nog belangrijker info die u wenst mee te geven die in u voordeel kan spreken om de adoptie aan u toe te kennen?",
  },
  {
    type: "checkbox",
    key: "beschikbareDagen",
    label: "Op welke dagen kan je langskomen? Dit kan op maandag, woensdag, donderdag, vrijdag en zaterdag",
    options: [
      "Maandag (10u30 tot 15u30)",
      "Woensdag (10u30 tot 15u30)",
      "Donderdag (13 tot 16u)",
      "Vrijdag (10u30 tot 15u30)",
      "Zaterdag (10u30 tot 15u30)",
    ],
    required: true,
  },
  {
    type: "text",
    key: "adoptieVoorzien",
    label: "Voor wanneer is de adoptie voorzien?",
    required: true,
  },
];

const OTHER_QUESTIONS: Question[] = [
  {
    type: "text",
    key: "kinderen",
    label: "Zijn er kinderen/huisgenoten aanwezig in het gezin? Indien wel geef hun leeftijd(en)",
    required: true,
  },
  {
    type: "radio",
    key: "woningType",
    label: "Welke woning heb je?",
    options: ["Huis", "Appartement"],
    allowOther: true,
    required: true,
  },
  {
    type: "radio",
    key: "eigenaarHuurder",
    label: "Ben u eigenaar of huurder?",
    options: ["Eigenaar", "Huurder"],
    required: true,
  },
  {
    type: "radio",
    key: "huurderDierenToegestaan",
    label: "Als je huurder bent, mag je van de verhuurder dieren houden?",
    options: ["Ja", "Neen", "Niet van toepassing"],
    required: true,
  },
  {
    type: "radio",
    key: "tuinAanwezig",
    label: "Is er een tuin aanwezig?",
    options: ["Ja", "Neen"],
    required: true,
  },
  {
    type: "radio",
    key: "tuinOmheind",
    label: "Is de tuin ontsnappingsvrij omheind?",
    options: ["Ja", "Neen", "Niet van toepassing"],
    required: true,
  },
  {
    type: "text",
    key: "tuinGrootte",
    label: "Hoe groot is de tuin?",
    required: true,
  },
  {
    type: "checkbox",
    key: "omheiningMateriaal",
    label: "Met welke materialen is de tuin omheind?",
    options: ["Geen omheining", "Draad", "Beplanting", "Schermen /muur"],
    allowOther: true,
    required: true,
  },
  {
    type: "text",
    key: "omheiningHoogte",
    label: "Welke hoogte heeft de omheining?",
    required: true,
  },
  {
    type: "radio",
    key: "beseftVerantwoordelijkheid",
    label: "Beseft u door een dier te adopteren dat dit een grote verantwoordelijkheid is dat u opneemt en dat dit niet voor even is maar langer zal zijn?",
    options: ["Ja", "Neen"],
    required: true,
  },
  {
    type: "radio",
    key: "ervaringDieren",
    label: "Hebt u ervaring met dieren?",
    options: ["Ja", "Neen"],
    required: true,
  },
  {
    type: "text",
    key: "ervaringBeschrijving",
    label: "Indien JA: Welke dieren en beschrijf zo goed mogelijk",
    required: true,
  },
  {
    type: "text",
    key: "huidigeDieren",
    label: "Zijn er momenteel dieren aanwezig waar het dier zal komen te verblijven? Beschrijf zo nauwkeurig mogelijk (diersoort, ras, leeftijd, geslacht, steriel)?",
    required: true,
  },
  {
    type: "radio",
    key: "verblijfplaats",
    label: "Waar zal het dier verblijven?",
    options: ["Binnen", "Buiten", "Binnen en buiten"],
    allowOther: true,
    required: true,
  },
  {
    type: "checkbox",
    key: "vakanties",
    label: "Aan welke oplossing denk je voor het dier tijdens vakanties?",
    options: [
      "Meenemen!",
      "Door hem te plaatsen bij een familielid",
      "Iemand komt bij ons thuis",
    ],
    allowOther: true,
    required: true,
  },
  {
    type: "text",
    key: "extraInfo",
    label: "Is er nog belangrijker info die u wenst mee te geven die in u voordeel kan spreken om de adoptie aan u toe te kennen?",
  },
  {
    type: "text",
    key: "adoptieVoorzien",
    label: "Voor wanneer is de adoptie voorzien?",
    required: true,
  },
];

const QUESTIONS: Record<Species, Question[]> = {
  kat: CAT_QUESTIONS,
  hond: DOG_QUESTIONS,
  andere: OTHER_QUESTIONS,
};

// --- Styling ---
const inputBase =
  "mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors";
const inputNormal = `${inputBase} border-gray-300 focus:border-[#52796f] focus:ring-1 focus:ring-[#52796f]`;
const inputError = `${inputBase} border-red-500 bg-red-50/40 focus:border-red-500 focus:ring-1 focus:ring-red-500`;
const labelNormal = "block text-sm font-medium text-gray-700";
const labelError = "block text-sm font-medium text-red-700";
const errorMsg = "mt-1.5 text-xs font-medium text-red-600";

function scrollToFirstError() {
  // Small delay so DOM has updated with error states
  setTimeout(() => {
    const el = document.querySelector("[data-field-error]");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 50);
}

export default function PublicAdoptionForm({ species, adoptableAnimals = [] }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAnimal, setSelectedAnimal] = useState("");
  const [customAnimalName, setCustomAnimalName] = useState("");

  // Controlled base fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const questions = QUESTIONS[species];

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const submitAction = async (
    _prev: PublicAdoptionResult | null,
    _formData: FormData,
  ): Promise<PublicAdoptionResult> => {
    const newErrors: Record<string, string> = {};

    // Validate base fields
    const animalName = selectedAnimal === "__other__" ? customAnimalName : selectedAnimal || "";
    if (adoptableAnimals.length > 0 && !animalName.trim()) {
      newErrors.requestedAnimalName = "Kies een dier of vul een naam in";
    }
    if (!firstName.trim()) newErrors.firstName = "Voornaam is verplicht";
    if (!lastName.trim()) newErrors.lastName = "Achternaam is verplicht";
    if (!dateOfBirth) newErrors.dateOfBirth = "Geboortedatum is verplicht";
    if (!address.trim()) newErrors.address = "Straat en huisnummer is verplicht";
    if (!postalCode.trim()) newErrors.postalCode = "Postcode en gemeente is verplicht";
    if (!phone.trim()) newErrors.phone = "Gsm nummer is verplicht";
    if (species === "kat" && !email.trim()) newErrors.email = "E-mailadres is verplicht";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Ongeldig e-mailadres";

    // Validate questionnaire fields
    for (const q of questions) {
      if (!q.required) continue;
      const val = answers[q.key];
      if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
        newErrors[q.key] = q.type === "text"
          ? "Dit veld is verplicht"
          : q.type === "radio"
            ? "Selecteer een optie"
            : "Selecteer minstens 1 optie";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollToFirstError();
      const count = Object.keys(newErrors).length;
      return {
        success: false,
        error: `Er ${count === 1 ? "is 1 veld" : `zijn ${count} velden`} niet correct ingevuld. Corrigeer de gemarkeerde velden.`,
      };
    }
    setErrors({});

    const payload = {
      species,
      requestedAnimalName: adoptableAnimals.length > 0
        ? animalName
        : firstName, // fallback for text input
      firstName,
      lastName,
      dateOfBirth,
      address,
      postalCode,
      phone,
      email: email || "",
      questionnaireAnswers: { ...answers } as Record<string, unknown>,
    };

    // Replace "Anders" radio values with typed other text
    for (const [key, val] of Object.entries(payload.questionnaireAnswers)) {
      if (val === "__other__" && otherValues[key]) {
        payload.questionnaireAnswers[key] = otherValues[key];
      }
    }

    // Add photo URLs if any
    if (uploadedFiles.length > 0) {
      payload.questionnaireAnswers.fotoUrls = uploadedFiles.map((f) => f.url);
    }

    const fd = new FormData();
    fd.append("json", JSON.stringify(payload));
    return submitPublicAdoptionRequest(null, fd);
  };

  const [state, formAction, isPending] = useActionState(submitAction, null);

  if (state?.success) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-emerald-800">
          Bedankt voor je reactie.
        </h2>
        <div className="mt-4 space-y-3 text-left text-sm text-emerald-700">
          <p>
            We verwerken alle antwoorden zo snel mogelijk, maar dit kan soms even duren
            omdat we veel mails krijgen. Bedankt voor je geduld!
          </p>
          <p>
            We antwoorden altijd, of je er nu bij bent of niet. Voor sommige honden krijgen we
            veel aanvragen, maar helaas kunnen we maar &eacute;&eacute;n persoon blij maken.
          </p>
          <p>
            Dank je voor je begrip.<br />
            Tot snel!<br />
            <strong>Team Dierenasiel Ninove</strong>
          </p>
        </div>
        <a
          href="/adoptie-aanvraag"
          className="mt-6 inline-block rounded-lg bg-[#1b4332] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2d6a4f]"
        >
          Terug naar overzicht
        </a>
      </div>
    );
  }

  const globalError = state && !state.success ? state.error : undefined;

  const updateAnswer = (key: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const toggleCheckbox = (key: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[key] as string[]) || [];
      return {
        ...prev,
        [key]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
    clearError(key);
  };

  const speciesLabel = species === "hond" ? "hond" : species === "kat" ? "kat/kitten" : "dier";
  // Story 10.68: het gekozen dier, voor de foto onder de keuzelijst. Wie bij "Andere:"
  // typt, maakt de keuze leeg — dan is er ook geen foto.
  const gekozenDier = adoptableAnimals.find((a) => a.name === selectedAnimal);
  const title = species === "hond"
    ? "Adoptieaanvraag hond"
    : species === "kat"
      ? "Adoptieaanvraag kat/kitten"
      : "Adoptieaanvraag andere dieren";

  return (
    <form ref={formRef} action={formAction} className="mx-auto max-w-2xl space-y-6" noValidate>
      {/* Header */}
      <div className="rounded-2xl border-t-4 border-[#52796f] bg-white p-6 shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Dierenasiel Ninove &mdash; Vul dit formulier in om een adoptie-aanvraag in te dienen.
          Alle velden met <span className="text-red-500">*</span> zijn verplicht.
        </p>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4" role="alert">
          <div className="flex gap-2">
            <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-800">{globalError}</p>
          </div>
        </div>
      )}

      {/* Gewenst dier */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <BaseField
          label={`Welke ${speciesLabel} wens je te adopteren?`}
          error={errors.requestedAnimalName}
          required
        >
          {adoptableAnimals.length > 0 ? (
            <>
              <select
                id="requestedAnimalSelect"
                value={selectedAnimal}
                onChange={(e) => { setSelectedAnimal(e.target.value); if (e.target.value) setCustomAnimalName(""); clearError("requestedAnimalName"); }}
                className={errors.requestedAnimalName ? inputError : inputNormal}
                aria-invalid={!!errors.requestedAnimalName}
              >
                <option value="">-- Maak een keuze --</option>
                {adoptableAnimals.map((a) => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
              {/*
                Story 10.68 — Sven: "dat ze goed zien voor welk dier ze invullen". De hele
                foto, geen uitsnede: bij een staande foto viel anders net de kop weg.
              */}
              {gekozenDier?.photoUrl && (
                <figure className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gekozenDier.photoUrl}
                    alt={`Foto van ${gekozenDier.name}`}
                    className="mx-auto max-h-72 w-full object-contain"
                  />
                  <figcaption className="px-3 py-1.5 text-center text-sm font-medium text-[#1b4332]">
                    {gekozenDier.name}
                  </figcaption>
                </figure>
              )}
              <label htmlFor="customAnimalName" className="block text-sm font-medium text-gray-700 mt-4">Andere:</label>
              <input
                type="text"
                id="customAnimalName"
                value={customAnimalName}
                onChange={(e) => { setCustomAnimalName(e.target.value); if (e.target.value) setSelectedAnimal(""); clearError("requestedAnimalName"); }}
                placeholder="Typ hier de naam van het dier"
                className={`${errors.requestedAnimalName ? inputError : inputNormal} mt-1`}
              />
              <input
                type="hidden"
                name="requestedAnimalName"
                value={customAnimalName || selectedAnimal}
              />
            </>
          ) : (
            <input
              type="text"
              id="requestedAnimalName"
              name="requestedAnimalName"
              className={errors.requestedAnimalName ? inputError : inputNormal}
              aria-invalid={!!errors.requestedAnimalName}
            />
          )}
        </BaseField>
      </div>

      {/* Persoonlijke gegevens */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#1b4332]">Gegevens adoptant</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <BaseField label="Voornaam" error={errors.firstName} required>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); clearError("firstName"); }}
                className={errors.firstName ? inputError : inputNormal}
                aria-invalid={!!errors.firstName}
              />
            </BaseField>
            <BaseField label="Achternaam" error={errors.lastName} required>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); clearError("lastName"); }}
                className={errors.lastName ? inputError : inputNormal}
                aria-invalid={!!errors.lastName}
              />
            </BaseField>
          </div>
          <BaseField label="Geboortedatum" error={errors.dateOfBirth} required>
            <input
              type="date"
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); clearError("dateOfBirth"); }}
              className={errors.dateOfBirth ? inputError : inputNormal}
              aria-invalid={!!errors.dateOfBirth}
            />
          </BaseField>
          <BaseField label="Straat en huisnummer" error={errors.address} required>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => { setAddress(e.target.value); clearError("address"); }}
              className={errors.address ? inputError : inputNormal}
              aria-invalid={!!errors.address}
            />
          </BaseField>
          <BaseField label="Postcode en gemeente" error={errors.postalCode} required>
            <input
              type="text"
              id="postalCode"
              value={postalCode}
              onChange={(e) => { setPostalCode(e.target.value); clearError("postalCode"); }}
              className={errors.postalCode ? inputError : inputNormal}
              aria-invalid={!!errors.postalCode}
            />
          </BaseField>
          <BaseField label="Gsm nummer" error={errors.phone} required>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
              className={errors.phone ? inputError : inputNormal}
              aria-invalid={!!errors.phone}
            />
          </BaseField>
          <BaseField label="E-mailadres" error={errors.email} required={species === "kat"}>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              className={errors.email ? inputError : inputNormal}
              aria-invalid={!!errors.email}
            />
          </BaseField>
        </div>
      </div>

      {/* Vragenlijst */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#1b4332]">Vragenlijst</h2>
        <div className="space-y-6">
          {questions.map((q) => (
            <QuestionField
              key={q.key}
              question={q}
              value={answers[q.key]}
              otherValue={otherValues[q.key] || ""}
              onChange={updateAnswer}
              onToggleCheckbox={toggleCheckbox}
              onOtherChange={(key, val) =>
                setOtherValues((prev) => ({ ...prev, [key]: val }))
              }
              error={errors[q.key]}
            />
          ))}
        </div>
      </div>

      {/* Foto upload - honden en andere dieren */}
      {(species === "hond" || species === "andere") && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-700">
            Voeg een paar foto&apos;s of filmpje toe waar {species === "hond" ? "de hond" : "het dier"} zou komen te verblijven.{" "}
            <span className="font-bold">Zowel binnen als buiten!</span>
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Upload maximaal 5 bestanden: afbeelding of video. Maximaal 10 MB per bestand.
          </p>
          <div className="mt-3">
            <AdoptionPhotoUpload files={uploadedFiles} onChange={setUploadedFiles} />
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1b4332] px-8 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Verzenden..." : "Aanvraag indienen"}
        </button>
      </div>

      <p className="pb-8 text-xs text-gray-400">
        Door dit formulier in te dienen ga je akkoord dat je gegevens verwerkt worden door
        Dierenasiel Ninove in het kader van de adoptie-procedure.
      </p>
    </form>
  );
}

// --- Reusable base field wrapper ---
function BaseField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div {...(error ? { "data-field-error": true } : {})}>
      <label className={error ? labelError : labelNormal}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && (
        <p className={errorMsg} role="alert">{error}</p>
      )}
    </div>
  );
}

// --- Reusable question field renderer ---
function QuestionField({
  question,
  value,
  otherValue,
  onChange,
  onToggleCheckbox,
  onOtherChange,
  error,
}: {
  question: Question;
  value: string | string[] | undefined;
  otherValue: string;
  onChange: (key: string, value: string | string[]) => void;
  onToggleCheckbox: (key: string, option: string) => void;
  onOtherChange: (key: string, value: string) => void;
  error?: string;
}) {
  const lbl = error ? labelError : labelNormal;

  if (question.type === "text") {
    return (
      <div {...(error ? { "data-field-error": true } : {})}>
        <label className={lbl}>
          {question.label}
          {question.required && <span className="text-red-500"> *</span>}
        </label>
        <input
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(question.key, e.target.value)}
          placeholder={question.placeholder}
          className={error ? inputError : inputNormal}
          aria-invalid={!!error}
          aria-describedby={error ? `err-${question.key}` : undefined}
        />
        {error && <p id={`err-${question.key}`} className={errorMsg} role="alert">{error}</p>}
      </div>
    );
  }

  if (question.type === "radio") {
    return (
      <fieldset {...(error ? { "data-field-error": true } : {})} aria-invalid={!!error}>
        <legend className={lbl}>
          {question.label}
          {question.required && <span className="text-red-500"> *</span>}
        </legend>
        <div className={`mt-2 space-y-2 rounded-lg px-3 py-2 ${error ? "border border-red-300 bg-red-50/40" : ""}`}>
          {question.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={question.key}
                value={option}
                checked={value === option}
                onChange={() => onChange(question.key, option)}
                className="h-4 w-4 border-gray-300 text-[#52796f] focus:ring-[#52796f]"
              />
              {option}
            </label>
          ))}
          {question.allowOther && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={question.key}
                value="__other__"
                checked={value === "__other__"}
                onChange={() => onChange(question.key, "__other__")}
                className="h-4 w-4 border-gray-300 text-[#52796f] focus:ring-[#52796f]"
              />
              Anders:
              <input
                type="text"
                value={otherValue}
                onChange={(e) => {
                  onOtherChange(question.key, e.target.value);
                  onChange(question.key, "__other__");
                }}
                className={`ml-1 flex-1 rounded border px-2 py-1 text-sm outline-none ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-gray-300 focus:border-[#52796f] focus:ring-1 focus:ring-[#52796f]"
                }`}
              />
            </label>
          )}
        </div>
        {error && <p id={`err-${question.key}`} className={errorMsg} role="alert">{error}</p>}
      </fieldset>
    );
  }

  if (question.type === "checkbox") {
    const selected = (value as string[]) || [];
    return (
      <fieldset {...(error ? { "data-field-error": true } : {})} aria-invalid={!!error}>
        <legend className={lbl}>
          {question.label}
          {question.required && <span className="text-red-500"> *</span>}
        </legend>
        <div className={`mt-2 space-y-2 rounded-lg px-3 py-2 ${error ? "border border-red-300 bg-red-50/40" : ""}`}>
          {question.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggleCheckbox(question.key, option)}
                className="h-4 w-4 rounded border-gray-300 text-[#52796f] focus:ring-[#52796f]"
              />
              {option}
            </label>
          ))}
          {question.allowOther && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(`Anders: ${otherValue}`)}
                onChange={() => {
                  if (otherValue) onToggleCheckbox(question.key, `Anders: ${otherValue}`);
                }}
                className="h-4 w-4 rounded border-gray-300 text-[#52796f] focus:ring-[#52796f]"
              />
              Anders:
              <input
                type="text"
                value={otherValue}
                onChange={(e) => {
                  const oldVal = `Anders: ${otherValue}`;
                  const newVal = `Anders: ${e.target.value}`;
                  onOtherChange(question.key, e.target.value);
                  if (selected.includes(oldVal)) {
                    onChange(question.key, selected.map((s) => s === oldVal ? newVal : s));
                  }
                }}
                className={`ml-1 flex-1 rounded border px-2 py-1 text-sm outline-none ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-gray-300 focus:border-[#52796f] focus:ring-1 focus:ring-[#52796f]"
                }`}
              />
            </label>
          )}
        </div>
        {error && <p id={`err-${question.key}`} className={errorMsg} role="alert">{error}</p>}
      </fieldset>
    );
  }

  return null;
}
