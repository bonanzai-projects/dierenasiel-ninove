"use client";

import { useActionState, useState, useCallback } from "react";
import { submitWalkerRegistration } from "@/lib/actions/walkers";
import type { ActionResult } from "@/types";
import type { Walker } from "@/types";
import WalkRegulationsList, { WalkRegulationsVersion } from "./WalkRegulationsList";

const initialState: ActionResult<Walker> = { success: false };

interface Props {
  variant?: "light" | "dark";
}

const INPUT_LIGHT =
  "w-full px-4 py-3 border-2 border-gray-200 rounded-lg font-body text-sm text-text bg-bg focus:outline-none focus:border-primary transition-colors";
const INPUT_LIGHT_ERROR =
  "w-full px-4 py-3 border-2 border-red-500 bg-red-50/40 rounded-lg font-body text-sm text-text focus:outline-none focus:border-red-500 transition-colors";
const INPUT_DARK =
  "w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all";
const INPUT_DARK_ERROR =
  "w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500 text-white placeholder-white/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all";

export default function WalkerRegistrationForm({ variant = "light" }: Props) {
  const dark = variant === "dark";
  const [state, formAction, pending] = useActionState(submitWalkerRegistration, initialState);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [allergies, setAllergies] = useState("");
  const [childrenWalkAlong, setChildrenWalkAlong] = useState(false);
  const [regulationsRead, setRegulationsRead] = useState(false);
  const [showReglement, setShowReglement] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fieldErrors = !state.success && "fieldErrors" in state ? state.fieldErrors : undefined;

  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  function getInputClass(fieldName: string) {
    const hasError = !!errors[fieldName];
    if (dark) return hasError ? INPUT_DARK_ERROR : INPUT_DARK;
    return hasError ? INPUT_LIGHT_ERROR : INPUT_LIGHT;
  }

  function getLabelClass(fieldName: string) {
    const hasError = !!errors[fieldName];
    if (dark) {
      return hasError
        ? "block text-sm font-semibold text-red-300 mb-1.5"
        : "block text-sm font-semibold text-white/80 mb-1.5";
    }
    return hasError
      ? "block text-sm font-semibold text-red-700 mb-1.5"
      : "block text-sm font-semibold mb-1.5";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "Voornaam is verplicht";
    if (!lastName.trim()) newErrors.lastName = "Achternaam is verplicht";
    if (!dateOfBirth) newErrors.dateOfBirth = "Geboortedatum is verplicht";
    if (!phone.trim()) newErrors.phone = "GSM-nummer is verplicht";
    if (!email.trim()) {
      newErrors.email = "E-mail is verplicht";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Ongeldig e-mailadres";
    }
    if (!address.trim()) newErrors.address = "Adres is verplicht";
    if (!regulationsRead) newErrors.regulationsRead = "Je moet het wandelreglement accepteren";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      requestAnimationFrame(() => {
        const firstErrorEl = document.querySelector("[data-field-error]");
        firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setErrors({});

    const formData = new FormData();
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("dateOfBirth", dateOfBirth);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("address", address);
    formData.append("allergies", allergies);
    if (childrenWalkAlong) formData.append("childrenWalkAlong", "true");
    if (regulationsRead) formData.append("regulationsRead", "true");
    formData.append("photoUrl", photoUrl);

    formAction(formData);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/wandelaar/upload-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPhotoUrl(data.url);
      } else {
        setUploadError(data.error || "Foto uploaden mislukt");
        setPhotoPreview(null);
      }
    } catch {
      setUploadError("Foto uploaden mislukt. Probeer opnieuw.");
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const checkboxClass = dark
    ? "w-5 h-5 rounded border-white/30 bg-white/10 text-accent focus:ring-accent"
    : "w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary";
  const textClass = dark ? "text-sm text-white/80" : "text-sm";
  const errorClass = dark ? "text-red-300 text-xs mt-1" : "text-red-500 text-xs mt-1";
  const fileClass = dark
    ? "block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white/80 hover:file:bg-white/20"
    : "block w-full text-sm text-text-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20";

  const errorCount = Object.keys(errors).length;

  if (state.success) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✅</div>
        <h3 className={`font-heading text-xl font-bold mb-2 ${dark ? "text-white" : "text-primary-dark"}`}>
          Registratie ontvangen!
        </h3>
        <p className={dark ? "text-white/70" : "text-text-light"}>
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errorCount > 0 && (
        <div
          role="alert"
          className={`p-3 rounded-lg text-sm font-semibold ${dark ? "bg-red-500/20 border border-red-400/30 text-red-200" : "bg-red-50 border border-red-200 text-red-700"}`}
        >
          Er {errorCount === 1 ? "is" : "zijn"} {errorCount} {errorCount === 1 ? "veld" : "velden"} niet correct ingevuld
        </div>
      )}

      {state.error && (
        <div className={`p-3 rounded-lg text-sm ${dark ? "bg-red-500/20 border border-red-400/30 text-red-200" : "bg-red-50 text-red-700"}`}>
          {state.error}
        </div>
      )}

      <input type="hidden" name="photoUrl" value={photoUrl} />

      {/* Voornaam + Achternaam */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div {...(errors.firstName ? { "data-field-error": true } : {})}>
          <label htmlFor="firstName" className={getLabelClass("firstName")}>Voornaam *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="Je voornaam"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); clearError("firstName"); }}
            className={getInputClass("firstName")}
            aria-invalid={!!errors.firstName || undefined}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
          />
          {errors.firstName && <p id="firstName-error" role="alert" className={errorClass}>{errors.firstName}</p>}
          {fieldErrors?.firstName && <p className={errorClass}>{fieldErrors.firstName[0]}</p>}
        </div>
        <div {...(errors.lastName ? { "data-field-error": true } : {})}>
          <label htmlFor="lastName" className={getLabelClass("lastName")}>Achternaam *</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Je achternaam"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); clearError("lastName"); }}
            className={getInputClass("lastName")}
            aria-invalid={!!errors.lastName || undefined}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName && <p id="lastName-error" role="alert" className={errorClass}>{errors.lastName}</p>}
          {fieldErrors?.lastName && <p className={errorClass}>{fieldErrors.lastName[0]}</p>}
        </div>
      </div>

      {/* Geboortedatum + GSM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div {...(errors.dateOfBirth ? { "data-field-error": true } : {})}>
          <label htmlFor="dateOfBirth" className={getLabelClass("dateOfBirth")}>Geboortedatum *</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => { setDateOfBirth(e.target.value); clearError("dateOfBirth"); }}
            className={getInputClass("dateOfBirth")}
            aria-invalid={!!errors.dateOfBirth || undefined}
            aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
          />
          {errors.dateOfBirth && <p id="dateOfBirth-error" role="alert" className={errorClass}>{errors.dateOfBirth}</p>}
          {fieldErrors?.dateOfBirth && <p className={errorClass}>{fieldErrors.dateOfBirth[0]}</p>}
        </div>
        <div {...(errors.phone ? { "data-field-error": true } : {})}>
          <label htmlFor="phone" className={getLabelClass("phone")}>GSM-nummer *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="0471 23 45 67"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
            className={getInputClass("phone")}
            aria-invalid={!!errors.phone || undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <p id="phone-error" role="alert" className={errorClass}>{errors.phone}</p>}
          {fieldErrors?.phone && <p className={errorClass}>{fieldErrors.phone[0]}</p>}
        </div>
      </div>

      {/* Email */}
      <div {...(errors.email ? { "data-field-error": true } : {})}>
        <label htmlFor="email" className={getLabelClass("email")}>E-mail *</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="je@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
          className={getInputClass("email")}
          aria-invalid={!!errors.email || undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && <p id="email-error" role="alert" className={errorClass}>{errors.email}</p>}
        {fieldErrors?.email && <p className={errorClass}>{fieldErrors.email[0]}</p>}
      </div>

      {/* Adres */}
      <div {...(errors.address ? { "data-field-error": true } : {})}>
        <label htmlFor="address" className={getLabelClass("address")}>Adres *</label>
        <input
          type="text"
          id="address"
          name="address"
          placeholder="Straat, huisnummer, postcode, gemeente"
          value={address}
          onChange={(e) => { setAddress(e.target.value); clearError("address"); }}
          className={getInputClass("address")}
          aria-invalid={!!errors.address || undefined}
          aria-describedby={errors.address ? "address-error" : undefined}
        />
        {errors.address && <p id="address-error" role="alert" className={errorClass}>{errors.address}</p>}
        {fieldErrors?.address && <p className={errorClass}>{fieldErrors.address[0]}</p>}
      </div>

      {/* Allergieën */}
      <div>
        <label htmlFor="allergies" className={getLabelClass("allergies")}>Allergieën</label>
        <textarea id="allergies" name="allergies" rows={2} placeholder="Vermeld eventuele allergieën (optioneel)" value={allergies} onChange={(e) => setAllergies(e.target.value)} className={`${getInputClass("allergies")} resize-y`} />
      </div>

      {/* Kinderen checkbox */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="childrenWalkAlong" value="true" checked={childrenWalkAlong} onChange={(e) => setChildrenWalkAlong(e.target.checked)} className={checkboxClass} />
          <span className={textClass}>Mijn kinderen zullen mee wandelen (onder mijn begeleiding)</span>
        </label>
      </div>

      {/* Foto upload */}
      <div>
        <label className={getLabelClass("")}>Foto (optioneel)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className={fileClass} />
        {uploading && <p className={`text-xs mt-1 ${dark ? "text-white/60" : "text-primary"}`}>Foto uploaden...</p>}
        {uploadError && <p className={errorClass}>{uploadError}</p>}
        {photoPreview && (
          <img src={photoPreview} alt="Preview" className={`mt-2 w-24 h-24 object-cover rounded-lg border-2 ${dark ? "border-white/20" : "border-gray-200"}`} />
        )}
      </div>

      {/* Reglement checkbox */}
      <div {...(errors.regulationsRead ? { "data-field-error": true } : {})}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="regulationsRead"
            value="true"
            checked={regulationsRead}
            onChange={(e) => { setRegulationsRead(e.target.checked); clearError("regulationsRead"); }}
            className={`${checkboxClass} mt-0.5`}
            aria-invalid={!!errors.regulationsRead || undefined}
            aria-describedby={errors.regulationsRead ? "regulationsRead-error" : undefined}
          />
          <span className={errors.regulationsRead ? (dark ? "text-sm text-red-300" : "text-sm text-red-700") : textClass}>
            Ik heb het{" "}
            {dark ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowReglement(true); }}
                className="font-semibold underline text-white hover:text-white/80 transition-colors"
              >
                wandelreglement
              </button>
            ) : (
              <a href="/wandelreglement" target="_blank" className="font-semibold underline text-primary hover:text-accent transition-colors">
                wandelreglement
              </a>
            )}{" "}
            gelezen en ga hiermee akkoord *
          </span>
        </label>
        {errors.regulationsRead && <p id="regulationsRead-error" role="alert" className={errorClass}>{errors.regulationsRead}</p>}
        {fieldErrors?.regulationsRead && <p className={errorClass}>{fieldErrors.regulationsRead[0]}</p>}
      </div>

      <button
        type="submit"
        disabled={pending || uploading}
        className={`w-full py-3.5 text-white font-bold text-center transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed ${
          dark
            ? "bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/25"
            : "bg-accent hover:bg-accent/90 rounded-full shadow-lg shadow-accent/40 py-4"
        }`}
      >
        {pending ? "Registratie versturen..." : "Registreer als wandelaar"}
      </button>

      {/* Wandelreglement popup (dark variant only) */}
      {showReglement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowReglement(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#1b4332] border border-white/10 shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowReglement(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="font-heading text-xl font-bold text-white">Wandelreglement</h2>
            <WalkRegulationsVersion className="mb-4 text-xs text-white/60" />

            {/* Story 10.77: dezelfde tekst als de publieke pagina en de wandelaar-app. */}
            <div className="mb-6">
              <WalkRegulationsList tone="dark" />
            </div>

            <div className="border-t border-white/10 pt-4">
              <h3 className="font-heading text-sm font-bold text-white mb-3">Wandeluren</h3>
              <div className="space-y-2">
                {[
                  { day: "Maandag", hours: "10:00 – 12:00" },
                  { day: "Woensdag", hours: "10:00 – 12:00" },
                  { day: "Vrijdag", hours: "10:00 – 12:00" },
                  { day: "Zaterdag", hours: "10:00 – 12:00" },
                ].map((item) => (
                  <div key={item.day} className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white/90">{item.day}</span>
                    <span className="text-sm text-white/60 font-mono whitespace-nowrap">{item.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReglement(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-bold text-white hover:bg-white/20 transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
