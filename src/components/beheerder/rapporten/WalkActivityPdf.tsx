import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import type { WalkActivityReportRow } from "@/lib/queries/reports";

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
  colDate: { width: "14%" },
  colWalker: { width: "18%" },
  colDog: { width: "14%" },
  colStart: { width: "10%" },
  colEnd: { width: "10%" },
  colDuration: { width: "10%" },
  colRemarks: { width: "24%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  walks: WalkActivityReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function WalkActivityPdf({ walks, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Wandelactiviteit</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {walks.length}</Text>
        </View>

        {walks.length === 0 ? (
          <Text style={styles.empty}>Geen wandelactiviteit gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
              <Text style={[styles.colWalker, styles.headerText]}>Wandelaar</Text>
              <Text style={[styles.colDog, styles.headerText]}>Hond</Text>
              <Text style={[styles.colStart, styles.headerText]}>Start</Text>
              <Text style={[styles.colEnd, styles.headerText]}>Einde</Text>
              <Text style={[styles.colDuration, styles.headerText]}>Duur (min)</Text>
              <Text style={[styles.colRemarks, styles.headerText]}>Opmerkingen</Text>
            </View>
            {walks.map((walk) => (
              <View key={walk.id} style={styles.tableRow}>
                <Text style={[styles.colDate, styles.cellText]}>{walk.date}</Text>
                <Text style={[styles.colWalker, styles.cellText]}>{walk.walkerFirstName} {walk.walkerLastName}</Text>
                <Text style={[styles.colDog, styles.cellText]}>{walk.animalName}</Text>
                <Text style={[styles.colStart, styles.cellText]}>{walk.startTime}</Text>
                <Text style={[styles.colEnd, styles.cellText]}>{walk.endTime ?? "-"}</Text>
                <Text style={[styles.colDuration, styles.cellText]}>{walk.durationMinutes != null ? String(walk.durationMinutes) : "-"}</Text>
                <Text style={[styles.colRemarks, styles.cellText]}>{walk.remarks ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Rapport R9: Wandelactiviteit
        </Text>
      </Page>
    </Document>
  );
}
