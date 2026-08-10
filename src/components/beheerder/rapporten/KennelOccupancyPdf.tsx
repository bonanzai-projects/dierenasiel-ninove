import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import type { KennelOccupancyReportRow } from "@/lib/queries/reports";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, textAlign: "center" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  org: { fontSize: 9, color: "#666", marginBottom: 2 },
  meta: { marginBottom: 12, paddingBottom: 8, borderBottom: "1 solid #ccc" },
  metaText: { fontSize: 9, color: "#555" },
  table: { marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "0.5 solid #ccc", paddingVertical: 4, paddingHorizontal: 6 },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 3, paddingHorizontal: 6 },
  headerText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151" },
  cellText: { fontSize: 8 },
  colCode: { width: "15%" },
  colZone: { width: "15%" },
  colCapacity: { width: "15%" },
  colOccupied: { width: "15%" },
  colFree: { width: "15%" },
  colRate: { width: "25%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  kennels: KennelOccupancyReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function KennelOccupancyPdf({ kennels, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Kennelbezetting</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {kennels.length}</Text>
        </View>

        {kennels.length === 0 ? (
          <Text style={styles.empty}>Geen kennels gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colCode, styles.headerText]}>Code</Text>
              <Text style={[styles.colZone, styles.headerText]}>Zone</Text>
              <Text style={[styles.colCapacity, styles.headerText]}>Capaciteit</Text>
              <Text style={[styles.colOccupied, styles.headerText]}>Bezet</Text>
              <Text style={[styles.colFree, styles.headerText]}>Vrij</Text>
              <Text style={[styles.colRate, styles.headerText]}>Bezettingsgraad</Text>
            </View>
            {kennels.map((kennel) => (
              <View key={kennel.kennelId} style={styles.tableRow}>
                <Text style={[styles.colCode, styles.cellText]}>{kennel.code}</Text>
                <Text style={[styles.colZone, styles.cellText]}>{kennel.zone}</Text>
                <Text style={[styles.colCapacity, styles.cellText]}>{kennel.capacity}</Text>
                <Text style={[styles.colOccupied, styles.cellText]}>{kennel.count}</Text>
                <Text style={[styles.colFree, styles.cellText]}>{kennel.capacity - kennel.count}</Text>
                <Text style={[styles.colRate, styles.cellText]}>
                  {kennel.capacity === 0 ? "0%" : Math.round((kennel.count / kennel.capacity) * 100) + "%"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Rapport R8: Kennelbezetting
        </Text>
      </Page>
    </Document>
  );
}
