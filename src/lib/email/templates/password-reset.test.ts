import { describe, it, expect } from "vitest";
import { passwordResetEmail } from "./password-reset";

const basis = {
  name: "Nathalie",
  url: "https://asiel.be/wachtwoord-instellen/abc123",
};

describe("passwordResetEmail", () => {
  it("spreekt de ontvanger aan met zijn naam", () => {
    const mail = passwordResetEmail(basis);
    expect(mail.html).toContain("Nathalie");
    expect(mail.text).toContain("Nathalie");
  });

  it("zet de link in de knop en in de tekstversie", () => {
    const mail = passwordResetEmail(basis);
    expect(mail.html).toContain(`href="${basis.url}"`);
    expect(mail.text).toContain(basis.url);
  });

  it("vermeldt dat de link een uur geldig is", () => {
    const mail = passwordResetEmail(basis);
    expect(mail.html).toContain("1 uur");
    expect(mail.text).toContain("1 uur");
  });

  it("stelt gerust wie de mail niet zelf aanvroeg", () => {
    const mail = passwordResetEmail(basis);
    expect(mail.html.toLowerCase()).toContain("negeren");
    expect(mail.text.toLowerCase()).toContain("negeren");
  });

  it("bevat nooit een wachtwoord", () => {
    expect(passwordResetEmail(basis).html.toLowerCase()).not.toMatch(/wachtwoord is|jouw wachtwoord:/);
  });

  it("ontsnapt naam en link", () => {
    const mail = passwordResetEmail({ name: "<b>x</b>", url: 'https://a.be/"evil' });
    expect(mail.html).not.toContain("<b>x</b>");
    expect(mail.html).toContain("&quot;evil");
  });

  it("is een volledig HTML-document", () => {
    expect(passwordResetEmail(basis).html).toMatch(/^<!DOCTYPE html>/i);
  });
});
