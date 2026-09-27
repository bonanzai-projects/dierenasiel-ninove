import { ROLE_LABELS } from "@/lib/permissions/explain";

/**
 * Story 10.78 (Sven: "filter zetten op de rol van de persoon om ze te
 * centraliseren in de lijst") — de gebruikerslijst per rol samen, met een filter.
 * Pure logica: labels, volgorde, filteropties en het filteren + sorteren.
 */

export const ALLE_ROLLEN = "alle";

/** Vaste volgorde in de lijst en de filter; een onbekende rol komt achteraan. */
const VOLGORDE = ["beheerder", "coördinator", "medewerker", "adoptieconsulent", "dierenarts", "wandelaar"];

const EXTRA_LABELS: Record<string, string> = { wandelaar: "Wandelaar" };

export function userRoleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? EXTRA_LABELS[role] ?? role;
}

function plaats(role: string): number {
  const i = VOLGORDE.indexOf(role);
  return i === -1 ? VOLGORDE.length : i;
}

function opRol(a: string, b: string): number {
  return plaats(a) - plaats(b) || a.localeCompare(b, "nl");
}

export interface RoleFilterOption {
  value: string;
  label: string;
  count: number;
}

export function roleFilterOptions(users: { role: string }[]): RoleFilterOption[] {
  const aantallen = new Map<string, number>();
  for (const u of users) aantallen.set(u.role, (aantallen.get(u.role) ?? 0) + 1);

  return [
    { value: ALLE_ROLLEN, label: "Alle", count: users.length },
    ...[...aantallen.keys()].sort(opRol).map((role) => ({
      value: role,
      label: userRoleLabel(role),
      count: aantallen.get(role) ?? 0,
    })),
  ];
}

/** Gefilterd op rol (of iedereen), per rol samen en binnen een rol op naam. Wijzigt de invoer niet. */
export function filterAndSortUsers<T extends { role: string; name: string }>(users: T[], rol: string): T[] {
  return users
    .filter((u) => rol === ALLE_ROLLEN || u.role === rol)
    .sort((a, b) => opRol(a.role, b.role) || a.name.localeCompare(b.name, "nl"));
}
