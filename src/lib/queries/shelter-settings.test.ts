import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSelectLimit, mockSelectWhere, mockSelectFrom,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  return { mockSelectLimit, mockSelectWhere, mockSelectFrom };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  shelterSettings: {
    key: Symbol("shelterSettings.key"),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  inArray: vi.fn((...args: unknown[]) => ({ type: "inArray", args })),
}));

import { getWalkingClubThreshold, getWorkflowSettings, getShelterSetting, getShelterCaregivers } from "./shelter-settings";

describe("getWalkingClubThreshold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  });

  it("returns threshold value from DB (jsonb number)", async () => {
    mockSelectLimit.mockResolvedValue([{ key: "walking_club_threshold", value: 15 }]);
    const result = await getWalkingClubThreshold();
    expect(result).toBe(15);
  });

  it("returns default 10 when not found", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await getWalkingClubThreshold();
    expect(result).toBe(10);
  });

  it("returns default 10 when value is not a number", async () => {
    mockSelectLimit.mockResolvedValue([{ key: "walking_club_threshold", value: "invalid" }]);
    const result = await getWalkingClubThreshold();
    expect(result).toBe(10);
  });

  it("returns default 10 on DB error", async () => {
    mockSelectLimit.mockRejectedValue(new Error("DB error"));
    const result = await getWalkingClubThreshold();
    expect(result).toBe(10);
  });
});

describe("getShelterSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  });

  it("returns value for existing key", async () => {
    mockSelectLimit.mockResolvedValue([{ key: "workflow_enabled", value: true }]);
    const result = await getShelterSetting("workflow_enabled");
    expect(result).toBe(true);
  });

  it("returns null for missing key", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await getShelterSetting("workflow_enabled");
    expect(result).toBeNull();
  });

  it("returns null on DB error", async () => {
    mockSelectLimit.mockRejectedValue(new Error("DB error"));
    const result = await getShelterSetting("workflow_enabled");
    expect(result).toBeNull();
  });
});

describe("getShelterCaregivers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  });

  it("returns the stored list of names", async () => {
    mockSelectLimit.mockResolvedValue([
      { key: "behavior_caregivers", value: ["Sven Vanderrusten", "Martine Van Den Steen"] },
    ]);
    const result = await getShelterCaregivers();
    expect(result).toEqual(["Sven Vanderrusten", "Martine Van Den Steen"]);
  });

  it("returns empty array when not found", async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await getShelterCaregivers();
    expect(result).toEqual([]);
  });

  it("filters out non-string and blank entries", async () => {
    mockSelectLimit.mockResolvedValue([
      { key: "behavior_caregivers", value: ["Sven", "", "  ", 42, "Katrien"] },
    ]);
    const result = await getShelterCaregivers();
    expect(result).toEqual(["Sven", "Katrien"]);
  });

  it("returns empty array when value is not an array", async () => {
    mockSelectLimit.mockResolvedValue([{ key: "behavior_caregivers", value: "Sven" }]);
    const result = await getShelterCaregivers();
    expect(result).toEqual([]);
  });

  it("returns empty array on DB error", async () => {
    mockSelectLimit.mockRejectedValue(new Error("DB error"));
    const result = await getShelterCaregivers();
    expect(result).toEqual([]);
  });
});

describe("getWorkflowSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  });

  it("returns all workflow settings", async () => {
    mockSelectWhere.mockResolvedValue([
      { key: "workflow_enabled", value: true },
      { key: "workflow_stepbar_visible", value: true },
      { key: "workflow_auto_actions_enabled", value: false },
    ]);
    const result = await getWorkflowSettings();
    expect(result).toEqual({
      workflowEnabled: true,
      stepbarVisible: true,
      autoActionsEnabled: false,
    });
  });

  it("returns defaults when settings missing", async () => {
    mockSelectWhere.mockResolvedValue([]);
    const result = await getWorkflowSettings();
    expect(result).toEqual({
      workflowEnabled: true,
      stepbarVisible: true,
      autoActionsEnabled: true,
    });
  });

  it("returns defaults on DB error", async () => {
    mockSelectWhere.mockRejectedValue(new Error("DB error"));
    const result = await getWorkflowSettings();
    expect(result).toEqual({
      workflowEnabled: true,
      stepbarVisible: true,
      autoActionsEnabled: true,
    });
  });

  it("handles partial settings (some missing)", async () => {
    mockSelectWhere.mockResolvedValue([
      { key: "workflow_enabled", value: false },
    ]);
    const result = await getWorkflowSettings();
    expect(result).toEqual({
      workflowEnabled: false,
      stepbarVisible: true,
      autoActionsEnabled: true,
    });
  });
});
