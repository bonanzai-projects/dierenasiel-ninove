import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { backfillCampaignCoordinates } from "./backfill-campaign-coordinates";

backfillCampaignCoordinates(process.argv.includes("--opnieuw"))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill mislukt:", err);
    process.exit(1);
  });
