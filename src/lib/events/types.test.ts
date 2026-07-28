import { describe, it, expect } from "vitest";
import {
  EVENT_TYPES,
  EVENT_TYPE_KEYS,
  EVENT_STATUSES,
  EVENT_STATUS_KEYS,
  eventTypeLabel,
  eventStatusLabel,
  isPastEvent,
} from "./types";

describe("evenement-types", () => {
  it("bevat de eetkermis — het voorbeeld van Sven", () => {
    expect(EVENT_TYPE_KEYS).toContain("eetkermis");
  });

  it("heeft een 'andere' vangnet-type zodat niets buiten de lijst valt", () => {
    expect(EVENT_TYPE_KEYS).toContain("andere");
  });

  it("geeft elk type een label", () => {
    for (const t of EVENT_TYPES) expect(t.label.length).toBeGreaterThan(0);
  });

  it("valt terug op de sleutel voor een onbekend type", () => {
    expect(eventTypeLabel("eetkermis")).toBe("Eetkermis");
    expect(eventTypeLabel("bestaat-niet")).toBe("bestaat-niet");
  });
});

describe("evenement-statussen", () => {
  it("kent concept, gepland, afgelopen en geannuleerd", () => {
    expect(EVENT_STATUS_KEYS).toEqual(["concept", "gepland", "afgelopen", "geannuleerd"]);
  });

  it("geeft elke status een label en een kleur", () => {
    for (const s of EVENT_STATUSES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.pill).toContain("bg-");
    }
  });

  it("valt terug op de sleutel voor een onbekende status", () => {
    expect(eventStatusLabel("gepland")).toBe("Gepland");
    expect(eventStatusLabel("xyz")).toBe("xyz");
  });
});

describe("isPastEvent", () => {
  it("kijkt naar de einddatum wanneer die er is", () => {
    expect(isPastEvent({ date: "2026-07-01", endDate: "2026-07-30" }, "2026-07-28")).toBe(false);
    expect(isPastEvent({ date: "2026-07-01", endDate: "2026-07-27" }, "2026-07-28")).toBe(true);
  });

  it("kijkt naar de begindatum wanneer er geen einddatum is", () => {
    expect(isPastEvent({ date: "2026-07-27", endDate: null }, "2026-07-28")).toBe(true);
    expect(isPastEvent({ date: "2026-07-29", endDate: null }, "2026-07-28")).toBe(false);
  });

  it("telt de dag zelf nog niet als voorbij", () => {
    expect(isPastEvent({ date: "2026-07-28", endDate: null }, "2026-07-28")).toBe(false);
  });
});
