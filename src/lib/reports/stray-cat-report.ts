import type { StrayCatCampaign } from "@/types";
import type { CampaignReportStats } from "@/lib/queries/stray-cat-campaigns";
import { CAMPAIGN_OUTCOME_LABELS, FIV_FELV_STATUS_LABELS } from "@/lib/constants";

/**
 * Eén bron voor rapport R14 — Zwerfkattenbeleid.
 *
 * Waarom apart? Het scherm en de PDF hadden elk hun eigen tabel. Story 10.18
 * herontwierp alleen de PDF, waardoor het scherm maandenlang zeven kolommen
 * toonde en de PDF er tien — en niemand die dat merkte tot Sven twee versies
 * naast elkaar legde. Kolommen, cellen en samenvatting staan daarom hier;
 * beide schermen renderen enkel nog.
 *
 * De CSV-export is bewust wél anders (dertien kolommen, alles apart): in een
 * rekenblad wil je op kooinummer kunnen sorteren, niet op een samengevoegd veld.
 */

export interface StrayCatReportColumn {
  key: string;
  label: string;
  /** Kolombreedte in de PDF. Samen 100%. */
  pdfWidth: string;
}

export const STRAY_CAT_REPORT_COLUMNS: StrayCatReportColumn[] = [
  { key: "date", label: "Datum", pdfWidth: "8%" },
  { key: "municipality", label: "Gemeente", pdfWidth: "10%" },
  { key: "address", label: "Adres", pdfWidth: "16%" },
  { key: "cage", label: "Kooi-uitzetting", pdfWidth: "12%" },
  { key: "inspection", label: "Inspectie", pdfWidth: "8%" },
  { key: "cat", label: "Kat (beschrijving)", pdfWidth: "13%" },
  { key: "vet", label: "Dierenarts", pdfWidth: "10%" },
  { key: "fivFelv", label: "FIV / FeLV", pdfWidth: "7%" },
  { key: "outcome", label: "Uitkomst", pdfWidth: "9%" },
  { key: "remarks", label: "Opm.", pdfWidth: "7%" },
];

export function fivFelvLabel(value: string | null): string {
  if (!value) return "-";
  return FIV_FELV_STATUS_LABELS[value as keyof typeof FIV_FELV_STATUS_LABELS] ?? value;
}

export function outcomeLabel(value: string | null): string {
  if (!value) return "-";
  return CAMPAIGN_OUTCOME_LABELS[value as keyof typeof CAMPAIGN_OUTCOME_LABELS] ?? value;
}

export function formatPeriod(dateFrom?: string, dateTo?: string): string {
  if (dateFrom && dateTo) return `${dateFrom} t/m ${dateTo}`;
  if (dateFrom) return `vanaf ${dateFrom}`;
  if (dateTo) return `tot ${dateTo}`;
  return "Alle periodes";
}

/**
 * Datum en nummers van de kooi-uitzetting in één veld.
 *
 * Na elke komma komt een spatie. Dat is niet enkel netter om te lezen: zonder
 * spatie is `#K1,K7,K12,K13,K18` voor de PDF één woord dat niet in de kolom
 * past, en dan breekt @react-pdf het middenin af — met een koppelteken, wat
 * eruitziet als "#-" gevolgd door de rest. Met spaties valt de reeks netjes
 * uiteen op de komma's.
 */
export function cageInfo(campaign: StrayCatCampaign): string {
  const parts: string[] = [];
  if (campaign.cageDeploymentDate) parts.push(campaign.cageDeploymentDate);
  if (campaign.cageNumbers) {
    const numbers = campaign.cageNumbers
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .join(", ");
    if (numbers) parts.push(`#${numbers}`);
  }
  return parts.length > 0 ? parts.join(" ") : "-";
}

/** Twee regels: FIV boven, FeLV onder. */
export function fivFelvInfo(campaign: StrayCatCampaign): string {
  return `FIV: ${fivFelvLabel(campaign.fivStatus)}\nFeLV: ${fivFelvLabel(campaign.felvStatus)}`;
}

export type StrayCatReportRow = Record<string, string>;

export function strayCatReportRow(campaign: StrayCatCampaign): StrayCatReportRow {
  return {
    date: campaign.requestDate ?? "-",
    municipality: campaign.municipality ?? "-",
    address: campaign.address ?? "-",
    cage: cageInfo(campaign),
    inspection: campaign.inspectionDate ?? "-",
    cat: campaign.catDescription ?? "-",
    vet: campaign.vetName ?? "-",
    fivFelv: fivFelvInfo(campaign),
    outcome: outcomeLabel(campaign.outcome),
    remarks: campaign.remarks ?? "-",
  };
}

export interface SummaryTile {
  key: string;
  label: string;
  value: string;
}

/**
 * De tegels boven de tabel. De uitkomsten worden **niet** afgekapt: de PDF
 * toonde er hoogstens drie (`slice(0, 3)`), wat vandaag toevallig klopt omdat
 * er precies drie uitkomsten bestaan — maar een vierde zou stil wegvallen.
 */
export function strayCatSummaryTiles(stats: CampaignReportStats): SummaryTile[] {
  return [
    { key: "total", label: "Totaal", value: String(stats.total) },
    { key: "completed", label: "Afgerond", value: String(stats.completedCampaigns) },
    {
      key: "fiv",
      label: "FIV positief",
      value: `${stats.fivPositive} (${stats.fivPercentage}%)`,
    },
    {
      key: "felv",
      label: "FeLV positief",
      value: `${stats.felvPositive} (${stats.felvPercentage}%)`,
    },
    ...Object.entries(stats.outcomes).map(([key, count]) => ({
      key: `outcome-${key}`,
      label: outcomeLabel(key),
      value: String(count),
    })),
  ];
}
