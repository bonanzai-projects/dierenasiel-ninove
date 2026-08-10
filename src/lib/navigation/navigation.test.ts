import { describe, it, expect } from "vitest";
import { BEHEERDER_NAV_ITEMS, getVisibleNavItems } from "./index";
import { isNavItemActive } from "./active";

describe("BEHEERDER_NAV_ITEMS", () => {
  it("has exactly 17 navigation items", () => {
    expect(BEHEERDER_NAV_ITEMS).toHaveLength(17);
  });

  it("each item has label, href, icon, and requiredPermission", () => {
    for (const item of BEHEERDER_NAV_ITEMS) {
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("href");
      expect(item).toHaveProperty("icon");
      expect(item).toHaveProperty("requiredPermission");
      expect(typeof item.label).toBe("string");
      expect(typeof item.href).toBe("string");
      expect(typeof item.icon).toBe("string");
      expect(item.href).toMatch(/^\/beheerder/);
    }
  });

  it("has Dashboard as first item with null permission (always visible)", () => {
    expect(BEHEERDER_NAV_ITEMS[0].label).toBe("Dashboard");
    expect(BEHEERDER_NAV_ITEMS[0].requiredPermission).toBeNull();
  });

  it("contains all expected module labels", () => {
    const labels = BEHEERDER_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      "Dashboard",
      "Kalender",
      "Evenementen",
      "Personeel",
      "Zwerfkatten",
      "Dieren",
      "Medisch",
      "Adoptie",
      "Kennels",
      "Rapporten",
      "Website",
      "AnimalShelter",
      "Mailing",
      "Wandelaars",
      "GDPR",
      "Gebruikers",
      "Instellingen",
    ]);
  });
});

describe("getVisibleNavItems", () => {
  it("shows all 17 items for beheerder", () => {
    const items = getVisibleNavItems("beheerder");
    expect(items).toHaveLength(17);
  });

  it("shows the shared Kalender to every role (null permission)", () => {
    // Kalender is een gedeelde teamkalender: iedereen met backoffice-toegang ziet hem.
    for (const role of ["beheerder", "medewerker", "dierenarts", "adoptieconsulent", "unknown-role"]) {
      expect(getVisibleNavItems(role).map((i) => i.label)).toContain("Kalender");
    }
  });

  it("shows correct items for medewerker", () => {
    const items = getVisibleNavItems("medewerker");
    const labels = items.map((i) => i.label);
    // medewerker has: animal:read, medical:read, adoption:read, walker:read, kennel:read, website:read
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Dieren");
    expect(labels).toContain("Medisch");
    expect(labels).toContain("Adoptie");
    expect(labels).toContain("Wandelaars");
    expect(labels).toContain("Kennels");
    expect(labels).toContain("Website");
    expect(labels).toContain("Mailing"); // adoption:read
    // medewerker does NOT have: report:read, user:read, settings:read, gdpr:read, stray_cat:read
    expect(labels).not.toContain("Rapporten");
    expect(labels).not.toContain("Gebruikers");
    expect(labels).not.toContain("Instellingen");
    expect(labels).not.toContain("GDPR");
    expect(labels).not.toContain("Zwerfkatten");
  });

  it("shows correct items for dierenarts", () => {
    const items = getVisibleNavItems("dierenarts");
    const labels = items.map((i) => i.label);
    // dierenarts has: animal:read, medical:read
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Dieren");
    expect(labels).toContain("Medisch");
    // dierenarts does NOT have most permissions
    expect(labels).not.toContain("Adoptie");
    expect(labels).not.toContain("Wandelaars");
    expect(labels).not.toContain("Kennels");
    expect(labels).not.toContain("Website");
    expect(labels).not.toContain("Gebruikers");
    expect(labels).not.toContain("Instellingen");
    expect(labels).not.toContain("Mailing");
    expect(labels).not.toContain("Rapporten");
    expect(labels).not.toContain("GDPR");
    expect(labels).not.toContain("Zwerfkatten");
  });

  it("shows correct items for adoptieconsulent", () => {
    const items = getVisibleNavItems("adoptieconsulent");
    const labels = items.map((i) => i.label);
    // adoptieconsulent has: animal:read, adoption:read
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Dieren");
    expect(labels).toContain("Adoptie");
    expect(labels).toContain("Mailing"); // adoption:read
    expect(labels).not.toContain("Medisch");
    expect(labels).not.toContain("Wandelaars");
    expect(labels).not.toContain("Kennels");
    expect(labels).not.toContain("Rapporten");
    expect(labels).not.toContain("Website");
    expect(labels).not.toContain("Gebruikers");
    expect(labels).not.toContain("Instellingen");
    expect(labels).not.toContain("GDPR");
    expect(labels).not.toContain("Zwerfkatten");
  });

  it("shows correct items for coördinator", () => {
    const items = getVisibleNavItems("coördinator");
    const labels = items.map((i) => i.label);
    // coördinator has many: animal:read, medical:read, adoption:read, walker:read, kennel:read,
    // report:read, user:read, settings:read, website:read
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Dieren");
    expect(labels).toContain("Medisch");
    expect(labels).toContain("Adoptie");
    expect(labels).toContain("Wandelaars");
    expect(labels).toContain("Kennels");
    expect(labels).toContain("Rapporten");
    expect(labels).toContain("Website");
    expect(labels).toContain("Gebruikers");
    expect(labels).toContain("Instellingen");
    expect(labels).toContain("Mailing");
    // coördinator does NOT have gdpr:read, stray_cat:read
    expect(labels).not.toContain("GDPR");
    expect(labels).not.toContain("Zwerfkatten");
  });

  it("returns only the permission-free items (Dashboard + Kalender) for unknown role", () => {
    const items = getVisibleNavItems("unknown-role");
    expect(items.map((i) => i.label)).toEqual(["Dashboard", "Kalender"]);
  });
});

describe("isNavItemActive", () => {
  it("matches Dashboard only on exact /beheerder path", () => {
    expect(isNavItemActive("/beheerder", "/beheerder")).toBe(true);
    expect(isNavItemActive("/beheerder", "/beheerder/dieren")).toBe(false);
  });

  it("matches exact path for a module", () => {
    expect(isNavItemActive("/beheerder/dieren", "/beheerder/dieren")).toBe(true);
  });

  it("matches child paths for a module", () => {
    expect(isNavItemActive("/beheerder/dieren", "/beheerder/dieren/123")).toBe(true);
  });

  it("uses longest-match-wins: Kennels wins over Dieren at /beheerder/dieren/kennel", () => {
    const allHrefs = BEHEERDER_NAV_ITEMS.map((item) => item.href);
    // Kennels (/beheerder/dieren/kennel) should be active
    expect(isNavItemActive("/beheerder/dieren/kennel", "/beheerder/dieren/kennel", allHrefs)).toBe(true);
    // Dieren (/beheerder/dieren) should NOT be active because Kennels is a longer match
    expect(isNavItemActive("/beheerder/dieren", "/beheerder/dieren/kennel", allHrefs)).toBe(false);
  });

  it("Dieren stays active for non-kennel child routes", () => {
    const allHrefs = BEHEERDER_NAV_ITEMS.map((item) => item.href);
    expect(isNavItemActive("/beheerder/dieren", "/beheerder/dieren/123", allHrefs)).toBe(true);
  });

  it("does not match unrelated paths", () => {
    expect(isNavItemActive("/beheerder/dieren", "/beheerder/medisch")).toBe(false);
  });
});
