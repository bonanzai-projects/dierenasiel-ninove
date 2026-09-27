import { describe, it, expect } from "vitest";
import { ALLE_ROLLEN, filterAndSortUsers, roleFilterOptions, userRoleLabel } from "./role-list";

// Story 10.78 (Sven): "filter zetten op de rol van de persoon om ze te centraliseren in de lijst".

const gebruiker = (id: number, name: string, role: string) => ({ id, name, role });

const lijst = [
  gebruiker(1, "Wim", "wandelaar"),
  gebruiker(2, "Sven", "beheerder"),
  gebruiker(3, "Nathalie", "medewerker"),
  gebruiker(4, "Anke", "medewerker"),
  gebruiker(5, "Dr. Peeters", "dierenarts"),
  gebruiker(6, "Carla", "coördinator"),
  gebruiker(7, "Ella", "adoptieconsulent"),
  gebruiker(8, "Bart", "wandelaar"),
];

describe("userRoleLabel", () => {
  it("geeft elke rol een leesbare naam, ook de wandelaar", () => {
    expect(userRoleLabel("beheerder")).toBe("Beheerder");
    expect(userRoleLabel("coördinator")).toBe("Coördinator");
    expect(userRoleLabel("wandelaar")).toBe("Wandelaar");
    expect(userRoleLabel("iets-nieuws")).toBe("iets-nieuws");
  });
});

describe("roleFilterOptions", () => {
  it("geeft 'Alle' en elke rol die voorkomt, met het aantal, in vaste volgorde", () => {
    expect(roleFilterOptions(lijst)).toEqual([
      { value: ALLE_ROLLEN, label: "Alle", count: 8 },
      { value: "beheerder", label: "Beheerder", count: 1 },
      { value: "coördinator", label: "Coördinator", count: 1 },
      { value: "medewerker", label: "Medewerker", count: 2 },
      { value: "adoptieconsulent", label: "Adoptieconsulent", count: 1 },
      { value: "dierenarts", label: "Dierenarts", count: 1 },
      { value: "wandelaar", label: "Wandelaar", count: 2 },
    ]);
  });

  it("laat rollen zonder gebruikers weg en zet een onbekende rol achteraan", () => {
    expect(roleFilterOptions([gebruiker(1, "X", "iets-nieuws"), gebruiker(2, "Y", "medewerker")]).map((o) => o.value)).toEqual([
      ALLE_ROLLEN, "medewerker", "iets-nieuws",
    ]);
  });
});

describe("filterAndSortUsers", () => {
  it("zet iedereen per rol samen, en binnen een rol op naam", () => {
    expect(filterAndSortUsers(lijst, ALLE_ROLLEN).map((u) => u.name)).toEqual([
      "Sven", "Carla", "Anke", "Nathalie", "Ella", "Dr. Peeters", "Bart", "Wim",
    ]);
  });

  it("toont enkel de gekozen rol", () => {
    expect(filterAndSortUsers(lijst, "medewerker").map((u) => u.name)).toEqual(["Anke", "Nathalie"]);
    expect(filterAndSortUsers(lijst, "dierenarts").map((u) => u.id)).toEqual([5]);
  });

  it("wijzigt de lijst zelf niet", () => {
    const kopie = [...lijst];
    filterAndSortUsers(lijst, ALLE_ROLLEN);
    expect(lijst).toEqual(kopie);
  });
});
