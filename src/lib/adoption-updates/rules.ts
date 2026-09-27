/**
 * Story 10.74 (Sven) — berichten en foto's die adoptanten na de adoptie sturen.
 * Pure regels: kanalen, toegelaten bestanden, waar ze in de private opslag komen,
 * en wanneer de sectie op de fiche verschijnt.
 */

export const ADOPTION_UPDATE_CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "mail", label: "Mail" },
  { value: "telefoon", label: "Telefoon" },
  { value: "bezoek", label: "Bezoek" },
  { value: "andere", label: "Andere" },
] as const;

export type AdoptionUpdateChannel = (typeof ADOPTION_UPDATE_CHANNELS)[number]["value"];

export const ADOPTION_UPDATE_CHANNEL_VALUES = ADOPTION_UPDATE_CHANNELS.map((k) => k.value) as [
  AdoptionUpdateChannel,
  ...AdoptionUpdateChannel[],
];

export function adoptionChannelLabel(value: string): string {
  return ADOPTION_UPDATE_CHANNELS.find((k) => k.value === value)?.label ?? value;
}

/**
 * Een Vercel-functie aanvaardt en levert max. 4,5 MB. Foto's worden in de browser
 * verkleind (`PHOTO_MAX_SIZE_PX`) en blijven daardoor ruim onder deze grens.
 */
export const ADOPTION_UPDATE_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ADOPTION_UPDATE_MAX_FILES = 20;
export const PHOTO_MAX_SIZE_PX = 2000;

export type AdoptionFileKind = "foto" | "mail" | "pdf";

/** Extensie → soort + het type dat wíj bewaren (niet wat de browser beweert). */
const TOEGELATEN: Record<string, { kind: AdoptionFileKind; mimeType: string }> = {
  jpg: { kind: "foto", mimeType: "image/jpeg" },
  jpeg: { kind: "foto", mimeType: "image/jpeg" },
  png: { kind: "foto", mimeType: "image/png" },
  webp: { kind: "foto", mimeType: "image/webp" },
  eml: { kind: "mail", mimeType: "message/rfc822" },
  pdf: { kind: "pdf", mimeType: "application/pdf" },
};

/**
 * `null` = niet toegelaten. De extensie is leidend: Outlook stuurt .eml soms als
 * application/octet-stream (zie 10.41), en een meegestuurd type bewijst niets.
 */
export function classifyAdoptionFile(fileName: string): { kind: AdoptionFileKind; mimeType: string } | null {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return ext ? TOEGELATEN[ext] ?? null : null;
}

export function fileKindFromMime(mimeType: string): AdoptionFileKind {
  if (mimeType.startsWith("image/")) return "foto";
  if (mimeType === "message/rfc822") return "mail";
  return "pdf";
}

/** `adoptie-berichten/<dier>/<bericht>/<veilige naam>`; de opslag voegt nog een willekeurig achtervoegsel toe. */
export function adoptionFilePathname(animalId: number, updateId: number, fileName: string): string {
  const basis = fileName.split(/[\\/]/).pop() ?? "bestand";
  const punt = basis.lastIndexOf(".");
  const naam = punt > 0 ? basis.slice(0, punt) : basis;
  const ext = punt > 0 ? basis.slice(punt + 1).toLowerCase() : "";
  const veilig =
    naam
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9\-_\s]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "bestand";
  return `adoptie-berichten/${animalId}/${updateId}/${veilig}${ext ? `.${ext}` : ""}`;
}

/** De sectie verschijnt zodra het dier geadopteerd is, of als er al berichten zijn. */
export function shouldShowAdoptionUpdates(
  animal: { adoptedDate: string | null; outtakeReason: string | null; status: string | null },
  aantalBerichten: number,
): boolean {
  return (
    aantalBerichten > 0 ||
    !!animal.adoptedDate ||
    animal.outtakeReason === "adoptie" ||
    animal.status === "geadopteerd"
  );
}
