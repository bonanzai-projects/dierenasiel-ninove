import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AnimalShelterError,
  readFromAnimalShelter,
  resetAnimalShelterTokenCache,
} from "./http";
import { logOutboundCall } from "./audit";

vi.mock("./audit", () => ({ logOutboundCall: vi.fn().mockResolvedValue(undefined) }));

const ENV = {
  ANIMALSHELTER_ENABLED: "true",
  ANIMALSHELTER_CLIENT_ID: "2",
  ANIMALSHELTER_CLIENT_SECRET: "geheim",
  ANIMALSHELTER_USERNAME: "info@example.be",
  ANIMALSHELTER_PASSWORD: "wachtwoord",
};

function tokenResponse(token = "token-1", expiresIn = 31_536_000) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ token_type: "Bearer", expires_in: expiresIn, access_token: token }),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  resetAnimalShelterTokenCache();
  for (const [key, value] of Object.entries(ENV)) process.env[key] = value;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("readFromAnimalShelter — het doorgeefluik", () => {
  it("weigert een pad buiten de allowlist zonder ook maar één netwerkoproep", async () => {
    await expect(readFromAnimalShelter("/animal/1/delete")).rejects.toBeInstanceOf(AnimalShelterError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("weigert het token-pad via de leesfunctie", async () => {
    await expect(readFromAnimalShelter("/oauth/token")).rejects.toThrow(/alleen-lezen/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("weigert te werken wanneer de noodrem uitstaat", async () => {
    process.env.ANIMALSHELTER_ENABLED = "false";
    await expect(readFromAnimalShelter("/category/dogs")).rejects.toMatchObject({ code: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("weigert te werken wanneer een credential ontbreekt", async () => {
    delete process.env.ANIMALSHELTER_PASSWORD;
    await expect(readFromAnimalShelter("/category/dogs")).rejects.toMatchObject({ code: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("haalt een token op en doet daarna een GET met bearer-header en zonder body", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse([{ id: 1 }]));

    const data = await readFromAnimalShelter("/category/dogs");

    expect(data).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(String(tokenUrl)).toContain("/oauth/token");
    expect(tokenInit.method).toBe("POST");

    const [readUrl, readInit] = fetchMock.mock.calls[1];
    expect(String(readUrl)).toBe("https://api.animalshelter.be/category/dogs");
    expect(readInit.method).toBe("GET");
    expect(readInit.body).toBeUndefined();
    expect(readInit.headers.Authorization).toBe("Bearer token-1");
  });

  it("stuurt bij het ophalen van het token nooit iets anders mee dan de grant-gegevens", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse([]));
    await readFromAnimalShelter("/category/cats");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual([
      "client_id",
      "client_secret",
      "grant_type",
      "password",
      "username",
    ]);
    expect(body.grant_type).toBe("password");
  });

  it("hergebruikt het token voor een volgende leesoproep", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    await readFromAnimalShelter("/category/dogs");
    await readFromAnimalShelter("/category/cats");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain("/category/cats");
  });

  it("haalt een nieuw token wanneer het oude vervallen is", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T10:00:00Z"));
    fetchMock
      .mockResolvedValueOnce(tokenResponse("token-1", 3600))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(tokenResponse("token-2", 3600))
      .mockResolvedValueOnce(jsonResponse([]));

    await readFromAnimalShelter("/category/dogs");
    vi.setSystemTime(new Date("2026-07-26T11:30:00Z"));
    await readFromAnimalShelter("/category/dogs");

    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer token-2");
  });

  it("authenticeert één keer opnieuw bij een 401 en probeert het dan nog eens", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("verlopen"))
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthenticated" }, 401))
      .mockResolvedValueOnce(tokenResponse("vers"))
      .mockResolvedValueOnce(jsonResponse([{ id: 9 }]));

    const data = await readFromAnimalShelter("/category/dogs");

    expect(data).toEqual([{ id: 9 }]);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer vers");
  });

  it("geeft op na een tweede 401 — geen eindeloze lus", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("a"))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(tokenResponse("b"))
      .mockResolvedValueOnce(jsonResponse({}, 401));

    await expect(readFromAnimalShelter("/category/dogs")).rejects.toMatchObject({ code: "auth_failed" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("meldt een mislukte tokenoproep als auth_failed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "invalid_client" }, 401));
    await expect(readFromAnimalShelter("/category/dogs")).rejects.toMatchObject({ code: "auth_failed" });
  });

  it("meldt een serverfout als http_error", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse({}, 503));
    await expect(readFromAnimalShelter("/category/dogs")).rejects.toMatchObject({ code: "http_error" });
  });

  it("meldt onleesbare JSON als invalid_response", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("kapot");
      },
    });
    await expect(readFromAnimalShelter("/category/dogs")).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("oproeplogboek — het bewijsstuk voor het bestuur", () => {
  it("logt elke geslaagde leesoproep met methode, pad en status", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse([]));
    await readFromAnimalShelter("/category/dogs");
    expect(logOutboundCall).toHaveBeenCalledWith("GET", "/category/dogs", 200);
  });

  it("logt ook een mislukte oproep", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse({}, 503));
    await expect(readFromAnimalShelter("/category/dogs")).rejects.toThrow();
    expect(logOutboundCall).toHaveBeenCalledWith("GET", "/category/dogs", 503);
  });

  it("logt de tokenoproep apart, zonder credentials in het logboek", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse([]));
    await readFromAnimalShelter("/category/dogs");

    expect(logOutboundCall).toHaveBeenCalledWith("POST", "/oauth/token", 200);
    const gelogd = JSON.stringify(vi.mocked(logOutboundCall).mock.calls);
    expect(gelogd).not.toContain("geheim");
    expect(gelogd).not.toContain("wachtwoord");
    expect(gelogd).not.toContain("token-1");
  });
});
