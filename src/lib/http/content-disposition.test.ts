import { describe, it, expect } from "vitest";
import { contentDisposition } from "./content-disposition";

// Story 10.75 — sinds 10.74 in adoptie; nu gedeeld zodat ook de zwerfkat-route niet meer 502 geeft.

describe("contentDisposition", () => {
  it("laat een gewone ASCII-naam ongemoeid", () => {
    expect(contentDisposition("inline", "bo.jpg")).toBe(`inline; filename="bo.jpg"; filename*=UTF-8''bo.jpg`);
  });

  it("kent inline en attachment", () => {
    expect(contentDisposition("attachment", "plan.pdf")).toBe(
      `attachment; filename="plan.pdf"; filename*=UTF-8''plan.pdf`,
    );
  });

  it("vervangt tekens buiten ASCII in filename en geeft de echte naam in filename*", () => {
    expect(contentDisposition("inline", "Bo’s eerste week.jpg")).toBe(
      `inline; filename="Bo_s eerste week.jpg"; filename*=UTF-8''Bo%E2%80%99s%20eerste%20week.jpg`,
    );
    expect(contentDisposition("inline", "Café.jpg")).toBe(`inline; filename="Caf_.jpg"; filename*=UTF-8''Caf%C3%A9.jpg`);
  });

  it("vervangt een emoji (twee UTF-16-eenheden) door underscores", () => {
    expect(contentDisposition("attachment", "kat 🐱.png")).toBe(
      `attachment; filename="kat __.png"; filename*=UTF-8''kat%20%F0%9F%90%B1.png`,
    );
  });

  it("laat geen aanhalingsteken of backslash door in filename", () => {
    expect(contentDisposition("inline", `Café "Bo"\\1.jpg`)).toBe(
      `inline; filename="Caf_ _Bo__1.jpg"; filename*=UTF-8''Caf%C3%A9%20%22Bo%22%5C1.jpg`,
    );
  });

  it("codeert ook ' ( ) * in filename* (RFC 5987)", () => {
    expect(contentDisposition("inline", "Bo's (1)*.jpg")).toBe(
      `inline; filename="Bo's (1)*.jpg"; filename*=UTF-8''Bo%27s%20%281%29%2A.jpg`,
    );
  });

  it("geeft altijd een waarde die in een Headers-object past", () => {
    for (const naam of ["Bo’s eerste week.jpg", "kat 🐱.png", "Ζώο.pdf", "tab\tnaam.txt", "regel\neinde.txt"]) {
      expect(() => new Headers({ "Content-Disposition": contentDisposition("inline", naam) })).not.toThrow();
    }
  });
});
