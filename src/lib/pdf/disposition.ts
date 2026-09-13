/**
 * Story 10.71 — een PDF tonen in de browser (`inline`) of downloaden (`attachment`).
 * Standaard tonen; downloaden enkel op vraag, met `?download=1`. Zo komt er niet
 * vanzelf een kopie in de map Downloads (Sven, R11: "gezien beveiligen van gegevens").
 */
export function wantsPdfDownload(params: URLSearchParams): boolean {
  return params.get("download") === "1";
}

export function pdfContentDisposition(filename: string, download: boolean): string {
  return `${download ? "attachment" : "inline"}; filename="${filename}"`;
}

/** Hetzelfde adres, met `download=1` erbij — bestaande zoekparameters (datums) blijven staan. */
export function pdfDownloadUrl(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}
