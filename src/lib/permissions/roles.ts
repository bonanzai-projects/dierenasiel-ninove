import type { PermissionMap } from "./types";
import { ALL_PERMISSIONS } from "./types";

export const ROLE_PERMISSIONS: PermissionMap = {
  beheerder: ALL_PERMISSIONS,

  medewerker: [
    "animal:read",
    "animal:write",
    "medical:read",
    "medical:first_check",
    "adoption:read",
    "walker:read",
    "kennel:read",
    "kennel:write",
    "workflow:write",
    "website:read",
    "animalshelter:read",
    // Epic 13: een eetkermis wordt door het team gedragen, niet door één beheerder.
    "event:read",
    "event:write",
  ],

  dierenarts: [
    "animal:read",
    "medical:read",
    "medical:write",
    "medical:first_check",
  ],

  adoptieconsulent: [
    "animal:read",
    "adoption:read",
    "adoption:write",
  ],

  coördinator: [
    "animal:read",
    "medical:read",
    "adoption:read",
    "walker:read",
    "walker:write",
    "kennel:read",
    "report:read",
    "report:generate",
    "user:read",
    "settings:read",
    "audit:read",
    "workflow:read",
    "workflow:write",
    "website:read",
    "website:write",
    "animalshelter:read",
    "event:read",
    "event:write",
  ],
};
