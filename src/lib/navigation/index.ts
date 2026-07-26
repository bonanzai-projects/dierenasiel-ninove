import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiredPermission: Permission | null;
};

export const BEHEERDER_NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/beheerder", icon: "📊", requiredPermission: null },
  { label: "Kalender", href: "/beheerder/kalender", icon: "📅", requiredPermission: null },
  { label: "Zwerfkatten", href: "/beheerder/dieren/zwerfkattenbeleid", icon: "🐈", requiredPermission: "stray_cat:read" },
  { label: "Dieren", href: "/beheerder/dieren", icon: "🐾", requiredPermission: "animal:read" },
  { label: "Medisch", href: "/beheerder/medisch", icon: "🏥", requiredPermission: "medical:read" },
  { label: "Adoptie", href: "/beheerder/adoptie", icon: "📋", requiredPermission: "adoption:read" },
  { label: "Kennels", href: "/beheerder/dieren/kennel", icon: "🏠", requiredPermission: "kennel:read" },
  { label: "Rapporten", href: "/beheerder/rapporten", icon: "📈", requiredPermission: "report:read" },
  { label: "Website", href: "/beheerder/website", icon: "🌐", requiredPermission: "website:read" },
  // Epic 11 — alleen-lezen koppeling met animalshelter.be.
  { label: "AnimalShelter", href: "/beheerder/animalshelter", icon: "🔗", requiredPermission: "animalshelter:read" },
  { label: "Mailing", href: "/beheerder/mailing", icon: "✉️", requiredPermission: "adoption:read" },
  { label: "Wandelaars", href: "/beheerder/wandelaars", icon: "🚶", requiredPermission: "walker:read" },
  { label: "GDPR", href: "/beheerder/gdpr", icon: "🔒", requiredPermission: "gdpr:read" },
  { label: "Gebruikers", href: "/beheerder/gebruikers", icon: "👥", requiredPermission: "user:read" },
  { label: "Instellingen", href: "/beheerder/instellingen", icon: "⚙️", requiredPermission: "settings:read" },
];

export function getVisibleNavItems(role: string): NavItem[] {
  return BEHEERDER_NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || hasPermission(role, item.requiredPermission),
  );
}

// Re-export from separate file to keep Client Component imports clean
export { isNavItemActive } from "./active";
