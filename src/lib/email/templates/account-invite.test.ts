import { describe, it, expect } from "vitest";
import { accountInviteEmail } from "./account-invite";

const basis = {
  name: "Nathalie",
  url: "https://asiel.be/wachtwoord-instellen/abc123",
};

describe("accountInviteEmail", () => {
  it("spreekt de ontvanger aan met zijn naam", () => {
    const mail = accountInviteEmail(basis);
    expect(mail.html).toContain("Nathalie");
    expect(mail.text).toContain("Nathalie");
  });

  it("zet de link zowel in de knop als in de tekstversie", () => {
    const mail = accountInviteEmail(basis);
    expect(mail.html).toContain(`href="${basis.url}"`);
    expect(mail.text).toContain(basis.url);
  });

  it("heeft een onderwerp dat zegt waarover het gaat", () => {
    expect(accountInviteEmail(basis).subject.toLowerCase()).toContain("dierenasiel ninove");
  });

  it("vermeldt hoe lang de link geldig is", () => {
    expect(accountInviteEmail(basis).html).toContain("7 dagen");
  });

  it("noemt wie de uitnodiging stuurde wanneer dat gekend is", () => {
    const mail = accountInviteEmail({ ...basis, invitedBy: "Sven" });
    expect(mail.html).toContain("Sven");
    expect(mail.text).toContain("Sven");
  });

  it("blijft leesbaar zonder die naam", () => {
    const mail = accountInviteEmail(basis);
    expect(mail.html).not.toContain("undefined");
    expect(mail.text).not.toContain("undefined");
  });

  it("bevat nooit een wachtwoord", () => {
    const mail = accountInviteEmail({ ...basis, name: "Nathalie" });
    expect(mail.html.toLowerCase()).not.toMatch(/wachtwoord is|jouw wachtwoord:|paswoord:/);
  });

  it("ontsnapt de naam zodat opgegeven HTML niet meegerenderd wordt", () => {
    const mail = accountInviteEmail({ ...basis, name: '<script>alert("x")</script>' });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("ontsnapt de link zodat een aanhalingsteken niet uit het href-attribuut breekt", () => {
    const mail = accountInviteEmail({ ...basis, url: 'https://asiel.be/x"onmouseover="evil()' });
    expect(mail.html).not.toContain('"onmouseover="');
    expect(mail.html).toContain("&quot;");
  });

  it("is een volledig HTML-document", () => {
    expect(accountInviteEmail(basis).html).toMatch(/^<!DOCTYPE html>/i);
  });
});
