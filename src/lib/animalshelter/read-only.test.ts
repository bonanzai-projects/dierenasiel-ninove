import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as animalShelterHttp from "./http";
import { isReadPath } from "./paths";

/**
 * Story 11.1 — laag 2 van de read-only garantie (Epic 11, koerswijziging §3.1).
 *
 * Deze test kijkt naar de broncode zélf. Hij bestaat omdat een afspraak of een
 * code-review te zwak is voor wat het bestuur van het asiel gevraagd heeft: het
 * moet onmogelijk zijn dat deze applicatie ooit naar AnimalShelter schrijft, ook
 * over een jaar, ook door iemand die dit document nooit gelezen heeft.
 *
 * Wie hier rood op krijgt, heeft niet "een test stuk gemaakt" maar een
 * architecturale afspraak overtreden. De juiste reactie is de wijziging
 * terugdraaien, niet de test aanpassen.
 */

const SRC = path.join(process.cwd(), "src");
const HOST_FRAGMENT = "api.animalshelter.be";
const INTEGRATION_DIR = path.join(SRC, "lib", "animalshelter");
const CHOKEPOINT = path.join(INTEGRATION_DIR, "http.ts");
const WRITE_METHODS = /method\s*:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/g;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue; // tests mogen erover praten
    out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(SRC, file).replace(/\\/g, "/");

describe("read-only garantie — afgedwongen op de broncode", () => {
  it("alleen http.ts mag de hostnaam van AnimalShelter kennen", () => {
    const overtreders = sourceFiles(SRC)
      .filter((file) => file !== CHOKEPOINT)
      .filter((file) => fs.readFileSync(file, "utf8").includes(HOST_FRAGMENT))
      .map(rel);

    expect(overtreders).toEqual([]);
  });

  it("alleen http.ts mag fetch gebruiken binnen de integratie", () => {
    const overtreders = sourceFiles(INTEGRATION_DIR)
      .filter((file) => file !== CHOKEPOINT)
      .filter((file) => /\bfetch\s*\(/.test(fs.readFileSync(file, "utf8")))
      .map(rel);

    expect(overtreders).toEqual([]);
  });

  it("er staat precies één schrijfmethode in de integratie, en dat is de tokenoproep", () => {
    const treffers: { file: string; line: number; method: string; context: string }[] = [];

    for (const file of sourceFiles(INTEGRATION_DIR)) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(WRITE_METHODS)) {
          treffers.push({
            file: rel(file),
            line: index + 1,
            method: match[1],
            context: lines.slice(Math.max(0, index - 3), index + 1).join("\n"),
          });
        }
      });
    }

    expect(treffers).toHaveLength(1);
    expect(treffers[0].file).toBe("lib/animalshelter/http.ts");
    expect(treffers[0].method).toBe("POST");
    // De enige POST hoort bij het ophalen van het bearer-token, nergens anders bij.
    expect(treffers[0].context).toContain("TOKEN_PATH");
  });

  it("de leesfunctie neemt geen methode en geen body aan", () => {
    // Eén argument: het pad. Wie een methode of body wil meegeven, kan dat niet.
    expect(animalShelterHttp.readFromAnimalShelter.length).toBe(1);

    const bron = fs.readFileSync(CHOKEPOINT, "utf8");
    expect(bron).toContain('method: "GET"');
    // De leesoproep bouwt nergens een body op.
    const leesDeel = bron.slice(bron.indexOf("async function sendRead"));
    expect(leesDeel).not.toContain("body");
  });

  it("de integratie exporteert geen enkele functie die naar schrijven ruikt", () => {
    const verdacht = /^(write|update|post|push|send|sync|create|delete|save)/i;
    const geëxporteerd: string[] = [];

    for (const file of sourceFiles(INTEGRATION_DIR)) {
      const bron = fs.readFileSync(file, "utf8");
      for (const match of bron.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
        geëxporteerd.push(match[1]);
      }
    }

    expect(geëxporteerd.length).toBeGreaterThan(0);
    expect(geëxporteerd.filter((naam) => verdacht.test(naam))).toEqual([]);
  });

  it("de allowlist bevat geen enkel pad dat verder gaat dan de vier leesendpoints", () => {
    const verboden = [
      "/animal/1/edit",
      "/animal/1/update",
      "/animal",
      "/animals",
      "/category",
      "/oauth/token",
      "/shelter/1",
    ];
    for (const pad of verboden) {
      expect(isReadPath(pad), `${pad} zou geweigerd moeten worden`).toBe(false);
    }
  });
});
