// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import RolePermissionsInfo from "./RolePermissionsInfo";
import { PERMISSION_AREAS } from "@/lib/permissions/explain";

/** De rij van een onderdeel, om cellen per rol te kunnen nakijken. */
function rij(label: string): HTMLElement {
  const cel = screen.getByRole("rowheader", { name: new RegExp(`^${label}`) });
  return cel.closest("tr")!;
}

/** Kolomindex van een rol (0 = eerste rolkolom, na de kolom "Onderdeel"). */
const KOLOM = {
  beheerder: 0,
  medewerker: 1,
  dierenarts: 2,
  adoptieconsulent: 3,
  coördinator: 4,
} as const;

function cel(label: string, rol: keyof typeof KOLOM): string {
  const cellen = within(rij(label)).getAllByRole("cell");
  return cellen[KOLOM[rol]].textContent ?? "";
}

describe("RolePermissionsInfo", () => {
  it("toont een kolom per rol", () => {
    render(<RolePermissionsInfo open />);

    for (const naam of ["Beheerder", "Medewerker", "Dierenarts", "Adoptieconsulent", "Coördinator"]) {
      expect(screen.getByRole("columnheader", { name: naam })).toBeInTheDocument();
    }
  });

  it("toont een rij per onderdeel", () => {
    render(<RolePermissionsInfo open />);

    for (const area of PERMISSION_AREAS) {
      expect(
        screen.getByRole("rowheader", { name: new RegExp(`^${area.label}`) }),
      ).toBeInTheDocument();
    }
  });

  it("laat zien dat een medewerker dieren mag bewerken", () => {
    render(<RolePermissionsInfo open />);
    expect(cel("Dieren", "medewerker")).toContain("bekijken en bewerken");
  });

  it("laat zien dat een medewerker het medisch dossier enkel mag bekijken", () => {
    render(<RolePermissionsInfo open />);
    const tekst = cel("Medisch dossier", "medewerker");
    expect(tekst).toContain("bekijken");
    expect(tekst).not.toContain("bewerken");
  });

  it("noemt de eerste controle als extra bij de medewerker", () => {
    render(<RolePermissionsInfo open />);
    expect(cel("Medisch dossier", "medewerker")).toContain("eerste controle");
  });

  it("toont een streepje waar een rol geen toegang heeft", () => {
    render(<RolePermissionsInfo open />);
    expect(cel("Evenementen", "medewerker")).toBe("—");
    expect(cel("Evenementen", "coördinator")).toBe("—");
    expect(cel("Wandelaars", "adoptieconsulent")).toBe("—");
  });

  it("gebruikt het juiste werkwoord per onderdeel", () => {
    render(<RolePermissionsInfo open />);
    expect(cel("Rapporten", "beheerder")).toContain("aanmaken");
    expect(cel("Gebruikers", "beheerder")).toContain("beheren");
  });

  it("legt uit dat de AnimalShelter-koppeling bewust alleen-lezen is", () => {
    render(<RolePermissionsInfo open />);
    expect(screen.getByText(/bewust alleen-lezen/i)).toBeInTheDocument();
    expect(cel("AnimalShelter-koppeling", "beheerder")).toBe("bekijken");
  });

  it("legt uit wat een streepje betekent", () => {
    render(<RolePermissionsInfo open />);
    expect(screen.getByText(/geen toegang/i)).toBeInTheDocument();
  });

  it("staat standaard dichtgeklapt zodat het de lijst niet verdringt", () => {
    const { container } = render(<RolePermissionsInfo />);
    expect(container.querySelector("details")?.open).toBe(false);
    expect(screen.getByText("Wat mag elke rol?")).toBeInTheDocument();
  });
});
