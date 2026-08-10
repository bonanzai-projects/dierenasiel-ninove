import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequirePermission,
  mockGetSession,
  mockSendAccountLink,
  mockLogAudit,
  mockSelectLimit,
  mockInsertReturning,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockGetSession: vi.fn(),
  mockSendAccountLink: vi.fn(),
  mockLogAudit: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockInsertReturning: vi.fn(),
  mockUpdateWhere: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockSelectLimit })) })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: mockInsertReturning })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockUpdateWhere })) })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: { id: "users.id", email: "users.email" },
}));

vi.mock("@/lib/permissions", () => ({ requirePermission: mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/auth/account-links", () => ({ sendAccountLink: mockSendAccountLink }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createUser, sendUserInvite } from "./users";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const nieuw = { name: "Nathalie", email: "nathalie@asiel.be", role: "medewerker" };

beforeEach(() => {
  mockRequirePermission.mockReset().mockResolvedValue(undefined);
  mockGetSession.mockReset().mockResolvedValue({ userId: 1, name: "Sven", role: "beheerder" });
  mockSendAccountLink
    .mockReset()
    .mockResolvedValue({ url: "https://asiel.be/wachtwoord-instellen/abc", sent: true });
  mockLogAudit.mockReset().mockResolvedValue(undefined);
  mockSelectLimit.mockReset().mockResolvedValue([]);
  mockInsertReturning.mockReset().mockResolvedValue([{ id: 7 }]);
  mockUpdateWhere.mockReset().mockResolvedValue(undefined);
});

describe("createUser", () => {
  it("vraagt geen wachtwoord meer en stuurt een uitnodiging", async () => {
    const result = await createUser(null, form(nieuw));

    expect(result.success).toBe(true);
    expect(mockSendAccountLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, email: "nathalie@asiel.be" }),
      "invite",
      "Sven",
    );
  });

  it("bewaart het e-mailadres in kleine letters", async () => {
    await createUser(null, form({ ...nieuw, email: "Nathalie@Asiel.BE" }));

    expect(mockSendAccountLink).toHaveBeenCalledWith(
      expect.objectContaining({ email: "nathalie@asiel.be" }),
      "invite",
      "Sven",
    );
  });

  it("weigert een dubbel e-mailadres", async () => {
    mockSelectLimit.mockResolvedValue([{ id: 3 }]);

    const result = await createUser(null, form(nieuw));

    expect(result.success).toBe(false);
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("meldt dat de uitnodiging vertrokken is", async () => {
    const result = await createUser(null, form(nieuw));

    expect(result.success && result.message?.toLowerCase()).toContain("uitnodiging");
    expect(result.success && result.data?.sent).toBe(true);
  });

  it("maakt het account tóch aan wanneer de mail faalt, en geeft de link terug", async () => {
    mockSendAccountLink.mockResolvedValue({
      url: "https://asiel.be/wachtwoord-instellen/abc",
      sent: false,
      error: "Domain not verified",
    });

    const result = await createUser(null, form(nieuw));

    expect(result.success).toBe(true);
    expect(result.success && result.data?.sent).toBe(false);
    expect(result.success && result.data?.inviteUrl).toContain("/wachtwoord-instellen/");
    expect(mockInsertReturning).toHaveBeenCalled();
  });

  it("geeft de link niet mee wanneer de mail wél vertrok", async () => {
    const result = await createUser(null, form(nieuw));
    expect(result.success && result.data?.inviteUrl).toBeUndefined();
  });

  it("weigert wie geen gebruikers mag beheren", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await createUser(null, form(nieuw));

    expect(result.success).toBe(false);
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("weigert een lege naam", async () => {
    const result = await createUser(null, form({ ...nieuw, name: "" }));

    expect(result.success).toBe(false);
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("schrijft de aanmaak naar het logboek", async () => {
    await createUser(null, form(nieuw));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "user_created",
      "user",
      7,
      null,
      expect.objectContaining({ role: "medewerker" }),
    );
  });
});

describe("sendUserInvite", () => {
  beforeEach(() => {
    mockSelectLimit.mockResolvedValue([
      { id: 7, name: "Nathalie", email: "nathalie@asiel.be", isActive: true },
    ]);
  });

  it("verstuurt een nieuwe uitnodiging aan een bestaande gebruiker", async () => {
    const result = await sendUserInvite(null, form({ id: "7" }));

    expect(result.success).toBe(true);
    expect(mockSendAccountLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      "invite",
      "Sven",
    );
  });

  it("geeft de link terug wanneer de mail niet vertrekt", async () => {
    mockSendAccountLink.mockResolvedValue({ url: "https://asiel.be/x", sent: false, error: "boem" });

    const result = await sendUserInvite(null, form({ id: "7" }));

    expect(result.success).toBe(true);
    expect(result.success && result.data?.inviteUrl).toBe("https://asiel.be/x");
  });

  it("weigert een onbekende gebruiker", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await sendUserInvite(null, form({ id: "99" }));

    expect(result.success).toBe(false);
    expect(mockSendAccountLink).not.toHaveBeenCalled();
  });

  it("weigert een gedeactiveerd account", async () => {
    mockSelectLimit.mockResolvedValue([
      { id: 7, name: "Nathalie", email: "nathalie@asiel.be", isActive: false },
    ]);

    const result = await sendUserInvite(null, form({ id: "7" }));

    expect(result.success).toBe(false);
    expect(mockSendAccountLink).not.toHaveBeenCalled();
  });

  it("weigert wie geen gebruikers mag beheren", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await sendUserInvite(null, form({ id: "7" }));

    expect(result.success).toBe(false);
    expect(mockSendAccountLink).not.toHaveBeenCalled();
  });

  it("schrijft de uitnodiging naar het logboek", async () => {
    await sendUserInvite(null, form({ id: "7" }));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "user_invited",
      "user",
      7,
      null,
      expect.objectContaining({ sent: true }),
    );
  });
});
