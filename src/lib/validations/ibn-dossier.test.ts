import { describe, it, expect } from "vitest";
import { parseIbnMailInput, IBN_MAIL_MAX_RECIPIENTS } from "./ibn-dossier";

// Story 10.72 — naar wie gaat het IBN-dossier?

describe("parseIbnMailInput", () => {
  it("aanvaardt één adres en maakt het klein", () => {
    expect(parseIbnMailInput({ recipients: "  Wijkagent@Politie.be ", message: "" })).toEqual({
      ok: true,
      to: ["wijkagent@politie.be"],
      message: "",
    });
  });

  it("splitst op komma, puntkomma en spaties en laat dubbels weg", () => {
    const r = parseIbnMailInput({
      recipients: "a@politie.be; dierenwelzijn@vlaanderen.be,  A@politie.be\nb@politie.be",
      message: "  Graag bevestiging.  ",
    });
    expect(r).toEqual({
      ok: true,
      to: ["a@politie.be", "dierenwelzijn@vlaanderen.be", "b@politie.be"],
      message: "Graag bevestiging.",
    });
  });

  it("weigert een leeg veld", () => {
    expect(parseIbnMailInput({ recipients: " ,; ", message: "" })).toEqual({
      ok: false,
      error: "Vul minstens één e-mailadres in.",
    });
  });

  it("zegt welk adres niet klopt", () => {
    expect(parseIbnMailInput({ recipients: "a@politie.be, politie-ninove", message: "" })).toEqual({
      ok: false,
      error: '"politie-ninove" is geen geldig e-mailadres.',
    });
  });

  it(`weigert meer dan ${IBN_MAIL_MAX_RECIPIENTS} adressen`, () => {
    const veel = Array.from({ length: IBN_MAIL_MAX_RECIPIENTS + 1 }, (_, i) => `p${i}@politie.be`).join(",");
    expect(parseIbnMailInput({ recipients: veel, message: "" })).toEqual({
      ok: false,
      error: `Hooguit ${IBN_MAIL_MAX_RECIPIENTS} e-mailadressen tegelijk.`,
    });
  });

  it("weigert een te lang bericht", () => {
    const r = parseIbnMailInput({ recipients: "a@politie.be", message: "x".repeat(2001) });
    expect(r).toEqual({ ok: false, error: "Het bericht is te lang (max. 2000 tekens)." });
  });
});
