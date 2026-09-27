import { describe, it, expect } from "vitest";
import {
  ADOPTION_UPDATE_CHANNELS,
  adoptionChannelLabel,
  adoptionFilePathname,
  classifyAdoptionFile,
  fileKindFromMime,
  shouldShowAdoptionUpdates,
} from "./rules";

// Story 10.74 — berichten en foto's na adoptie (Sven).

describe("kanalen", () => {
  it("kent WhatsApp, mail, telefoon, bezoek en andere", () => {
    expect(ADOPTION_UPDATE_CHANNELS.map((k) => k.value)).toEqual(["whatsapp", "mail", "telefoon", "bezoek", "andere"]);
    expect(adoptionChannelLabel("whatsapp")).toBe("WhatsApp");
    expect(adoptionChannelLabel("onbekend")).toBe("onbekend");
  });
});

describe("classifyAdoptionFile", () => {
  it("herkent foto's, mails en PDF's op de extensie en bepaalt zelf het type", () => {
    expect(classifyAdoptionFile("bo.JPG")).toEqual({ kind: "foto", mimeType: "image/jpeg" });
    expect(classifyAdoptionFile("bo.jpeg")).toEqual({ kind: "foto", mimeType: "image/jpeg" });
    expect(classifyAdoptionFile("bo.png")).toEqual({ kind: "foto", mimeType: "image/png" });
    expect(classifyAdoptionFile("bo.webp")).toEqual({ kind: "foto", mimeType: "image/webp" });
    // Outlook stuurt .eml soms als application/octet-stream — de extensie is leidend (zoals 10.41).
    expect(classifyAdoptionFile("Nieuws van Bo.eml")).toEqual({ kind: "mail", mimeType: "message/rfc822" });
    expect(classifyAdoptionFile("dierenarts.pdf")).toEqual({ kind: "pdf", mimeType: "application/pdf" });
  });

  it("weigert andere types, ook als de browser beweert dat het een foto is", () => {
    expect(classifyAdoptionFile("bo.heic")).toBeNull();
    expect(classifyAdoptionFile("script.html")).toBeNull();
    expect(classifyAdoptionFile("film.mp4")).toBeNull();
    expect(classifyAdoptionFile("zonder-extensie")).toBeNull();
  });
});

describe("fileKindFromMime", () => {
  it("vertaalt het bewaarde type naar wat de lijst toont", () => {
    expect(fileKindFromMime("image/jpeg")).toBe("foto");
    expect(fileKindFromMime("message/rfc822")).toBe("mail");
    expect(fileKindFromMime("application/pdf")).toBe("pdf");
  });
});

describe("adoptionFilePathname", () => {
  it("zet het bestand onder dier en bericht, met een veilige naam", () => {
    expect(adoptionFilePathname(315, 12, "Foto van Bo (1).jpg")).toBe("adoptie-berichten/315/12/Foto_van_Bo_1.jpg");
    expect(adoptionFilePathname(315, 12, "../../geheim.eml")).toBe("adoptie-berichten/315/12/geheim.eml");
    expect(adoptionFilePathname(315, 12, "Café.png")).toBe("adoptie-berichten/315/12/Cafe.png");
  });
});

describe("shouldShowAdoptionUpdates", () => {
  const binnen = { adoptedDate: null, outtakeReason: null, status: "beschikbaar" };

  it("toont de sectie zodra het dier geadopteerd is", () => {
    expect(shouldShowAdoptionUpdates({ ...binnen, adoptedDate: "2026-09-01" }, 0)).toBe(true);
    expect(shouldShowAdoptionUpdates({ ...binnen, outtakeReason: "adoptie" }, 0)).toBe(true);
    expect(shouldShowAdoptionUpdates({ ...binnen, status: "geadopteerd" }, 0)).toBe(true);
  });

  it("toont ze ook als er al berichten zijn, en anders niet", () => {
    expect(shouldShowAdoptionUpdates(binnen, 2)).toBe(true);
    expect(shouldShowAdoptionUpdates(binnen, 0)).toBe(false);
  });
});
