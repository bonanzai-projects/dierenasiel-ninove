import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResults } = vi.hoisted(() => {
  const mockResults: unknown[][] = [];
  return { mockResults };
});

vi.mock("@/lib/db", () => {
  let callIndex = 0;
  let shouldThrow = false;
  const createChain = () => {
    const chain: Record<string, unknown> = {};
    const resolve = () => {
      if (shouldThrow) return Promise.reject(new Error("Connection refused"));
      const result = mockResults[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(result);
    };
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockImplementation(() => resolve());
    chain.then = vi.fn().mockImplementation((fn: (v: unknown) => unknown) => resolve().then(fn));
    return chain;
  };
  return {
    db: {
      select: vi.fn().mockImplementation(() => createChain()),
      _reset: () => { callIndex = 0; shouldThrow = false; },
      _fail: () => { shouldThrow = true; },
    },
  };
});

vi.mock("@/lib/db/schema", () => ({
  animalTraits: { animalId: "animal_id", traits: "traits" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
}));

import { getAnimalTraits } from "./animal-traits";
import { db } from "@/lib/db";

describe("getAnimalTraits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResults.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._reset();
  });

  it("geeft de opgeslagen eigenschappen terug", async () => {
    mockResults.push([{ traits: { zindelijk: "ja", katten: "nee" } }]);

    const result = await getAnimalTraits(42);

    expect(result).toEqual({ zindelijk: "ja", katten: "nee" });
  });

  it("geeft een leeg object wanneer er nog geen rij bestaat", async () => {
    mockResults.push([]);

    expect(await getAnimalTraits(42)).toEqual({});
  });

  it("geeft een leeg object bij een databasefout", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._fail();

    expect(await getAnimalTraits(42)).toEqual({});
  });
});
