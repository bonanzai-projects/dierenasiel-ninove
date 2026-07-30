const BRUSSEL = "Europe/Brussels";

/** "30/07/2026 om 21:00" — altijd in Belgische tijd, ook op een server in UTC. */
export function formatBackupMoment(moment: Date | string): string {
  const datum = typeof moment === "string" ? new Date(moment) : moment;

  const dag = new Intl.DateTimeFormat("nl-BE", {
    timeZone: BRUSSEL,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(datum);

  const uur = new Intl.DateTimeFormat("nl-BE", {
    timeZone: BRUSSEL,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(datum);

  return `${dag} om ${uur}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Een lege naam wordt het moment zelf, zodat elke bewaring herkenbaar blijft. */
export function defaultBackupLabel(label: string, moment: Date): string {
  const opgeschoond = label.trim();
  return opgeschoond || `Bewaard op ${formatBackupMoment(moment)}`;
}
