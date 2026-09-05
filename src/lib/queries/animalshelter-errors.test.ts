import { describe, it, expect } from "vitest";
import { AnimalShelterError } from "@/lib/animalshelter/http";
import { AnimalShelterShapeError, parseAnimalList } from "@/lib/animalshelter/types";
import { toFetchError } from "./animalshelter";

/**
 * Story 11.9 — de melding moet naar de juiste oorzaak wijzen.
 *
 * Vóór deze story werd élke fout die geen `disabled` of `auth_failed` was
 * vertaald naar "AnimalShelter is momenteel niet bereikbaar". Toen "Bommel" met
 * `properties: []` binnenkwam, zag Sven dus een storingsmelding terwijl hun API
 * probleemloos antwoordde — en "straks opnieuw proberen" kon per definitie niet
 * helpen.
 */

describe("toFetchError", () => {
  it("houdt de koppeling-staat-uit melding", () => {
    const fout = toFetchError(new AnimalShelterError("disabled", ""));
    expect(fout.code).toBe("disabled");
    expect(fout.message).toMatch(/ANIMALSHELTER_ENABLED/);
  });

  it("houdt de aanmeldfout apart", () => {
    expect(toFetchError(new AnimalShelterError("auth_failed", "")).code).toBe("auth_failed");
  });

  it("noemt een netwerkfout wél onbereikbaar", () => {
    const fout = toFetchError(new TypeError("fetch failed"));
    expect(fout.code).toBe("unreachable");
    expect(fout.message).toMatch(/niet bereikbaar/i);
  });

  it("noemt een HTTP-fout aan hun kant onbereikbaar", () => {
    expect(toFetchError(new AnimalShelterError("http_error", "HTTP 503")).code).toBe("unreachable");
  });

  it("noemt onverwachte gegevens géén storing", () => {
    const shapeError = (() => {
      try {
        parseAnimalList([{ id: 1908097, naam: "Bommel", properties: ["onbekende vorm"] }]);
        throw new Error("had moeten falen");
      } catch (e) {
        return e;
      }
    })();

    expect(shapeError).toBeInstanceOf(AnimalShelterShapeError);

    const fout = toFetchError(shapeError);
    expect(fout.code).toBe("invalid_response");
    expect(fout.message).not.toMatch(/niet bereikbaar/i);
    expect(fout.message).toMatch(/onverwachte gegevens/i);
  });

  it("noemt een antwoord dat geen lijst is ook onverwachte gegevens", () => {
    const fout = toFetchError(
      (() => {
        try {
          parseAnimalList({ data: [] });
          throw new Error("had moeten falen");
        } catch (e) {
          return e;
        }
      })(),
    );
    expect(fout.code).toBe("invalid_response");
  });
});

describe("AnimalShelterShapeError", () => {
  it("noemt het dier waarop het misging, zodat het te vinden is", () => {
    try {
      parseAnimalList([{ id: 1908097, naam: "Bommel", properties: ["onbekende vorm"] }]);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toContain("1908097");
      expect((e as Error).message).toContain("Bommel");
    }
  });
});
