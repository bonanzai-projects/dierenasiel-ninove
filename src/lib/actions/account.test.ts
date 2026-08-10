import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetSession,
  mockSendAccountLink,
  mockFindUserByToken,
  mockMarkTokenUsed,
  mockLogAudit,
  mockSelectLimit,
  mockUpdateWhere,
  mockHashPassword,
  mockVerifyPassword,
  mockCreateSession,
  mockSetSessionCookie,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSendAccountLink: vi.fn(),
  mockFindUserByToken: vi.fn(),
  mockMarkTokenUsed: vi.fn(),
  mockLogAudit: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockHashPassword: vi.fn(),
  mockVerifyPassword: vi.fn(),
  mockCreateSession: vi.fn(),
  mockSetSessionCookie: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockSelectLimit })) })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockUpdateWhere })) })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: { id: "users.id", email: "users.email" },
  userTokens: { id: "userTokens.id" },
}));

vi.mock("@/lib/auth/account-links", () => ({
  sendAccountLink: mockSendAccountLink,
  findUserByToken: mockFindUserByToken,
  markTokenUsed: mockMarkTokenUsed,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mockGetSession,
  createSession: mockCreateSession,
  setSessionCookie: mockSetSessionCookie,
}));

vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));

import { changeOwnPassword, requestPasswordReset, setPasswordWithToken } from "./account";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const gebruiker = {
  id: 7,
  name: "Nathalie",
  email: "nathalie@asiel.be",
  role: "medewerker",
  isActive: true,
};

beforeEach(() => {
  mockGetSession.mockReset().mockResolvedValue(null);
  mockSendAccountLink.mockReset().mockResolvedValue({ url: "https://asiel.be/x", sent: true });
  mockFindUserByToken.mockReset();
  mockMarkTokenUsed.mockReset().mockResolvedValue(undefined);
  mockLogAudit.mockReset().mockResolvedValue(undefined);
  mockSelectLimit.mockReset().mockResolvedValue([]);
  mockUpdateWhere.mockReset().mockResolvedValue(undefined);
  mockHashPassword.mockReset().mockResolvedValue("gehasht");
  mockVerifyPassword.mockReset().mockResolvedValue(true);
  mockCreateSession.mockReset().mockResolvedValue("jwt");
  mockSetSessionCookie.mockReset().mockResolvedValue(undefined);
});

describe("requestPasswordReset", () => {
  it("verstuurt een herstellink aan een gekende, actieve gebruiker", async () => {
    mockSelectLimit.mockResolvedValue([gebruiker]);

    const result = await requestPasswordReset(null, form({ email: "nathalie@asiel.be" }));

    expect(result.success).toBe(true);
    expect(mockSendAccountLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      "reset",
    );
  });

  it("geeft exact hetzelfde antwoord voor een onbekend adres", async () => {
    mockSelectLimit.mockResolvedValue([gebruiker]);
    const gekend = await requestPasswordReset(null, form({ email: "nathalie@asiel.be" }));

    mockSelectLimit.mockResolvedValue([]);
    const onbekend = await requestPasswordReset(null, form({ email: "niemand@asiel.be" }));

    expect(onbekend).toEqual(gekend);
    expect(mockSendAccountLink).toHaveBeenCalledTimes(1);
  });

  it("verstuurt niets aan een gedeactiveerd account, maar verklapt dat niet", async () => {
    mockSelectLimit.mockResolvedValue([{ ...gebruiker, isActive: false }]);

    const result = await requestPasswordReset(null, form({ email: "nathalie@asiel.be" }));

    expect(result.success).toBe(true);
    expect(mockSendAccountLink).not.toHaveBeenCalled();
  });

  it("verklapt niets wanneer de mail zelf faalt", async () => {
    mockSelectLimit.mockResolvedValue([gebruiker]);
    mockSendAccountLink.mockResolvedValue({ url: "https://asiel.be/x", sent: false, error: "Domain not verified" });

    const result = await requestPasswordReset(null, form({ email: "nathalie@asiel.be" }));

    expect(result.success).toBe(true);
    expect(JSON.stringify(result)).not.toContain("Domain not verified");
    expect(JSON.stringify(result)).not.toContain("asiel.be/x");
  });

  it("wijst een ongeldig e-mailadres af", async () => {
    const result = await requestPasswordReset(null, form({ email: "geen-adres" }));

    expect(result.success).toBe(false);
    expect(mockSendAccountLink).not.toHaveBeenCalled();
  });
});

describe("setPasswordWithToken", () => {
  const geldig = { token: "abc", password: "geheim123", confirm: "geheim123" };

  it("stelt het wachtwoord in, verbrandt de link en logt de gebruiker meteen in", async () => {
    mockFindUserByToken.mockResolvedValue({ ok: true, tokenId: 3, user: gebruiker });

    const result = await setPasswordWithToken(null, form(geldig));

    expect(result.success).toBe(true);
    expect(mockHashPassword).toHaveBeenCalledWith("geheim123");
    expect(mockUpdateWhere).toHaveBeenCalled();
    expect(mockMarkTokenUsed).toHaveBeenCalledWith(3);
    expect(mockSetSessionCookie).toHaveBeenCalledWith("jwt");
  });

  it("geeft de rol terug zodat het scherm weet waar naartoe", async () => {
    mockFindUserByToken.mockResolvedValue({ ok: true, tokenId: 3, user: gebruiker });

    const result = await setPasswordWithToken(null, form(geldig));

    expect(result.success && result.data).toEqual({ role: "medewerker" });
  });

  it("schrijft de gebeurtenis naar het logboek", async () => {
    mockFindUserByToken.mockResolvedValue({ ok: true, tokenId: 3, user: gebruiker });

    await setPasswordWithToken(null, form(geldig));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "password_set",
      "user",
      7,
      null,
      expect.anything(),
    );
  });

  it("weigert een vervallen link met een leesbare uitleg", async () => {
    mockFindUserByToken.mockResolvedValue({ ok: false, reason: "vervallen" });

    const result = await setPasswordWithToken(null, form(geldig));

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain("niet meer geldig");
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it("weigert twee verschillende wachtwoorden", async () => {
    mockFindUserByToken.mockResolvedValue({ ok: true, tokenId: 3, user: gebruiker });

    const result = await setPasswordWithToken(
      null,
      form({ token: "abc", password: "geheim123", confirm: "anders123" }),
    );

    expect(result.success).toBe(false);
    expect(result.success === false && result.fieldErrors?.confirm?.[0]).toContain("niet gelijk");
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it("weigert een te kort wachtwoord zonder de link te verbranden", async () => {
    mockFindUserByToken.mockResolvedValue({ ok: true, tokenId: 3, user: gebruiker });

    const result = await setPasswordWithToken(null, form({ token: "abc", password: "kort", confirm: "kort" }));

    expect(result.success).toBe(false);
    expect(mockMarkTokenUsed).not.toHaveBeenCalled();
  });
});

describe("changeOwnPassword", () => {
  const geldig = { currentPassword: "oud12345", password: "nieuw12345", confirm: "nieuw12345" };

  it("weigert wie niet ingelogd is", async () => {
    const result = await changeOwnPassword(null, form(geldig));

    expect(result.success).toBe(false);
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it("wijzigt het wachtwoord van de ingelogde gebruiker", async () => {
    mockGetSession.mockResolvedValue({ userId: 7, role: "medewerker", email: "n@a.be", name: "N" });
    mockSelectLimit.mockResolvedValue([{ id: 7, passwordHash: "oude-hash" }]);

    const result = await changeOwnPassword(null, form(geldig));

    expect(result.success).toBe(true);
    expect(mockVerifyPassword).toHaveBeenCalledWith("oud12345", "oude-hash");
    expect(mockHashPassword).toHaveBeenCalledWith("nieuw12345");
    expect(mockUpdateWhere).toHaveBeenCalled();
  });

  it("weigert een verkeerd huidig wachtwoord", async () => {
    mockGetSession.mockResolvedValue({ userId: 7, role: "medewerker", email: "n@a.be", name: "N" });
    mockSelectLimit.mockResolvedValue([{ id: 7, passwordHash: "oude-hash" }]);
    mockVerifyPassword.mockResolvedValue(false);

    const result = await changeOwnPassword(null, form(geldig));

    expect(result.success).toBe(false);
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it("weigert hetzelfde wachtwoord opnieuw", async () => {
    mockGetSession.mockResolvedValue({ userId: 7, role: "medewerker", email: "n@a.be", name: "N" });
    mockSelectLimit.mockResolvedValue([{ id: 7, passwordHash: "oude-hash" }]);

    const result = await changeOwnPassword(
      null,
      form({ currentPassword: "zelfde123", password: "zelfde123", confirm: "zelfde123" }),
    );

    expect(result.success).toBe(false);
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it("schrijft de wijziging naar het logboek", async () => {
    mockGetSession.mockResolvedValue({ userId: 7, role: "medewerker", email: "n@a.be", name: "N" });
    mockSelectLimit.mockResolvedValue([{ id: 7, passwordHash: "oude-hash" }]);

    await changeOwnPassword(null, form(geldig));

    expect(mockLogAudit).toHaveBeenCalledWith("password_changed", "user", 7, null, expect.anything());
  });
});
