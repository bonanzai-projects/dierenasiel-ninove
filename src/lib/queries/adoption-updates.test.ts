import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { groupAdoptionUpdates } from "./adoption-updates";

// Story 10.74 — de berichten van een dier met hun bestanden, zoals de fiche ze toont.

const bericht = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  receivedOn: "2026-09-20",
  channel: "whatsapp",
  sender: "Sarah",
  message: "Bo stelt het goed",
  createdByName: "Sven",
  createdAt: new Date("2026-09-21T08:00:00Z"),
  ...extra,
});

const bestand = (id: number, updateId: number, fileName: string, mimeType: string) => ({
  id,
  updateId,
  fileName,
  mimeType,
  fileSize: 1234,
  pathname: `adoptie-berichten/315/${updateId}/${fileName}`,
});

describe("groupAdoptionUpdates", () => {
  it("hangt elk bestand aan zijn bericht en bepaalt de soort", () => {
    const r = groupAdoptionUpdates(
      [bericht(2), bericht(1)],
      [bestand(10, 2, "bo.jpg", "image/jpeg"), bestand(11, 2, "mail.eml", "message/rfc822"), bestand(12, 1, "dierenarts.pdf", "application/pdf")],
    );
    expect(r.map((b) => b.id)).toEqual([2, 1]);
    expect(r[0].files).toEqual([
      { id: 10, fileName: "bo.jpg", mimeType: "image/jpeg", fileSize: 1234, kind: "foto" },
      { id: 11, fileName: "mail.eml", mimeType: "message/rfc822", fileSize: 1234, kind: "mail" },
    ]);
    expect(r[1].files.map((f) => f.kind)).toEqual(["pdf"]);
  });

  it("stuurt nooit de plaats in de opslag mee naar het scherm", () => {
    const r = groupAdoptionUpdates([bericht(1)], [bestand(10, 1, "bo.jpg", "image/jpeg")]);
    expect(JSON.stringify(r)).not.toContain("adoptie-berichten/");
  });

  it("zet het tijdstip om naar tekst (veilig om naar de browser te sturen)", () => {
    const r = groupAdoptionUpdates([bericht(1)], []);
    expect(r[0].createdAt).toBe("2026-09-21T08:00:00.000Z");
    expect(r[0].files).toEqual([]);
  });
});
