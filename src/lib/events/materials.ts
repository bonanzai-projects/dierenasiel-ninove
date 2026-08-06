/**
 * Epic 13, story 13.11 — de materiaallijst.
 *
 * Sven, vraag 9 (2026-08-06): *"Materiaallijst is zeker ok maar met een mogelijkheid tot
 * uitbreiden, kunnen aangeven van waar materiaal komt (leverancier)."*
 *
 * De herkomst is meer dan een etiket: wat geleend of gehuurd is, moet ook terug.
 * Dat is precies wat na een eetfestijn blijft liggen.
 *
 * Pure logica, geen database.
 */

export interface MaterialOrigin {
  key: string;
  label: string;
  /** Moet dit na afloop terug naar wie het gaf? */
  terug: boolean;
}

export const MATERIAL_ORIGINS: readonly MaterialOrigin[] = [
  { key: "eigen", label: "Eigen voorraad", terug: false },
  { key: "geleend", label: "Geleend", terug: true },
  { key: "gehuurd", label: "Gehuurd", terug: true },
  { key: "gekocht", label: "Gekocht", terug: false },
] as const;

export const MATERIAL_ORIGIN_KEYS = MATERIAL_ORIGINS.map((o) => o.key);

export function originLabel(key: string): string {
  return MATERIAL_ORIGINS.find((o) => o.key === key)?.label ?? key;
}

export function needsReturn(origin: string): boolean {
  return MATERIAL_ORIGINS.find((o) => o.key === origin)?.terug ?? false;
}

export interface Material {
  id: number;
  name: string;
  quantity: number | null;
  origin: string;
  supplier: string | null;
  arranged: boolean;
  returned: boolean;
  sortOrder: number;
}

/** "12 × Tafels (Chiro Ninove)" — ook gebruikt op het afgedrukte draaiboek. */
export function materialLine(m: Pick<Material, "name" | "quantity" | "supplier">): string {
  const kop = m.quantity ? `${m.quantity} × ${m.name}` : m.name;
  return m.supplier ? `${kop} (${m.supplier})` : kop;
}

export function sortMaterials<T extends { sortOrder: number; id: number }>(
  materials: readonly T[],
): T[] {
  return [...materials].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/**
 * Twee getallen die ertoe doen: wat moet er nog geregeld worden vooraf, en wat moet
 * er nadien nog terug. Eigen voorraad telt nooit mee bij dat laatste.
 */
export function materialSummary(
  materials: readonly Pick<Material, "origin" | "arranged" | "returned">[],
): { totaal: number; teRegelen: number; terugTeBrengen: number } {
  return {
    totaal: materials.length,
    teRegelen: materials.filter((m) => !m.arranged).length,
    terugTeBrengen: materials.filter((m) => needsReturn(m.origin) && !m.returned).length,
  };
}
