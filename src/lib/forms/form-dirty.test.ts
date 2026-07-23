import { describe, it, expect } from "vitest";
import { snapshotEntries, isFormDirty } from "./form-dirty";

function fd(entries: [string, string][]): FormData {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
}

describe("snapshotEntries", () => {
  it("bundelt waarden per veldnaam", () => {
    const snapshot = snapshotEntries(fd([["name", "Rex"], ["gender", "reu"]]));
    expect(snapshot).toEqual({ name: ["Rex"], gender: ["reu"] });
  });

  it("houdt meervoudige waarden voor dezelfde naam bij (hidden + checkbox)", () => {
    const snapshot = snapshotEntries(fd([["isOnWebsite", "false"], ["isOnWebsite", "true"]]));
    expect(snapshot).toEqual({ isOnWebsite: ["false", "true"] });
  });

  it("geeft een leeg object voor een leeg formulier", () => {
    expect(snapshotEntries(fd([]))).toEqual({});
  });
});

describe("isFormDirty", () => {
  it("is niet gewijzigd wanneer beide toestanden gelijk zijn", () => {
    const a = snapshotEntries(fd([["name", "Rex"], ["gender", "reu"]]));
    const b = snapshotEntries(fd([["name", "Rex"], ["gender", "reu"]]));
    expect(isFormDirty(a, b)).toBe(false);
  });

  it("is gewijzigd bij een andere waarde", () => {
    const a = snapshotEntries(fd([["name", "Rex"]]));
    const b = snapshotEntries(fd([["name", "Rexje"]]));
    expect(isFormDirty(a, b)).toBe(true);
  });

  it("is NIET gewijzigd wanneer een wijziging weer ongedaan gemaakt is", () => {
    const start = snapshotEntries(fd([["name", "Rex"]]));
    const typed = snapshotEntries(fd([["name", "Rexje"]]));
    const undone = snapshotEntries(fd([["name", "Rex"]]));
    expect(isFormDirty(start, typed)).toBe(true);
    expect(isFormDirty(start, undone)).toBe(false);
  });

  it("merkt een aangevinkte checkbox op (extra waarde bij dezelfde naam)", () => {
    const before = snapshotEntries(fd([["isOnPoster", "false"]]));
    const after = snapshotEntries(fd([["isOnPoster", "false"], ["isOnPoster", "true"]]));
    expect(isFormDirty(before, after)).toBe(true);
  });

  it("merkt een uitgevinkte checkbox op", () => {
    const before = snapshotEntries(fd([["isOnPoster", "false"], ["isOnPoster", "true"]]));
    const after = snapshotEntries(fd([["isOnPoster", "false"]]));
    expect(isFormDirty(before, after)).toBe(true);
  });

  it("merkt een toegevoegd of verdwenen veld op", () => {
    const before = snapshotEntries(fd([["name", "Rex"]]));
    const after = snapshotEntries(fd([["name", "Rex"], ["breed", "Stafford"]]));
    expect(isFormDirty(before, after)).toBe(true);
    expect(isFormDirty(after, before)).toBe(true);
  });

  it("negeert de volgorde van de velden onderling", () => {
    const a = snapshotEntries(fd([["name", "Rex"], ["breed", "Stafford"]]));
    const b = snapshotEntries(fd([["breed", "Stafford"], ["name", "Rex"]]));
    expect(isFormDirty(a, b)).toBe(false);
  });

  it("is niet gewijzigd zolang er nog geen begintoestand is", () => {
    // Vóór de eerste meting mag er nooit een waarschuwing verschijnen.
    expect(isFormDirty(null, snapshotEntries(fd([["name", "Rex"]])))).toBe(false);
  });
});
