"use client";

/**
 * Story 10.29: sterilisatie/castratie als drie toestanden — Ja / Nee / Onbekend.
 * "Onbekend" wordt als `null` opgeslagen en toont "??" in het R1-rapport, zoals in
 * het as-is asielrapport. Gedeeld door IntakeForm en AnimalEditForm.
 */

export type NeuteredChoice = "true" | "false" | "onbekend";

const OPTIONS: { value: NeuteredChoice; label: string }[] = [
  { value: "true", label: "Ja" },
  { value: "false", label: "Nee" },
  { value: "onbekend", label: "Onbekend" },
];

export default function NeuteredRadioGroup({
  value,
  onChange,
}: {
  value: NeuteredChoice;
  onChange: (value: NeuteredChoice) => void;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="text-sm text-gray-700">Gesteriliseerd / Gecastreerd</legend>
      <div className="mt-1 flex flex-wrap gap-4">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="radio"
              name="isNeutered"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
