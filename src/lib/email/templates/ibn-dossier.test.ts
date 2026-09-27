import { describe, it, expect } from "vitest";
import { ibnDossierEmail } from "./ibn-dossier";

// Story 10.72 — de begeleidende mail bij het IBN-dossier voor politie of Dierenwelzijn.

const basis = {
  animalName: "Bo",
  speciesLabel: "Hond",
  dossierNr: "2602093",
  pvNr: "PV-2026-001",
  message: "",
  senderName: "Sven De Smet",
};

describe("ibnDossierEmail", () => {
  it("noemt dier, dossier en PV in het onderwerp", () => {
    expect(ibnDossierEmail(basis).subject).toBe("IBN-dossier Bo — dossier 2602093, PV PV-2026-001");
  });

  it("laat ontbrekende nummers weg uit het onderwerp", () => {
    expect(ibnDossierEmail({ ...basis, pvNr: null }).subject).toBe("IBN-dossier Bo — dossier 2602093");
    expect(ibnDossierEmail({ ...basis, pvNr: null, dossierNr: null }).subject).toBe("IBN-dossier Bo");
  });

  it("zegt dat het dossier in bijlage zit en wie het verstuurt", () => {
    const m = ibnDossierEmail(basis);
    for (const tekst of [m.html, m.text]) {
      expect(tekst).toContain("In bijlage vindt u het IBN-dossier van Bo (Hond)");
      expect(tekst).toContain("Sven De Smet");
      expect(tekst).toContain("Dierenasiel Ninove");
    }
  });

  it("neemt een eigen bericht op, veilig voor HTML", () => {
    const m = ibnDossierEmail({ ...basis, message: "Zie foto's <b>bijlage</b>\nGraag bevestiging." });
    expect(m.html).toContain("Zie foto&#39;s &lt;b&gt;bijlage&lt;/b&gt;");
    expect(m.html).not.toContain("<b>bijlage</b>");
    expect(m.text).toContain("Zie foto's <b>bijlage</b>\nGraag bevestiging.");
  });
});
