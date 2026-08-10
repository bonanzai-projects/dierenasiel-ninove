import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { PDF_LETTERHEAD, SPECIES_LABELS } from "@/lib/constants";
import type { VetVisitReportRow } from "@/lib/queries/reports";

const LOCATION_LABELS: Record<string, string> = {
  in_asiel: "In asiel",
  in_praktijk: "In praktijk",
};

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
  colAnimal: { width: "14%" },
  colSpecies: { width: "8%" },
  colDate: { width: "10%" },
  colLocation: { width: "10%" },
  colTodo: { width: "22%" },
  colComplaints: { width: "20%" },
  colStatus: { width: "8%" },
  colNotes: { width: "8%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  visits: VetVisitReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function VetVisitReportPdf({ visits, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>{PDF_LETTERHEAD.name}</Text>
          <Text style={styles.org}>{PDF_LETTERHEAD.address}</Text>
          <Text style={styles.title}>Dierenarts-bezoeken</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {visits.length}</Text>
        </View>

        {visits.length === 0 ? (
          <Text style={styles.empty}>Geen dierenarts-bezoeken gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colAnimal, styles.headerText]}>Dier</Text>
              <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
              <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
              <Text style={[styles.colLocation, styles.headerText]}>Locatie</Text>
              <Text style={[styles.colTodo, styles.headerText]}>To-do</Text>
              <Text style={[styles.colComplaints, styles.headerText]}>Klachten</Text>
              <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
              <Text style={[styles.colNotes, styles.headerText]}>Notities</Text>
            </View>
            {visits.map((visit) => (
              <View key={visit.id} style={styles.tableRow}>
                <Text style={[styles.colAnimal, styles.cellText]}>{visit.animalName}</Text>
                <Text style={[styles.colSpecies, styles.cellText]}>{SPECIES_LABELS[visit.animalSpecies] ?? visit.animalSpecies}</Text>
                <Text style={[styles.colDate, styles.cellText]}>{visit.date}</Text>
                <Text style={[styles.colLocation, styles.cellText]}>{LOCATION_LABELS[visit.location] ?? visit.location}</Text>
                <Text style={[styles.colTodo, styles.cellText]}>{visit.todo ?? "-"}</Text>
                <Text style={[styles.colComplaints, styles.cellText]}>{visit.complaints ?? "-"}</Text>
                <Text style={[styles.colStatus, styles.cellText]}>{visit.isCompleted ? "Voltooid" : "Open"}</Text>
                <Text style={[styles.colNotes, styles.cellText]}>{visit.notes ? "Ja" : "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          {PDF_LETTERHEAD.name} — Rapport R2: Dierenarts-bezoeken
        </Text>
      </Page>
    </Document>
  );
}
