import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSession, verifySession, SESSION_DURATION } from "./session";

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    })
  ),
}));

describe("createSession", () => {
  it("returns a valid JWT string", async () => {
    const token = await createSession({
      userId: 1,
      email: "sven@dierenasielninove.be",
      role: "beheerder",
      name: "Sven",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});

describe("verifySession", () => {
  it("decodes token correctly with userId, role, and exp", async () => {
    const token = await createSession({
      userId: 42,
      email: "jan@dierenasielninove.be",
      role: "medewerker",
      name: "Jan",
    });

    const payload = await verifySession(token);

    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe(42);
    expect(payload!.email).toBe("jan@dierenasielninove.be");
    expect(payload!.role).toBe("medewerker");
    expect(payload!.name).toBe("Jan");
  });

  it("returns null for an invalid token", async () => {
    const payload = await verifySession("invalid.token.string");
    expect(payload).toBeNull();
  });

  it("returns null for an expired token", async () => {
    try {
      // Create a token that expired in the past by mocking Date
      const pastDate = new Date("2020-01-01T00:00:00Z");
      vi.setSystemTime(pastDate);

      const token = await createSession({
        userId: 1,
        email: "test@test.be",
        role: "beheerder",
        name: "Test",
      });

      // Restore real time — token is now expired
      vi.useRealTimers();

      const payload = await verifySession(token);
      expect(payload).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // De sessieduur verschilt bewust per omgeving: 7 dagen in productie,
  // 30 dagen lokaal (zie SESSION_DURATION). De test draait niet in productie.
  it("creates a token that expires after SESSION_DURATION", async () => {
    const now = Math.floor(Date.now() / 1000);

    const token = await createSession({
      userId: 1,
      email: "test@test.be",
      role: "beheerder",
      name: "Test",
    });

    const payload = await verifySession(token);
    expect(payload).not.toBeNull();

    // Decode JWT to check exp claim directly
    const parts = token.split(".");
    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );

    // exp ligt op SESSION_DURATION vanaf nu (5 seconden speling)
    expect(claims.exp).toBeGreaterThan(now + SESSION_DURATION - 5);
    expect(claims.exp).toBeLessThanOrEqual(now + SESSION_DURATION + 5);
  });

  it("gebruikt 30 dagen buiten productie en 7 dagen erin", () => {
    // Vangnet tegen per ongeluk een lange sessie meedeployen naar productie.
    const expected = process.env.NODE_ENV === "production"
      ? 7 * 24 * 60 * 60
      : 30 * 24 * 60 * 60;
    expect(SESSION_DURATION).toBe(expected);
  });
});
