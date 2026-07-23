import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hasUnsavedChanges,
  setUnsavedChanges,
  subscribeUnsavedChanges,
  resetUnsavedChanges,
} from "./unsaved-changes";

describe("unsaved-changes store", () => {
  beforeEach(() => {
    resetUnsavedChanges();
  });

  it("start zonder openstaande wijzigingen", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("houdt bij dat een formulier gewijzigd is", () => {
    setUnsavedChanges("dier-form", true);
    expect(hasUnsavedChanges()).toBe(true);

    setUnsavedChanges("dier-form", false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("blijft 'gewijzigd' zolang minstens één formulier openstaat", () => {
    setUnsavedChanges("form-a", true);
    setUnsavedChanges("form-b", true);

    setUnsavedChanges("form-a", false);
    expect(hasUnsavedChanges()).toBe(true);

    setUnsavedChanges("form-b", false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("verwittigt abonnees bij een wijziging van de toestand", () => {
    const listener = vi.fn();
    subscribeUnsavedChanges(listener);

    setUnsavedChanges("dier-form", true);
    expect(listener).toHaveBeenCalledWith(true);

    setUnsavedChanges("dier-form", false);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it("verwittigt niet opnieuw wanneer de toestand niet verandert", () => {
    const listener = vi.fn();
    subscribeUnsavedChanges(listener);

    setUnsavedChanges("dier-form", true);
    setUnsavedChanges("dier-form", true);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stopt met verwittigen na afmelden", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeUnsavedChanges(listener);
    unsubscribe();

    setUnsavedChanges("dier-form", true);

    expect(listener).not.toHaveBeenCalled();
  });
});
