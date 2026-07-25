import { describe, it, expect } from "vitest";
import {
  sanitizeEmailHtml,
  inlineCidImages,
  plainTextToHtml,
  formatAddresses,
  buildEmailDocument,
} from "./eml-view";

describe("sanitizeEmailHtml", () => {
  it("verwijdert scripts volledig", () => {
    const out = sanitizeEmailHtml('<p>Hallo</p><script>alert("x")</script>');
    expect(out).toContain("Hallo");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).not.toContain("alert");
  });

  it("verwijdert inline event-handlers", () => {
    const out = sanitizeEmailHtml(`<img src="a.png" onerror="steal()">`);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("steal()");
    expect(out).toContain("a.png");
  });

  it("onschadelijk maken van javascript:-links", () => {
    const out = sanitizeEmailHtml(`<a href="javascript:alert(1)">klik</a>`);
    expect(out).not.toContain("javascript:");
    expect(out).toContain("klik");
  });

  it("verwijdert iframes, formulieren en objecten", () => {
    const out = sanitizeEmailHtml(
      `<iframe src="http://kwaad"></iframe><form action="x"><input></form><object data="y"></object>`,
    );
    expect(out.toLowerCase()).not.toContain("<iframe");
    expect(out.toLowerCase()).not.toContain("<form");
    expect(out.toLowerCase()).not.toContain("<object");
  });

  it("behoudt gewone opmaak en stijlen van de mail", () => {
    const out = sanitizeEmailHtml(
      `<div style="color:red"><b>Vet</b> en <a href="https://ninove.be">link</a></div>`,
    );
    expect(out).toContain("<b>Vet</b>");
    expect(out).toContain('style="color:red"');
    expect(out).toContain("https://ninove.be");
  });
});

describe("inlineCidImages", () => {
  const attachments = [
    { contentId: "<logo001@outlook>", mimeType: "image/png", contentBase64: "AAAA" },
  ];

  it("vervangt cid-verwijzingen door een data-URL, zodat ingesloten beelden tonen", () => {
    const out = inlineCidImages(`<img src="cid:logo001@outlook">`, attachments);
    expect(out).toContain("data:image/png;base64,AAAA");
    expect(out).not.toContain("cid:");
  });

  it("werkt ook met enkele aanhalingstekens", () => {
    const out = inlineCidImages(`<img src='cid:logo001@outlook'>`, attachments);
    expect(out).toContain("data:image/png;base64,AAAA");
  });

  it("laat onbekende cid-verwijzingen ongemoeid", () => {
    const out = inlineCidImages(`<img src="cid:onbekend@x">`, attachments);
    expect(out).toContain("cid:onbekend@x");
  });
});

describe("plainTextToHtml", () => {
  it("escapet HTML en behoudt regeleindes", () => {
    const out = plainTextToHtml("regel 1\nregel <2>");
    expect(out).toContain("regel 1<br>");
    expect(out).toContain("&lt;2&gt;");
    expect(out).not.toContain("<2>");
  });
});

describe("formatAddresses", () => {
  it("toont naam met adres", () => {
    expect(formatAddresses([{ name: "Dienst Dierenwelzijn", address: "info@ninove.be" }])).toBe(
      "Dienst Dierenwelzijn <info@ninove.be>",
    );
  });

  it("valt terug op enkel het adres zonder naam", () => {
    expect(formatAddresses([{ address: "info@ninove.be" }])).toBe("info@ninove.be");
  });

  it("voegt meerdere ontvangers samen", () => {
    expect(
      formatAddresses([{ address: "a@x.be" }, { name: "B", address: "b@x.be" }]),
    ).toBe("a@x.be, B <b@x.be>");
  });

  it("geeft een lege string bij geen ontvangers", () => {
    expect(formatAddresses(undefined)).toBe("");
    expect(formatAddresses([])).toBe("");
  });
});

describe("buildEmailDocument", () => {
  it("bouwt een volledig document met de gesaneerde HTML-body", () => {
    const doc = buildEmailDocument({ html: "<p>Beste,</p><script>x()</script>" });
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("<p>Beste,</p>");
    expect(doc.toLowerCase()).not.toContain("<script");
    // Links uit de mail openen buiten het ingesloten kader.
    expect(doc).toContain('<base target="_blank">');
  });

  it("valt terug op de platte tekst wanneer er geen HTML-versie is", () => {
    const doc = buildEmailDocument({ text: "Beste,\nGraag actie." });
    expect(doc).toContain("Beste,<br>");
  });

  it("toont een nette melding wanneer de mail geen leesbare inhoud heeft", () => {
    const doc = buildEmailDocument({});
    expect(doc).toMatch(/geen leesbare inhoud/i);
  });
});
