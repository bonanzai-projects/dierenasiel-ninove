/**
 * Story 10.56 — zoekt het adres van bestaande zwerfkat-campagnes één keer op in
 * het Vlaamse adressenregister en bewaart de coördinaten.
 *
 * Draaien:  npm run db:backfill-campaign-coordinates
 * Idempotent: campagnes die al een `geocodedAt` hebben, worden overgeslagen
 * (tenzij je `--opnieuw` meegeeft).
 */
import { db } from "@/lib/db";
import { strayCatCampaigns } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { geocodeAddress } from "@/lib/maps/geocode";

export async function backfillCampaignCoordinates(opnieuw = false) {
  const campagnes = await db
    .select({
      id: strayCatCampaigns.id,
      address: strayCatCampaigns.address,
      municipality: strayCatCampaigns.municipality,
    })
    .from(strayCatCampaigns)
    .where(opnieuw ? undefined : isNull(strayCatCampaigns.geocodedAt));

  let gevonden = 0;
  let benadering = 0;
  let niets = 0;

  for (const campagne of campagnes) {
    const treffer = await geocodeAddress(campagne.address, campagne.municipality);

    await db
      .update(strayCatCampaigns)
      .set({
        latitude: treffer ? String(treffer.lat) : null,
        longitude: treffer ? String(treffer.lng) : null,
        geocodedAddress: treffer?.formattedAddress || null,
        geocodeMatch: treffer?.matchType ?? null,
        geocodedAt: new Date(),
      })
      .where(eq(strayCatCampaigns.id, campagne.id));

    if (treffer?.matchType === "huisnummer") gevonden++;
    else if (treffer) benadering++;
    else niets++;

    console.log(
      `#${campagne.id} ${campagne.address} -> ${treffer ? `${treffer.formattedAddress} (${treffer.matchType})` : "niet gevonden"}`,
    );
  }

  console.log(
    `\nKlaar: ${campagnes.length} campagnes — ${gevonden} exact, ${benadering} bij benadering, ${niets} niet gevonden.`,
  );
  return { totaal: campagnes.length, gevonden, benadering, niets };
}
