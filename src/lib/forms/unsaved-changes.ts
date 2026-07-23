/**
 * Story 10.33 — welke formulieren hebben openstaande wijzigingen?
 *
 * Het bewerkformulier en de tabbladen staan in verschillende componenten zonder
 * gemeenschappelijke ouder die state kan doorgeven. Deze kleine store overbrugt
 * dat: een formulier meldt zich aan/af, de tabs vragen het op vóór ze wisselen.
 */

type Listener = (dirty: boolean) => void;

const dirtyForms = new Set<string>();
const listeners = new Set<Listener>();

/** Staat er érgens nog een wijziging open? */
export function hasUnsavedChanges(): boolean {
  return dirtyForms.size > 0;
}

/** Meldt de toestand van één formulier. Verwittigt enkel bij een echte omslag. */
export function setUnsavedChanges(formId: string, dirty: boolean): void {
  const before = hasUnsavedChanges();

  if (dirty) {
    dirtyForms.add(formId);
  } else {
    dirtyForms.delete(formId);
  }

  const after = hasUnsavedChanges();
  if (before !== after) {
    for (const listener of listeners) listener(after);
  }
}

export function subscribeUnsavedChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Enkel voor tests en voor het opruimen bij unmount. */
export function resetUnsavedChanges(): void {
  dirtyForms.clear();
  listeners.clear();
}
