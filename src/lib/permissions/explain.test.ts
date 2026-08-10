import { describe, it, expect } from "vitest";
import { ALL_PERMISSIONS } from "./types";
import { ROLE_PERMISSIONS } from "./roles";
import {
  PERMISSION_AREAS,
  accessForArea,
  accessLabel,
  describeRole,
  extrasForArea,
} from "./explain";
import { BACKOFFICE_ROLES } from "@/lib/constants";

describe("PERMISSION_AREAS — volledigheidsgarantie", () => {
  it("dekt élke permissie uit ALL_PERMISSIONS precies één keer", () => {
    const gedekt = PERMISSION_AREAS.flatMap((area) => [
      ...(area.read ? [area.read] : []),
      ...(area.write ? [area.write] : []),
      ...(area.extras ?? []).map((e) => e.permission),
    ]);

    // Geen dubbels
    expect(new Set(gedekt).size).toBe(gedekt.length);

    // Niets vergeten, en niets verzonnen
    expect([...gedekt].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("geeft elk thema een leesbaar label zonder dubbele punt", () => {
    for (const area of PERMISSION_AREAS) {
      expect(area.label.length).toBeGreaterThan(2);
      expect(area.label).not.toContain(":");
    }
  });

  it("heeft unieke sleutels", () => {
    const keys = PERMISSION_AREAS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("accessForArea", () => {
  const dieren = PERMISSION_AREAS.find((a) => a.key === "dieren")!;
  const evenementen = PERMISSION_AREAS.find((a) => a.key === "evenementen")!;
  const medisch = PERMISSION_AREAS.find((a) => a.key === "medisch")!;

  it("geeft de beheerder overal schrijfrecht", () => {
    for (const area of PERMISSION_AREAS) {
      expect(accessForArea("beheerder", area)).not.toBe("geen");
    }
  });

  it("ziet dat een medewerker dieren mag bewerken", () => {
    expect(accessForArea("medewerker", dieren)).toBe("schrijven");
  });

  it("ziet dat een medewerker het medisch dossier enkel mag bekijken", () => {
    expect(accessForArea("medewerker", medisch)).toBe("lezen");
  });

  it("ziet dat een medewerker niet aan evenementen kan", () => {
    expect(accessForArea("medewerker", evenementen)).toBe("geen");
  });

  it("ziet dat een coördinator niet aan evenementen kan", () => {
    expect(accessForArea("coördinator", evenementen)).toBe("geen");
  });

  it("ziet dat een dierenarts niets met adoptie te maken heeft", () => {
    const adoptie = PERMISSION_AREAS.find((a) => a.key === "adoptie")!;
    expect(accessForArea("dierenarts", adoptie)).toBe("geen");
  });

  it("noemt schrijfrecht zonder leesrecht gewoon schrijven", () => {
    // medewerker heeft workflow:write maar geen workflow:read — schrijven impliceert zien
    const workflow = PERMISSION_AREAS.find((a) => a.key === "levensloop")!;
    expect(accessForArea("medewerker", workflow)).toBe("schrijven");
  });
});

describe("accessLabel", () => {
  it("gebruikt het werkwoord van het thema", () => {
    const rapporten = PERMISSION_AREAS.find((a) => a.key === "rapporten")!;
    expect(accessLabel("schrijven", rapporten)).toContain("aanmaken");

    const gebruikers = PERMISSION_AREAS.find((a) => a.key === "gebruikers")!;
    expect(accessLabel("schrijven", gebruikers)).toContain("beheren");
  });

  it("valt terug op 'bewerken'", () => {
    const dieren = PERMISSION_AREAS.find((a) => a.key === "dieren")!;
    expect(accessLabel("schrijven", dieren)).toContain("bewerken");
  });

  it("zegt duidelijk dat er geen toegang is", () => {
    const dieren = PERMISSION_AREAS.find((a) => a.key === "dieren")!;
    expect(accessLabel("geen", dieren)).toBe("—");
  });

  it("noemt lezen 'bekijken'", () => {
    const dieren = PERMISSION_AREAS.find((a) => a.key === "dieren")!;
    expect(accessLabel("lezen", dieren)).toBe("bekijken");
  });
});

describe("extrasForArea", () => {
  it("noemt de eerste controle bij een medewerker", () => {
    const medisch = PERMISSION_AREAS.find((a) => a.key === "medisch")!;
    expect(extrasForArea("medewerker", medisch)).toContain("eerste controle bij binnenkomst");
  });

  it("noemt niets extra voor een adoptieconsulent", () => {
    const medisch = PERMISSION_AREAS.find((a) => a.key === "medisch")!;
    expect(extrasForArea("adoptieconsulent", medisch)).toEqual([]);
  });
});

describe("describeRole", () => {
  it("splitst in wat mag en wat niet mag", () => {
    const beschrijving = describeRole("adoptieconsulent");

    expect(beschrijving.mag.map((a) => a.label)).toContain("Adopties");
    expect(beschrijving.magNiet.map((a) => a.label)).toContain("Wandelaars");
  });

  it("laat bij de beheerder niets in de niet-lijst staan", () => {
    expect(describeRole("beheerder").magNiet).toEqual([]);
  });

  it("verdeelt élk thema over precies één van de twee lijsten", () => {
    for (const role of BACKOFFICE_ROLES) {
      const { mag, magNiet } = describeRole(role);
      expect(mag.length + magNiet.length).toBe(PERMISSION_AREAS.length);
    }
  });

  it("werkt voor élke rol die in ROLE_PERMISSIONS staat", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
      expect(() => describeRole(role)).not.toThrow();
    }
  });
});
