import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { migrateCalendarEventsToEvents } from "./migrate-calendar-events-to-events";

migrateCalendarEventsToEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migratie mislukt:", err);
    process.exit(1);
  });
