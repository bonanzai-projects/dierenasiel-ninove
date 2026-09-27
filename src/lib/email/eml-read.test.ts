import { describe, it, expect } from "vitest";
import { readEmlView, readEmlAttachment } from "./eml-read";

// Story 10.74 — de .eml-verwerking van 10.41 (zwerfkatten), gedeeld met de berichten na adoptie.

const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const EML = [
  "From: Sarah Peeters <sarah@example.com>",
  "To: Dierenasiel Ninove <info@dierenasielninove.be>",
  "Subject: Nieuws van Bo",
  "Date: Tue, 22 Sep 2026 10:00:00 +0200",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="GRENS"',
  "",
  "--GRENS",
  "Content-Type: text/html; charset=utf-8",
  "",
  '<p>Bo stelt het <b>goed</b>!</p><script>alert(1)</script>',
  "--GRENS",
  'Content-Type: image/png; name="bo.png"',
  'Content-Disposition: attachment; filename="bo.png"',
  "Content-Transfer-Encoding: base64",
  "",
  PNG_1PX,
  "--GRENS--",
  "",
].join("\r\n");

const raw = () => new TextEncoder().encode(EML).buffer as ArrayBuffer;

describe("readEmlView", () => {
  it("geeft kopgegevens, een veilig document en de lijst bijlagen", async () => {
    const v = await readEmlView(raw());
    expect(v.subject).toBe("Nieuws van Bo");
    expect(v.from).toContain("sarah@example.com");
    expect(v.to).toContain("info@dierenasielninove.be");
    expect(v.date).toBeTruthy();
    expect(v.document).toContain("Bo stelt het");
    expect(v.document).not.toContain("<script>");
    expect(v.attachments).toEqual([{ index: 0, filename: "bo.png", mimeType: "image/png", size: expect.any(Number) }]);
  });
});

describe("readEmlAttachment", () => {
  it("geeft de inhoud van een bijlage, foto's inline", async () => {
    const b = await readEmlAttachment(raw(), 0);
    expect(b).not.toBeNull();
    expect(b!.mimeType).toBe("image/png");
    expect(b!.filename).toBe("bo.png");
    expect(b!.disposition).toBe("inline");
    expect(b!.bytes.subarray(1, 4).toString()).toBe("PNG");
  });

  it("geeft null voor een bijlage die niet bestaat", async () => {
    expect(await readEmlAttachment(raw(), 5)).toBeNull();
  });
});
