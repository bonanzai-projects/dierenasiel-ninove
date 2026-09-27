import { getIntakeReasonLabel } from "@/lib/constants";
import { genderLabel, speciesLabel, statusLabel } from "@/lib/utils";

/**
 * R6 "Te adopteren dieren" — kolommen en celwaarden, gedeeld door scherm en PDF
 * zodat die niet uit elkaar lopen.
 *
 * Story 10.73 (Sven): "reden van intake achter intake datum. beschrijf hoeft niet
 * in overzicht daarvoor klikken we wel open" — de beschrijving staat op de fiche.
 */

export const R6_COLUMNS = [
  { key: "name", label: "Naam" },
  { key: "species", label: "Soort" },
  { key: "breed", label: "Ras" },
  { key: "gender", label: "Geslacht" },
  { key: "status", label: "Status" },
  { key: "chip", label: "Chipnr" },
  { key: "intakeDate", label: "Intake datum" },
  { key: "intakeReason", label: "Reden intake" },
] as const;

export type R6Key = (typeof R6_COLUMNS)[number]["key"];

export interface R6Animal {
  name: string;
  species: string;
  breed: string | null;
  gender: string;
  status: string | null;
  identificationNr: string | null;
  intakeDate: string | null;
  intakeReason: string | null;
}

/** Label uit INTAKE_REASONS; een onbekende waarde toont zichzelf, niets ingevuld = "-". */
function redenIntake(waarde: string | null): string {
  if (!waarde) return "-";
  const label = getIntakeReasonLabel(waarde);
  return label === "—" ? waarde : label;
}

export function r6Row(a: R6Animal): Record<R6Key, string> {
  return {
    name: a.name,
    species: speciesLabel(a.species),
    breed: a.breed ?? "-",
    gender: genderLabel(a.gender),
    status: statusLabel(a.status ?? ""),
    chip: a.identificationNr ?? "-",
    intakeDate: a.intakeDate ?? "-",
    intakeReason: redenIntake(a.intakeReason),
  };
}
