import { describe, it, expect } from "vitest";
import {
  shelterSettingKeySchema,
  shelterSettingValueSchema,
  SHELTER_SETTING_KEYS,
  type WorkflowSettings,
} from "./shelter-settings";

describe("SHELTER_SETTING_KEYS", () => {
  it("contains all expected keys", () => {
    expect(SHELTER_SETTING_KEYS.WORKFLOW_ENABLED).toBe("workflow_enabled");
    expect(SHELTER_SETTING_KEYS.WORKFLOW_STEPBAR_VISIBLE).toBe("workflow_stepbar_visible");
    expect(SHELTER_SETTING_KEYS.WORKFLOW_AUTO_ACTIONS_ENABLED).toBe("workflow_auto_actions_enabled");
    expect(SHELTER_SETTING_KEYS.WALKING_CLUB_THRESHOLD).toBe("walking_club_threshold");
    expect(SHELTER_SETTING_KEYS.BEHAVIOR_CAREGIVERS).toBe("behavior_caregivers");
  });
});

describe("shelterSettingKeySchema", () => {
  it("accepts valid keys", () => {
    expect(shelterSettingKeySchema.safeParse("workflow_enabled").success).toBe(true);
    expect(shelterSettingKeySchema.safeParse("workflow_stepbar_visible").success).toBe(true);
    expect(shelterSettingKeySchema.safeParse("workflow_auto_actions_enabled").success).toBe(true);
    expect(shelterSettingKeySchema.safeParse("walking_club_threshold").success).toBe(true);
    expect(shelterSettingKeySchema.safeParse("behavior_caregivers").success).toBe(true);
  });

  it("rejects invalid keys", () => {
    expect(shelterSettingKeySchema.safeParse("invalid_key").success).toBe(false);
    expect(shelterSettingKeySchema.safeParse("").success).toBe(false);
    expect(shelterSettingKeySchema.safeParse(123).success).toBe(false);
  });
});

describe("shelterSettingValueSchema", () => {
  describe("boolean settings (workflow toggles)", () => {
    it("accepts true for workflow_enabled", () => {
      const result = shelterSettingValueSchema("workflow_enabled", true);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(true);
    });

    it("accepts false for workflow_enabled", () => {
      const result = shelterSettingValueSchema("workflow_enabled", false);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(false);
    });

    it("accepts boolean for workflow_stepbar_visible", () => {
      const result = shelterSettingValueSchema("workflow_stepbar_visible", true);
      expect(result.success).toBe(true);
    });

    it("accepts boolean for workflow_auto_actions_enabled", () => {
      const result = shelterSettingValueSchema("workflow_auto_actions_enabled", false);
      expect(result.success).toBe(true);
    });

    it("rejects non-boolean for workflow_enabled", () => {
      const result = shelterSettingValueSchema("workflow_enabled", "true");
      expect(result.success).toBe(false);
    });

    it("rejects number for workflow_stepbar_visible", () => {
      const result = shelterSettingValueSchema("workflow_stepbar_visible", 1);
      expect(result.success).toBe(false);
    });
  });

  describe("number settings (walking_club_threshold)", () => {
    it("accepts positive integer", () => {
      const result = shelterSettingValueSchema("walking_club_threshold", 10);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(10);
    });

    it("rejects zero", () => {
      const result = shelterSettingValueSchema("walking_club_threshold", 0);
      expect(result.success).toBe(false);
    });

    it("rejects negative", () => {
      const result = shelterSettingValueSchema("walking_club_threshold", -5);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer", () => {
      const result = shelterSettingValueSchema("walking_club_threshold", 5.5);
      expect(result.success).toBe(false);
    });

    it("rejects string", () => {
      const result = shelterSettingValueSchema("walking_club_threshold", "10");
      expect(result.success).toBe(false);
    });
  });

  describe("string-array settings (behavior_caregivers)", () => {
    it("accepts a list of names", () => {
      const result = shelterSettingValueSchema("behavior_caregivers", ["Sven", "Martine"]);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual(["Sven", "Martine"]);
    });

    it("accepts an empty list", () => {
      const result = shelterSettingValueSchema("behavior_caregivers", []);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual([]);
    });

    it("trims names", () => {
      const result = shelterSettingValueSchema("behavior_caregivers", ["  Sven  "]);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual(["Sven"]);
    });

    it("rejects a blank name", () => {
      const result = shelterSettingValueSchema("behavior_caregivers", ["Sven", "   "]);
      expect(result.success).toBe(false);
    });

    it("rejects a non-array value", () => {
      const result = shelterSettingValueSchema("behavior_caregivers", "Sven");
      expect(result.success).toBe(false);
    });

    it("rejects more than 50 names", () => {
      const many = Array.from({ length: 51 }, (_, i) => `Naam ${i}`);
      const result = shelterSettingValueSchema("behavior_caregivers", many);
      expect(result.success).toBe(false);
    });
  });
});
