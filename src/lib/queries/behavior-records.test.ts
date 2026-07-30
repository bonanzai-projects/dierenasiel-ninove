import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResults } = vi.hoisted(() => {
  const mockResults: unknown[][] = [];
  return { mockResults };
});

vi.mock("@/lib/db", () => {
  let callIndex = 0;
  const createChain = () => {
    const chain: Record<string, unknown> = {};
    const resolve = () => {
      const result = mockResults[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(result);
    };
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.leftJoin = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockImplementation(() => resolve());
    chain.then = vi.fn().mockImplementation((fn: (v: unknown) => unknown) => resolve().then(fn));
    return chain;
  };
  return {
    db: {
      select: vi.fn().mockImplementation(() => createChain()),
      _resetIndex: () => { callIndex = 0; },
    },
  };
});

vi.mock("@/lib/db/schema", () => ({
  behaviorRecords: {
    animalId: "animal_id",
    date: "date",
    createdAt: "created_at",
  },
  users: {
    id: "id",
    name: "name",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  count: vi.fn(() => ({ type: "count" })),
  sql: vi.fn(),
}));

import {
  getBehaviorRecordsByAnimalId,
  countBehaviorRecords,
  getLatestBehaviorRecord,
} from "./behavior-records";
import { db } from "@/lib/db";

const sampleRecord = {
  id: 1,
  animalId: 42,
  date: "2026-02-26",
  checklist: {
    verzorgers_algemeenAgressief: false,
    verzorgers_agressiefSpeelgoed: false,
    verzorgers_agressiefVoederkom: null,
    verzorgers_agressiefMand: false,
    verzorgers_gemakkelijkWandeling: true,
    verzorgers_speeltGraag: true,
    verzorgers_andere: null,
    honden_algemeenAgressief: true,
    honden_agressiefSpeelgoed: false,
    honden_agressiefVoederkom: null,
    honden_agressiefMand: false,
    honden_speeltGraag: false,
    honden_andere: null,
  },
  notes: null,
  recordedBy: 1,
  createdAt: new Date(),
  recordedByName: "Jan Medewerker",
};

describe("getBehaviorRecordsByAnimalId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResults.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._resetIndex();
  });

  it("returns records when found", async () => {
    mockResults.push([sampleRecord]);

    const result = await getBehaviorRecordsByAnimalId(42);

    expect(result).toEqual([sampleRecord]);
  });

  it("returns empty array when no records exist", async () => {
    mockResults.push([]);

    const result = await getBehaviorRecordsByAnimalId(999);

    expect(result).toEqual([]);
  });

  it("returns empty array on database error", async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error("Connection refused");
    });

    const result = await getBehaviorRecordsByAnimalId(1);

    expect(result).toEqual([]);
  });
});

describe("countBehaviorRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResults.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._resetIndex();
  });

  it("returns count when records exist", async () => {
    mockResults.push([{ count: 3 }]);

    const result = await countBehaviorRecords(42);

    expect(result).toBe(3);
  });

  it("returns 0 when no records exist", async () => {
    mockResults.push([{ count: 0 }]);

    const result = await countBehaviorRecords(999);

    expect(result).toBe(0);
  });

  it("returns 0 on database error", async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error("Connection refused");
    });

    const result = await countBehaviorRecords(1);

    expect(result).toBe(0);
  });
});

describe("getLatestBehaviorRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResults.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._resetIndex();
  });

  it("returns latest record when found", async () => {
    mockResults.push([sampleRecord]);

    const result = await getLatestBehaviorRecord(42);

    expect(result).toEqual(sampleRecord);
  });

  it("returns null when no records exist", async () => {
    mockResults.push([]);

    const result = await getLatestBehaviorRecord(999);

    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error("Connection refused");
    });

    const result = await getLatestBehaviorRecord(1);

    expect(result).toBeNull();
  });
});
