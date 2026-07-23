/**
 * Waar elke workflow-fase over gaat, in één zin.
 *
 * De formuleringen volgen de taken die het systeem bij die fase aanmaakt
 * (zie `auto-actions.ts`), zodat de uitleg overeenkomt met wat de medewerker
 * effectief in zijn takenlijst ziet verschijnen.
 */
export const PHASE_DESCRIPTIONS: Record<string, string> = {
  intake:
    "Het dier komt binnen. Aankomstdatum en reden van opvang worden vastgelegd.",
  registratie:
    "Administratief in orde brengen: opnemen in het register, een kennel toewijzen en foto's nemen.",
  medisch:
    "De gezondheid op punt zetten: eerste dierenartsbezoek, vaccinaties, ontworming en chip.",
  verblijf:
    "Het dier verblijft in het asiel: gedrag opvolgen en een voedingsplan opstellen.",
  adoptie:
    "Het dier mag naar een nieuwe thuis: kandidaten screenen, kennismaking en contract.",
  afgerond:
    "Het dossier is gesloten: overdracht melden en de adoptant opvolgen na 1 week en 1 maand.",
};

export function getPhaseDescription(phase: string): string {
  return PHASE_DESCRIPTIONS[phase] ?? "";
}
