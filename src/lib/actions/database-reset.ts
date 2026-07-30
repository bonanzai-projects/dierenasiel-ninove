"use server";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getUserSeeds } from "@/seed/users";
import { kennelSeeds } from "@/seed/kennels";
import { dogSeeds, catSeeds, otherAnimalSeeds } from "@/seed/animals";
import { newsSeeds } from "@/seed/news";
import { pageSeeds } from "@/seed/pages";
import { sponsorSeeds } from "@/seed/sponsors";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const SETTINGS_DEFAULTS = [
  { key: "walking_club_threshold", value: 10 },
  { key: "workflow_enabled", value: true },
  { key: "workflow_stepbar_visible", value: true },
  { key: "workflow_auto_actions_enabled", value: true },
];

/** Delete all rows from every table in FK-safe order. */
async function clearAllTables() {
  // Mailing chain
  await db.delete(schema.mailingSendRecipients);
  await db.delete(schema.mailingSends);
  await db.delete(schema.mailingLists);

  // Adoption chain
  await db.delete(schema.postAdoptionFollowups);
  await db.delete(schema.adoptionContracts);
  await db.delete(schema.kennismakingen);
  await db.delete(schema.adoptionCandidates);

  // Medical chain
  await db.delete(schema.medicationLogs);
  await db.delete(schema.medications);
  await db.delete(schema.operations);
  await db.delete(schema.vetVisits);
  await db.delete(schema.dewormings);
  await db.delete(schema.vaccinations);

  // Animal-related
  await db.delete(schema.animalTodos);
  await db.delete(schema.behaviorRecords);
  await db.delete(schema.feedingPlans);
  await db.delete(schema.neglectReports);
  await db.delete(schema.animalWorkflowHistory);
  await db.delete(schema.animalAttachments);

  // Walks
  await db.delete(schema.walks);
  await db.delete(schema.walkers);

  // Blacklist (after adoption chain — FK from adoptionCandidates)
  await db.delete(schema.blacklistEntries);

  // Stray cats
  await db.delete(schema.strayCatCampaigns);
  await db.delete(schema.vetInspectionReports);

  // Other entities
  await db.delete(schema.contactSubmissions);
  await db.delete(schema.animals);
  await db.delete(schema.kennels);
  await db.delete(schema.kennelSponsors);
  await db.delete(schema.newsArticles);
  await db.delete(schema.pages);
  await db.delete(schema.auditLogs);
  await db.delete(schema.users);

  // Settings
  await db.delete(schema.shelterSettings);
}

/** Insert settings defaults and seed users. */
async function insertDefaults() {
  for (const setting of SETTINGS_DEFAULTS) {
    await db.insert(schema.shelterSettings).values(setting);
  }
  const userSeeds = await getUserSeeds();
  for (const user of userSeeds) {
    await db.insert(schema.users).values(user);
  }
}

/** Insert all seed data (kennels, animals, news, pages, sponsors). */
async function insertSeedData() {
  for (const kennel of kennelSeeds) {
    await db.insert(schema.kennels).values(kennel);
  }
  const allAnimals = [...dogSeeds, ...catSeeds, ...otherAnimalSeeds];
  for (const animal of allAnimals) {
    await db.insert(schema.animals).values(animal);
  }
  for (const article of newsSeeds) {
    await db.insert(schema.newsArticles).values(article);
  }
  for (const page of pageSeeds) {
    await db.insert(schema.pages).values(page);
  }
  for (const sponsor of sponsorSeeds) {
    await db.insert(schema.kennelSponsors).values(sponsor);
  }
}

/** Wis alles, herstel alleen instellingen + gebruikers. */
export async function resetDatabase(): Promise<ActionResult> {
  const permCheck = await requirePermission("settings:write");
  if (permCheck) return permCheck;

  try {
    await clearAllTables();
    await insertDefaults();

    revalidatePath("/");

    return {
      success: true,
      data: undefined,
      message: "Database is volledig gewist en standaardinstellingen zijn hersteld.",
    };
  } catch (err) {
    console.error("resetDatabase failed:", err);
    return {
      success: false,
      error: "Er ging iets mis bij het wissen van de database.",
    };
  }
}

/**
 * De knop "Seed testdata" is in Story 10.53 vervangen door bewaren/terugzetten.
 * De server-actie is mee verdwenen: een openstaand eindpunt dat alles wist en
 * testdata laadt, hoort niet in een toepassing met echte gegevens.
 *
 * Onderstaande headless variant blijft bestaan voor de end-to-end-tests.
 */

/**
 * Headless variant (no permission check) — used by API route for E2E teardown.
 * NEVER expose directly to UI; only call from secret-protected API routes.
 */
export async function seedDatabaseHeadless(): Promise<void> {
  await clearAllTables();
  await insertDefaults();
  await insertSeedData();
}
