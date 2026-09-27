import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRequirePermission, mockGetSession, mockBuild, mockSendEmail, mockLogAudit, mockRevalidate } = vi.hoisted(
  () => ({
    mockRequirePermission: vi.fn(),
    mockGetSession: vi.fn(),
    mockBuild: vi.fn(),
    mockSendEmail: vi.fn(),
    mockLogAudit: vi.fn(),
    mockRevalidate: vi.fn(),
  }),
);

vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/animals/ibn-dossier-document", () => ({ buildIbnDossierDocument: mockBuild }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));

import { emailIbnDossier } from "./ibn-dossier";

// Story 10.72 — het IBN-dossier mailen naar politie of Dierenwelzijn.

const dossier = {
  filename: "ibn-dossier-2602093-Bo.pdf",
  content: Buffer.from("%PDF-1.4"),
  animalName: "Bo",
  speciesLabel: "Hond",
  dossierNr: "2602093",
  pvNr: "PV-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mockRequirePermission.mockResolvedValue(undefined);
  mockGetSession.mockResolvedValue({ userId: 3, email: "sven@dierenasielninove.be", name: "Sven", role: "beheerder" });
  mockBuild.mockResolvedValue(dossier);
  mockSendEmail.mockResolvedValue({ success: true, id: "re_123" });
});

describe("emailIbnDossier", () => {
  it("mailt het dossier als bijlage; antwoorden gaan naar wie verstuurt", async () => {
    const r = await emailIbnDossier(315, {
      recipients: "wijk@politie.be; dierenwelzijn@vlaanderen.be",
      message: "Graag bevestiging.",
    });

    expect(mockRequirePermission).toHaveBeenCalledWith("animal:write");
    expect(mockBuild).toHaveBeenCalledWith(315);
    const mail = mockSendEmail.mock.calls[0][0];
    expect(mail.to).toEqual(["wijk@politie.be", "dierenwelzijn@vlaanderen.be"]);
    expect(mail.replyTo).toBe("sven@dierenasielninove.be");
    expect(mail.subject).toBe("IBN-dossier Bo — dossier 2602093, PV PV-1");
    expect(mail.html).toContain("Graag bevestiging.");
    expect(mail.html).toContain("Sven");
    expect(mail.attachments).toEqual([{ filename: dossier.filename, content: dossier.content }]);

    expect(mockLogAudit).toHaveBeenCalledWith("animal.ibn_dossier_emailed", "animal", 315, null, {
      to: ["wijk@politie.be", "dierenwelzijn@vlaanderen.be"],
      filename: dossier.filename,
      resendId: "re_123",
    });
    expect(mockRevalidate).toHaveBeenCalledWith("/beheerder/dieren/315");
    expect(r).toEqual({
      success: true,
      data: undefined,
      message: "Het IBN-dossier is gemaild naar wijk@politie.be, dierenwelzijn@vlaanderen.be.",
    });
  });

  it("verstuurt niets bij een ongeldig adres", async () => {
    const r = await emailIbnDossier(315, { recipients: "politie-ninove", message: "" });
    expect(r).toEqual({ success: false, error: '"politie-ninove" is geen geldig e-mailadres.' });
    expect(mockBuild).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("weigert zonder schrijfrechten", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    const r = await emailIbnDossier(315, { recipients: "wijk@politie.be", message: "" });
    expect(r).toEqual({ success: false, error: "Onvoldoende rechten" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("meldt het als het dier geen IBN-dossier heeft", async () => {
    mockBuild.mockResolvedValue(null);
    const r = await emailIbnDossier(315, { recipients: "wijk@politie.be", message: "" });
    expect(r).toEqual({ success: false, error: "Dit dier heeft geen IBN-dossier." });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("meldt het als het dossier niet opgebouwd kan worden", async () => {
    mockBuild.mockRejectedValue(new Error("render kapot"));
    const r = await emailIbnDossier(315, { recipients: "wijk@politie.be", message: "" });
    expect(r).toEqual({ success: false, error: "Het IBN-dossier kon niet opgebouwd worden. Probeer later opnieuw." });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("toont geen ruwe Resend-fout en logt niets als versturen mislukt", async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: "550 wijk@politie.be bestaat niet" });
    const r = await emailIbnDossier(315, { recipients: "wijk@politie.be", message: "" });
    expect(r).toEqual({
      success: false,
      error: "De mail kon niet verstuurd worden. Probeer later opnieuw of download het dossier en mail het zelf.",
    });
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});
