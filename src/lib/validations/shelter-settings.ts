import { z } from "zod";

export const SHELTER_SETTING_KEYS = {
  WORKFLOW_ENABLED: "workflow_enabled",
  WORKFLOW_STEPBAR_VISIBLE: "workflow_stepbar_visible",
  WORKFLOW_AUTO_ACTIONS_ENABLED: "workflow_auto_actions_enabled",
  WALKING_CLUB_THRESHOLD: "walking_club_threshold",
  WALK_DAYS: "walk_days",
  // Story 10.27: namen van de verzorgers voor het gedragsrapport (Bijlage VIII B).
  BEHAVIOR_CAREGIVERS: "behavior_caregivers",
} as const;

export type ShelterSettingKey = (typeof SHELTER_SETTING_KEYS)[keyof typeof SHELTER_SETTING_KEYS];

export const shelterSettingKeySchema = z.enum([
  SHELTER_SETTING_KEYS.WORKFLOW_ENABLED,
  SHELTER_SETTING_KEYS.WORKFLOW_STEPBAR_VISIBLE,
  SHELTER_SETTING_KEYS.WORKFLOW_AUTO_ACTIONS_ENABLED,
  SHELTER_SETTING_KEYS.WALKING_CLUB_THRESHOLD,
  SHELTER_SETTING_KEYS.WALK_DAYS,
  SHELTER_SETTING_KEYS.BEHAVIOR_CAREGIVERS,
]);

const booleanValueSchema = z.boolean();
const thresholdValueSchema = z.number().int().positive();
// Story 10.13: weekdagnummers 0=zondag ... 6=zaterdag, uniek, 0..7 entries.
const walkDaysValueSchema = z.array(z.number().int().min(0).max(6)).max(7);
// Story 10.27: lijst van verzorgernamen (niet-leeg na trim), max 50 namen.
const caregiversValueSchema = z.array(z.string().trim().min(1).max(100)).max(50);

export type WorkflowSettings = {
  workflowEnabled: boolean;
  stepbarVisible: boolean;
  autoActionsEnabled: boolean;
};

// Story 10.13: default — maandag, woensdag, vrijdag, zaterdag.
export const DEFAULT_WALK_DAYS: number[] = [1, 3, 5, 6];

/**
 * Validate a setting value based on its key.
 * Returns { success: true, data } or { success: false, error }.
 */
export function shelterSettingValueSchema(
  key: string,
  value: unknown,
): { success: true; data: boolean | number | number[] | string[] } | { success: false; error: string } {
  switch (key) {
    case SHELTER_SETTING_KEYS.WORKFLOW_ENABLED:
    case SHELTER_SETTING_KEYS.WORKFLOW_STEPBAR_VISIBLE:
    case SHELTER_SETTING_KEYS.WORKFLOW_AUTO_ACTIONS_ENABLED: {
      const result = booleanValueSchema.safeParse(value);
      if (result.success) return { success: true, data: result.data };
      return { success: false, error: "Waarde moet een boolean zijn (true/false)." };
    }
    case SHELTER_SETTING_KEYS.WALKING_CLUB_THRESHOLD: {
      const result = thresholdValueSchema.safeParse(value);
      if (result.success) return { success: true, data: result.data };
      return { success: false, error: "Drempel moet een positief geheel getal zijn." };
    }
    case SHELTER_SETTING_KEYS.WALK_DAYS: {
      const result = walkDaysValueSchema.safeParse(value);
      if (!result.success) {
        return { success: false, error: "Wandeldagen moeten een array zijn van weekdagnummers (0-6)." };
      }
      // Dedupe + sort voor consistentie
      const unique = Array.from(new Set(result.data)).sort((a, b) => a - b);
      return { success: true, data: unique };
    }
    case SHELTER_SETTING_KEYS.BEHAVIOR_CAREGIVERS: {
      const result = caregiversValueSchema.safeParse(value);
      if (!result.success) {
        return { success: false, error: "Verzorgers moeten een lijst van namen zijn (max 50)." };
      }
      return { success: true, data: result.data };
    }
    default:
      return { success: false, error: `Onbekende instelling: ${key}` };
  }
}
