import type { BackofficeRole } from "@/types";
import { ROLE_PERMISSIONS } from "./roles";
import type { Permission } from "./types";

/**
 * Uitleg bij de rollen, afgeleid uit `ROLE_PERMISSIONS` zelf.
 *
 * Waarom niet gewoon een tekstje? Omdat `roles.ts` bij zowat elke epic wijzigt
 * (story 13.3 haalde nog `event:*` weg bij medewerker en coördinator). Uitleg
 * die je met de hand bijhoudt, klopt binnen de maand niet meer — en verkeerde
 * uitleg over rechten is erger dan geen uitleg. Wat hier op het scherm komt,
 * ís dus wat de code doet.
 *
 * De test bewaakt dat élke permissie uit `ALL_PERMISSIONS` in precies één thema
 * zit. Voeg je er een toe zonder ze hier te plaatsen, dan breekt de suite.
 */

/** Rolnamen zoals ze op het scherm horen te staan. */
export const ROLE_LABELS: Record<BackofficeRole, string> = {
  beheerder: "Beheerder",
  medewerker: "Medewerker",
  dierenarts: "Dierenarts",
  adoptieconsulent: "Adoptieconsulent",
  "coördinator": "Coördinator",
};

export interface PermissionArea {
  key: string;
  /** Zoals het op het scherm staat — mensentaal, geen `medical:first_check`. */
  label: string;
  read?: Permission;
  write?: Permission;
  /** Werkwoord voor het schrijfrecht. Standaard "bewerken". */
  writeVerb?: string;
  /** Permissies die apart benoemd worden omdat ze niet in lezen/schrijven passen. */
  extras?: { permission: Permission; label: string }[];
  /** Korte toelichting onder het label. */
  hint?: string;
}

export const PERMISSION_AREAS: PermissionArea[] = [
  {
    key: "dieren",
    label: "Dieren",
    read: "animal:read",
    write: "animal:write",
    hint: "de fiches: registreren, gegevens aanpassen, foto's",
  },
  {
    key: "levensloop",
    label: "Levensloop van een dier",
    read: "workflow:read",
    write: "workflow:write",
    writeVerb: "fases doorschuiven",
    hint: "de stappenbalk op de fiche",
  },
  {
    key: "medisch",
    label: "Medisch dossier",
    read: "medical:read",
    write: "medical:write",
    extras: [
      { permission: "medical:first_check", label: "eerste controle bij binnenkomst" },
    ],
  },
  {
    key: "adoptie",
    label: "Adopties",
    read: "adoption:read",
    write: "adoption:write",
    hint: "kandidaten, contracten en opvolging na adoptie",
  },
  {
    key: "wandelaars",
    label: "Wandelaars",
    read: "walker:read",
    write: "walker:write",
  },
  {
    key: "kennels",
    label: "Kennels en grondplan",
    read: "kennel:read",
    write: "kennel:write",
  },
  {
    key: "zwerfkatten",
    label: "Zwerfkatten",
    read: "stray_cat:read",
    write: "stray_cat:write",
    hint: "campagnes, vangkooien en meldingen",
  },
  {
    key: "evenementen",
    label: "Evenementen",
    read: "event:read",
    write: "event:write",
    hint: "draaiboek, kosten en evaluatie",
  },
  {
    key: "personeel",
    label: "Personeelsplanning",
    read: "staff:read",
    write: "staff:write",
    writeVerb: "anderen in- en uitschrijven",
    hint: "wie komt welke dag; jezelf inschrijven kan met leesrecht",
  },
  {
    key: "rapporten",
    label: "Rapporten",
    read: "report:read",
    write: "report:generate",
    writeVerb: "aanmaken",
  },
  {
    key: "website",
    label: "Website-inhoud",
    read: "website:read",
    write: "website:write",
  },
  {
    key: "animalshelter",
    label: "AnimalShelter-koppeling",
    read: "animalshelter:read",
    hint: "bewust alleen-lezen: er bestaat geen schrijfrecht, ook niet voor de beheerder",
  },
  {
    key: "gebruikers",
    label: "Gebruikers",
    read: "user:read",
    write: "user:manage",
    writeVerb: "beheren",
    hint: "accounts aanmaken, rollen toekennen, uitnodigingen versturen",
  },
  {
    key: "instellingen",
    label: "Instellingen",
    read: "settings:read",
    write: "settings:write",
  },
  {
    key: "logboek",
    label: "Logboek",
    read: "audit:read",
    hint: "wie wat wanneer wijzigde",
  },
  {
    key: "gdpr",
    label: "GDPR-verzoeken",
    read: "gdpr:read",
    write: "gdpr:write",
  },
];

export type AreaAccess = "geen" | "lezen" | "schrijven";

function heeft(role: BackofficeRole, permission: Permission | undefined): boolean {
  if (!permission) return false;
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

/**
 * Schrijfrecht wint van leesrecht: wie mag wijzigen, kan sowieso zien. Dat is
 * geen aanname maar een feit van de schermen — en het spaart een vierde geval
 * ("wel schrijven, niet lezen") dat in `roles.ts` echt voorkomt.
 */
export function accessForArea(role: BackofficeRole, area: PermissionArea): AreaAccess {
  if (heeft(role, area.write)) return "schrijven";
  if (heeft(role, area.read)) return "lezen";
  if ((area.extras ?? []).some((extra) => heeft(role, extra.permission))) return "lezen";
  return "geen";
}

export function accessLabel(access: AreaAccess, area: PermissionArea): string {
  if (access === "geen") return "—";
  if (access === "lezen") return "bekijken";
  return `bekijken en ${area.writeVerb ?? "bewerken"}`;
}

export function extrasForArea(role: BackofficeRole, area: PermissionArea): string[] {
  return (area.extras ?? [])
    .filter((extra) => heeft(role, extra.permission))
    .map((extra) => extra.label);
}

export interface RoleAreaSummary {
  key: string;
  label: string;
  access: AreaAccess;
  description: string;
  extras: string[];
}

/** Twee lijsten: wat deze rol mag, en — even uitdrukkelijk — wat niet. */
export function describeRole(role: BackofficeRole): {
  mag: RoleAreaSummary[];
  magNiet: RoleAreaSummary[];
} {
  const mag: RoleAreaSummary[] = [];
  const magNiet: RoleAreaSummary[] = [];

  for (const area of PERMISSION_AREAS) {
    const access = accessForArea(role, area);
    const samenvatting: RoleAreaSummary = {
      key: area.key,
      label: area.label,
      access,
      description: accessLabel(access, area),
      extras: extrasForArea(role, area),
    };
    (access === "geen" ? magNiet : mag).push(samenvatting);
  }

  return { mag, magNiet };
}
