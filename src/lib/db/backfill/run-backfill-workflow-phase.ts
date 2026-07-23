import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { backfillWorkflowPhase } from "./backfill-workflow-phase";

backfillWorkflowPhase()
  .then(({ scanned, updated }) => {
    const verdeling = Object.entries(updated)
      .map(([phase, n]) => `${n}× ${phase}`)
      .join(", ");
    console.log(
      `✓ Backfill voltooid: ${scanned} dieren zonder workflow-fase gevonden` +
        (scanned > 0 ? ` — ${verdeling}.` : "."),
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Backfill gefaald:", err);
    process.exit(1);
  });
