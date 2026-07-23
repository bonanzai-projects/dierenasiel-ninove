/**
 * Story 10.33 — detecteren of een formulier openstaande wijzigingen heeft.
 *
 * We vergelijken de volledige inhoud met de begintoestand i.p.v. "er is ooit
 * getypt" bij te houden: wie een wijziging weer ongedaan maakt, mag geen
 * waarschuwing meer krijgen.
 */

export type FormSnapshot = Record<string, string[]>;

/** FormData → waarden gebundeld per veldnaam (volgorde binnen één naam telt). */
export function snapshotEntries(formData: FormData): FormSnapshot {
  const snapshot: FormSnapshot = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue; // bestanden vergelijken we niet
    (snapshot[key] ??= []).push(value);
  }
  return snapshot;
}

/** Snapshot van een echt formulier-element. */
export function snapshotForm(form: HTMLFormElement): FormSnapshot {
  return snapshotEntries(new FormData(form));
}

/**
 * Verschilt de huidige toestand van de begintoestand?
 * Zonder begintoestand (nog niet gemeten) nooit "gewijzigd".
 */
export function isFormDirty(
  initial: FormSnapshot | null | undefined,
  current: FormSnapshot,
): boolean {
  if (!initial) return false;

  const keys = new Set([...Object.keys(initial), ...Object.keys(current)]);
  for (const key of keys) {
    const before = initial[key] ?? [];
    const after = current[key] ?? [];
    if (before.length !== after.length) return true;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) return true;
    }
  }
  return false;
}
