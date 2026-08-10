import type { BackofficeRole } from "@/types";

// Permission format: resource:action — single source of truth
export const ALL_PERMISSIONS = [
  "animal:read",
  "animal:write",
  "medical:read",
  "medical:write",
  "medical:first_check",
  "adoption:read",
  "adoption:write",
  "walker:read",
  "walker:write",
  "kennel:read",
  "kennel:write",
  "report:read",
  "report:generate",
  "user:read",
  "user:manage",
  "settings:read",
  "settings:write",
  "audit:read",
  "workflow:read",
  "workflow:write",
  "website:read",
  "website:write",
  "gdpr:read",
  "gdpr:write",
  "stray_cat:read",
  "stray_cat:write",
  // Epic 11 — AnimalShelter is een ALLEEN-LEZEN koppeling; er bestaat bewust geen
  // "animalshelter:write". Deze permissie dekt het menu, het ophalen en het
  // beslissen over verschillen (overnemen/negeren op onze eigen fiche).
  "animalshelter:read",
  // Epic 13 — evenementen (draaiboek, kosten, evaluatie).
  "event:read",
  "event:write",
  // Epic 14 — personeelsplanning. Lezen = het overzicht zien én jezelf
  // inschrijven; schrijven = iemand anders in- of uitschrijven.
  "staff:read",
  "staff:write",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export type PermissionMap = Record<BackofficeRole, readonly Permission[]>;
