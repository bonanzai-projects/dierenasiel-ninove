import { describe, it, expect } from "vitest";
import { formatBackupMoment, formatBytes, defaultBackupLabel } from "./format";

describe("formatBackupMoment", () => {
  it("toont datum en uur in Belgische tijd", () => {
    // 19:00 UTC in de zomer = 21:00 in Brussel
    expect(formatBackupMoment(new Date("2026-07-30T19:00:00.000Z"))).toBe(
      "30/07/2026 om 21:00",
    );
  });

  it("houdt rekening met de winteruur-verschuiving", () => {
    expect(formatBackupMoment(new Date("2026-01-15T19:00:00.000Z"))).toBe(
      "15/01/2026 om 20:00",
    );
  });
});

describe("formatBytes", () => {
  it("toont kleine bestanden in kB", () => {
    expect(formatBytes(151_000)).toBe("147 kB");
  });

  it("toont grote bestanden in MB met één cijfer na de komma", () => {
    expect(formatBytes(1_600_000)).toBe("1,5 MB");
  });

  it("toont heel kleine bestanden in bytes", () => {
    expect(formatBytes(512)).toBe("512 bytes");
  });
});

describe("defaultBackupLabel", () => {
  it("gebruikt het moment als er geen naam gegeven is", () => {
    expect(defaultBackupLabel("", new Date("2026-07-30T19:00:00.000Z"))).toBe(
      "Bewaard op 30/07/2026 om 21:00",
    );
  });

  it("houdt een zelfgekozen naam", () => {
    expect(defaultBackupLabel("  Voor de import  ", new Date())).toBe("Voor de import");
  });
});
