import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { PDF_LETTERHEAD } from "@/lib/constants";
import type { StrayCatCampaign } from "@/types";
import type { CampaignReportStats } from "@/lib/queries/stray-cat-campaigns";
import {
  STRAY_CAT_REPORT_COLUMNS,
  formatPeriod,
  strayCatReportRow,
  strayCatSummaryTiles,
} from "@/lib/reports/stray-cat-report";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  headerLeft: { flex: 1, paddingRight: 12 },
  headerRight: { width: 80, alignItems: "flex-end" },
  org: { fontSize: 9, color: "#666" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1b4332", marginTop: 4 },
  subtitle: { fontSize: 11, color: "#1b4332", marginTop: 2 },
  logo: { width: 75, height: 75, objectFit: "contain" },
  meta: { marginBottom: 10, paddingBottom: 6, borderBottom: "1 solid #ccc" },
  metaText: { fontSize: 8, color: "#555" },
  statsRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  statCard: { flex: 1, padding: 6, backgroundColor: "#f9fafb", borderRadius: 3, border: "0.5 solid #e5e7eb" },
  statLabel: { fontSize: 6, color: "#6b7280", textTransform: "uppercase" },
  statValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1b4332", marginTop: 2 },
  table: { marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "0.5 solid #ccc", paddingVertical: 4, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 3, paddingHorizontal: 4 },
  headerText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#374151" },
  cellText: { fontSize: 7 },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, textAlign: "center", fontSize: 7, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  campaigns: StrayCatCampaign[];
  stats: CampaignReportStats;
  municipality?: string;
  dateFrom?: string;
  dateTo?: string;
  logoUrl?: string;
  generatedAt: string;
}

export default function StrayCatCampaignsPdf({
  campaigns,
  stats,
  municipality,
  dateFrom,
  dateTo,
  logoUrl,
  generatedAt,
}: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.org}>{PDF_LETTERHEAD.name}</Text>
            <Text style={styles.org}>{PDF_LETTERHEAD.address}</Text>
            <Text style={styles.title}>Zwerfkattenbeleid</Text>
            <Text style={styles.subtitle}>
              {municipality ? `Gemeente: ${municipality}` : "Alle gemeentes"}
              {"  ·  "}Periode: {formatPeriod(dateFrom, dateTo)}
            </Text>
          </View>
          {logoUrl && (
            <View style={styles.headerRight}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={logoUrl} style={styles.logo} />
            </View>
          )}
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          <Text style={styles.metaText}>Aantal campagnes: {stats.total}</Text>
        </View>

        {/* Compacte samenvatting */}
        <View style={styles.statsRow}>
          {strayCatSummaryTiles(stats).map((tile) => (
            <View key={tile.key} style={styles.statCard}>
              <Text style={styles.statLabel}>{tile.label}</Text>
              <Text style={styles.statValue}>{tile.value}</Text>
            </View>
          ))}
        </View>

        {/* Detail tabel — log per campagne */}
        {campaigns.length === 0 ? (
          <Text style={styles.empty}>Geen campagnes gevonden voor deze filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {STRAY_CAT_REPORT_COLUMNS.map((column) => (
                <Text
                  key={column.key}
                  style={[{ width: column.pdfWidth }, styles.headerText]}
                >
                  {column.label}
                </Text>
              ))}
            </View>
            {campaigns.map((campaign) => {
              const row = strayCatReportRow(campaign);
              return (
                <View key={campaign.id} style={styles.tableRow}>
                  {STRAY_CAT_REPORT_COLUMNS.map((column) => (
                    <Text
                      key={column.key}
                      style={[{ width: column.pdfWidth }, styles.cellText]}
                    >
                      {row[column.key]}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>
          {PDF_LETTERHEAD.name} — Zwerfkattenbeleid
        </Text>
      </Page>
    </Document>
  );
}
