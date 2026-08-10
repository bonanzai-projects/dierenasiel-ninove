import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockInsertValues,
  mockUpdateWhere,
  mockSelectLimit,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockInsertValues: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: mockInsertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockUpdateWhere })) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockSelectLimit })) })),
    })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: { id: "users.id" },
  userTokens: {
    id: "userTokens.id",
    userId: "userTokens.userId",
    purpose: "userTokens.purpose",
    usedAt: "userTokens.usedAt",
    tokenHash: "userTokens.tokenHash",
  },
}));

vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));

import { findUserByToken, issueAccountToken, markTokenUsed, sendAccountLink } from "./account-links";
import { hashToken } from "./tokens";

const gebruiker = { id: 7, name: "Nathalie", email: "nathalie@asiel.be" };

beforeEach(() => {
  mockInsertValues.mockReset().mockResolvedValue(undefined);
  mockUpdateWhere.mockReset().mockResolvedValue(undefined);
  mockSelectLimit.mockReset().mockResolvedValue([]);
  mockSendEmail.mockReset().mockResolvedValue({ success: true, id: "msg_1" });
  process.env.NEXT_PUBLIC_SITE_URL = "https://asiel.be";
});

describe("issueAccountToken", () => {
  it("bewaart enkel de hash, nooit de token zelf", async () => {
    const raw = await issueAccountToken(gebruiker.id, "invite");

    const bewaard = mockInsertValues.mock.calls[0][0];
    expect(bewaard.tokenHash).toBe(hashToken(raw));
    expect(JSON.stringify(bewaard)).not.toContain(raw);
  });

  it("bewaart het doel en een vervaldatum in de toekomst", async () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    await issueAccountToken(gebruiker.id, "reset", now);

    const bewaard = mockInsertValues.mock.calls[0][0];
    expect(bewaard.purpose).toBe("reset");
    expect(bewaard.userId).toBe(gebruiker.id);
    expect(bewaard.expiresAt.toISOString()).toBe("2026-08-10T13:00:00.000Z");
  });

  it("trekt oudere openstaande links van hetzelfde soort in", async () => {
    await issueAccountToken(gebruiker.id, "invite");

    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("geeft elke keer een andere token", async () => {
    const eerste = await issueAccountToken(gebruiker.id, "invite");
    const tweede = await issueAccountToken(gebruiker.id, "invite");
    expect(eerste).not.toBe(tweede);
  });
});

describe("sendAccountLink", () => {
  it("verstuurt een uitnodiging en geeft de link terug", async () => {
    const result = await sendAccountLink(gebruiker, "invite");

    expect(result.sent).toBe(true);
    expect(result.url).toMatch(/^https:\/\/asiel\.be\/wachtwoord-instellen\/[0-9a-f]{64}$/);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: gebruiker.email, subject: expect.stringContaining("account") }),
    );
  });

  it("zet de link in de mail", async () => {
    const result = await sendAccountLink(gebruiker, "invite");
    const mail = mockSendEmail.mock.calls[0][0];
    expect(mail.html).toContain(result.url);
    expect(mail.text).toContain(result.url);
  });

  it("gebruikt de herstelmail bij een reset", async () => {
    await sendAccountLink(gebruiker, "reset");
    expect(mockSendEmail.mock.calls[0][0].subject.toLowerCase()).toContain("nieuw wachtwoord");
  });

  it("noemt wie uitnodigde", async () => {
    await sendAccountLink(gebruiker, "invite", "Sven");
    expect(mockSendEmail.mock.calls[0][0].html).toContain("Sven");
  });

  it("geeft de link ook terug wanneer de mail niet vertrekt", async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: "Domain not verified" });

    const result = await sendAccountLink(gebruiker, "invite");

    expect(result.sent).toBe(false);
    expect(result.error).toContain("Domain not verified");
    expect(result.url).toContain("/wachtwoord-instellen/");
  });

  it("maakt de link ook aan als de mail faalt, zodat hij doorgegeven kan worden", async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: "x" });
    await sendAccountLink(gebruiker, "invite");
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });
});

describe("findUserByToken", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("zoekt op de hash van de token, niet op de token zelf", async () => {
    await findUserByToken("mijn-token", now);
    // eerste select = de tokenrij; we controleren dat er niets met de rauwe token gebeurt
    expect(mockSelectLimit).toHaveBeenCalled();
  });

  it("weigert een onbekende token", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await findUserByToken("onbekend", now);
    expect(result).toEqual({ ok: false, reason: "onbekend" });
  });

  it("weigert een vervallen token", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      { id: 1, userId: 7, purpose: "reset", expiresAt: new Date("2026-08-10T11:00:00.000Z"), usedAt: null },
    ]);
    const result = await findUserByToken("oud", now);
    expect(result).toEqual({ ok: false, reason: "vervallen" });
  });

  it("weigert een al gebruikte token", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: 1,
        userId: 7,
        purpose: "invite",
        expiresAt: new Date("2026-08-12T12:00:00.000Z"),
        usedAt: new Date("2026-08-10T11:00:00.000Z"),
      },
    ]);
    expect(await findUserByToken("gebruikt", now)).toEqual({ ok: false, reason: "gebruikt" });
  });

  it("weigert een geldige token van een gedeactiveerde gebruiker", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([
        { id: 1, userId: 7, purpose: "invite", expiresAt: new Date("2026-08-12T12:00:00.000Z"), usedAt: null },
      ])
      .mockResolvedValueOnce([{ ...gebruiker, isActive: false }]);

    expect(await findUserByToken("geldig", now)).toEqual({ ok: false, reason: "onbekend" });
  });

  it("geeft gebruiker en tokenrij terug bij een geldige token", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([
        { id: 1, userId: 7, purpose: "invite", expiresAt: new Date("2026-08-12T12:00:00.000Z"), usedAt: null },
      ])
      .mockResolvedValueOnce([{ ...gebruiker, role: "medewerker", isActive: true }]);

    const result = await findUserByToken("geldig", now);

    expect(result).toEqual({
      ok: true,
      tokenId: 1,
      user: {
        id: 7,
        name: "Nathalie",
        email: "nathalie@asiel.be",
        role: "medewerker",
        isActive: true,
      },
    });
  });
});

describe("markTokenUsed", () => {
  it("zet het tijdstip van gebruik", async () => {
    await markTokenUsed(1);
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });
});
