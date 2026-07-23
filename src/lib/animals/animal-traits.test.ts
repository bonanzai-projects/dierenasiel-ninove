import { describe, it, expect } from "vitest";
import {
  ANIMAL_TRAITS,
  ANIMAL_TRAIT_VALUES,
  animalTraitValue,
  animalTraitLines,
} from "./animal-traits";

describe("ANIMAL_TRAITS", () => {
  it("bevat de 10 eigenschappen in de volgorde van de papieren affiche", () => {
    expect(ANIMAL_TRAITS.map((t) => t.key)).toEqual([
      "kinderen_tot_6",
      "kinderen_tot_14",
      "tuin_nodig",
      "zindelijk",
      "vervoer_auto",
      "andere_honden",
      "katten",
      "alleen_thuis",
      "basiscommandos",
      "ervaring_vereist",
    ]);
  });

  it("heeft de labels van het voorbeeldblad", () => {
    const byKey = Object.fromEntries(ANIMAL_TRAITS.map((t) => [t.key, t.label]));
    expect(byKey.kinderen_tot_6).toBe("Kan met kinderen om <6 jaar");
    expect(byKey.kinderen_tot_14).toBe("Kan met kinderen om <14 jaar");
    expect(byKey.tuin_nodig).toBe("Heeft toegang tot tuin nodig");
    expect(byKey.zindelijk).toBe("Zindelijk");
    expect(byKey.vervoer_auto).toBe("Kan vervoerd worden in de auto");
    expect(byKey.andere_honden).toBe("Kan met andere honden");
    expect(byKey.katten).toBe("Kan met katten");
    expect(byKey.alleen_thuis).toBe("Kan alleen thuis blijven");
    expect(byKey.basiscommandos).toBe("Basis commando's gekend");
    expect(byKey.ervaring_vereist).toBe("Ervaring vereist");
  });

  it("kent exact drie waarden", () => {
    expect(ANIMAL_TRAIT_VALUES).toEqual(["ja", "nee", "niet_gekend"]);
  });
});

describe("animalTraitValue", () => {
  const traits = { zindelijk: "ja", katten: "nee", tuin_nodig: "niet_gekend" };

  it("vertaalt de opgeslagen waarden naar leesbare tekst", () => {
    expect(animalTraitValue(traits, "zindelijk")).toBe("ja");
    expect(animalTraitValue(traits, "katten")).toBe("nee");
    expect(animalTraitValue(traits, "tuin_nodig")).toBe("niet gekend");
  });

  it("geeft 'niet gekend' voor een ontbrekende key", () => {
    expect(animalTraitValue(traits, "alleen_thuis")).toBe("niet gekend");
  });

  it("geeft 'niet gekend' voor een onbekende of lege opgeslagen waarde", () => {
    expect(animalTraitValue({ katten: "misschien" }, "katten")).toBe("niet gekend");
    expect(animalTraitValue({ katten: "" }, "katten")).toBe("niet gekend");
  });

  it("werkt met null/undefined traits", () => {
    expect(animalTraitValue(null, "katten")).toBe("niet gekend");
    expect(animalTraitValue(undefined, "katten")).toBe("niet gekend");
  });
});

describe("animalTraitLines", () => {
  it("geeft altijd 10 regels in vaste volgorde", () => {
    const lines = animalTraitLines({ zindelijk: "ja" });
    expect(lines).toHaveLength(10);
    expect(lines[0]).toEqual({
      key: "kinderen_tot_6",
      label: "Kan met kinderen om <6 jaar",
      value: "niet gekend",
    });
    expect(lines.find((l) => l.key === "zindelijk")?.value).toBe("ja");
  });

  it("geeft 10 'niet gekend'-regels voor een leeg dossier", () => {
    const lines = animalTraitLines(null);
    expect(lines).toHaveLength(10);
    expect(lines.every((l) => l.value === "niet gekend")).toBe(true);
  });

  it("negeert opgeslagen keys die niet in de lijst staan", () => {
    const lines = animalTraitLines({ zindelijk: "ja", onbekende_key: "ja" });
    expect(lines.map((l) => l.key)).not.toContain("onbekende_key");
    expect(lines).toHaveLength(10);
  });
});
