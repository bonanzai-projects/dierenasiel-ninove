import { describe, it, expect } from "vitest";
import {
  TOKEN_TTL_SECONDS,
  buildTokenUrl,
  checkToken,
  expiresAtFor,
  generateToken,
  hashToken,
  reasonMessage,
  resolveBaseUrl,
} from "./tokens";

describe("generateToken", () => {
  it("levert 64 hex-tekens (32 bytes)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("levert nooit twee keer hetzelfde", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(tokens.size).toBe(200);
  });
});

describe("hashToken", () => {
  it("is deterministisch", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("geeft een ander resultaat voor een andere token", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("geeft de token zelf nooit terug", () => {
    const raw = generateToken();
    expect(hashToken(raw)).not.toBe(raw);
  });

  it("levert 64 hex-tekens (sha256)", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("expiresAtFor", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("geeft een uitnodiging 7 dagen", () => {
    expect(expiresAtFor("invite", now).toISOString()).toBe("2026-08-17T12:00:00.000Z");
  });

  it("geeft een herstellink 1 uur", () => {
    expect(expiresAtFor("reset", now).toISOString()).toBe("2026-08-10T13:00:00.000Z");
  });

  it("houdt de herstellink korter dan de uitnodiging", () => {
    expect(TOKEN_TTL_SECONDS.reset).toBeLessThan(TOKEN_TTL_SECONDS.invite);
  });
});

describe("checkToken", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");
  const geldig = { expiresAt: new Date("2026-08-10T12:30:00.000Z"), usedAt: null };

  it("aanvaardt een token die nog niet vervallen en niet gebruikt is", () => {
    expect(checkToken(geldig, now)).toEqual({ ok: true });
  });

  it("wijst een onbestaande token af", () => {
    expect(checkToken(undefined, now)).toEqual({ ok: false, reason: "onbekend" });
    expect(checkToken(null, now)).toEqual({ ok: false, reason: "onbekend" });
  });

  it("wijst een vervallen token af", () => {
    const row = { expiresAt: new Date("2026-08-10T11:59:59.000Z"), usedAt: null };
    expect(checkToken(row, now)).toEqual({ ok: false, reason: "vervallen" });
  });

  it("wijst een token af die precies nu vervalt", () => {
    const row = { expiresAt: new Date(now), usedAt: null };
    expect(checkToken(row, now)).toEqual({ ok: false, reason: "vervallen" });
  });

  it("wijst een al gebruikte token af", () => {
    const row = { ...geldig, usedAt: new Date("2026-08-10T12:10:00.000Z") };
    expect(checkToken(row, now)).toEqual({ ok: false, reason: "gebruikt" });
  });

  it("noemt 'gebruikt' ook wanneer de token daarnaast vervallen is", () => {
    const row = {
      expiresAt: new Date("2026-08-09T12:00:00.000Z"),
      usedAt: new Date("2026-08-09T11:00:00.000Z"),
    };
    expect(checkToken(row, now)).toEqual({ ok: false, reason: "gebruikt" });
  });
});

describe("reasonMessage", () => {
  it("geeft voor elke reden een leesbare boodschap zonder jargon", () => {
    for (const reason of ["onbekend", "vervallen", "gebruikt"] as const) {
      const message = reasonMessage(reason);
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toContain("token");
    }
  });

  it("legt bij een vervallen link uit hoe je een nieuwe krijgt", () => {
    expect(reasonMessage("vervallen").toLowerCase()).toContain("nieuwe");
  });
});

describe("resolveBaseUrl", () => {
  it("gebruikt NEXT_PUBLIC_SITE_URL wanneer die er is", () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_SITE_URL: "https://asiel.be" })).toBe("https://asiel.be");
  });

  it("valt terug op de Vercel-productie-URL", () => {
    expect(resolveBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: "app.vercel.app" })).toBe(
      "https://app.vercel.app",
    );
  });

  it("valt in laatste instantie terug op localhost", () => {
    expect(resolveBaseUrl({})).toBe("http://localhost:3000");
  });

  it("haalt een schuine streep op het einde weg", () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_SITE_URL: "https://asiel.be/" })).toBe("https://asiel.be");
  });

  it("negeert een lege waarde", () => {
    expect(resolveBaseUrl({ NEXT_PUBLIC_SITE_URL: "   " })).toBe("http://localhost:3000");
  });
});

describe("buildTokenUrl", () => {
  it("bouwt een volledige link naar het scherm om een wachtwoord in te stellen", () => {
    expect(buildTokenUrl("abc123", "https://asiel.be")).toBe(
      "https://asiel.be/wachtwoord-instellen/abc123",
    );
  });

  it("plakt geen dubbele schuine streep", () => {
    expect(buildTokenUrl("abc123", "https://asiel.be/")).toBe(
      "https://asiel.be/wachtwoord-instellen/abc123",
    );
  });

  it("codeert de token voor gebruik in een URL", () => {
    expect(buildTokenUrl("a b/c", "https://asiel.be")).toBe(
      "https://asiel.be/wachtwoord-instellen/a%20b%2Fc",
    );
  });
});
