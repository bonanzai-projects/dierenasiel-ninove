import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { PDF_LETTERHEAD } from "@/lib/constants";
import type { VetInspectionReport, TreatedAnimalEntry, EuthanizedAnimalEntry, AbnormalBehaviorEntry } from "@/types";

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
  colDate: { width: "12%" },
  colVet: { width: "16%" },
  colTreated: { width: "8%" },
  colEuthanized: { width: "10%" },
  colBehavior: { width: "10%" },
  colRecommendations: { width: "34%" },
  colSigned: { width: "10%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  legalNote: { fontSize: 7, color: "#999", marginTop: 8, fontStyle: "italic" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  reports: VetInspectionReport[];
  filters?: string;
  generatedAt: string;
}

export default function InspectionListPdf({ reports, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>{PDF_LETTERHEAD.name}</Text>
          <Text style={styles.org}>{PDF_LETTERHEAD.address}</Text>
          <Text style={styles.title}>Bezoekrapporten contractdierenarts</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal rapporten: {reports.length}</Text>
        </View>

        {reports.length === 0 ? (
          <Text style={styles.empty}>Geen bezoekrapporten gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
              <Text style={[styles.colVet, styles.headerText]}>Dierenarts</Text>
              <Text style={[styles.colTreated, styles.headerText]}>Behandeld</Text>
              <Text style={[styles.colEuthanized, styles.headerText]}>Euthanasie</Text>
              <Text style={[styles.colBehavior, styles.headerText]}>Gedrag</Text>
              <Text style={[styles.colRecommendations, styles.headerText]}>Aanbevelingen</Text>
              <Text style={[styles.colSigned, styles.headerText]}>Getekend</Text>
            </View>
            {reports.map((report) => {
              const treated = (report.animalsTreated ?? []) as TreatedAnimalEntry[];
              const euthanized = (report.animalsEuthanized ?? []) as EuthanizedAnimalEntry[];
              const behavior = (report.abnormalBehavior ?? []) as AbnormalBehaviorEntry[];
              return (
                <View key={report.id} style={styles.tableRow}>
                  <Text style={[styles.colDate, styles.cellText]}>{report.visitDate}</Text>
                  <Text style={[styles.colVet, styles.cellText]}>{report.vetName}</Text>
                  <Text style={[styles.colTreated, styles.cellText]}>{treated.length}</Text>
                  <Text style={[styles.colEuthanized, styles.cellText]}>{euthanized.length}</Text>
                  <Text style={[styles.colBehavior, styles.cellText]}>{behavior.length}</Text>
                  <Text style={[styles.colRecommendations, styles.cellText]}>{report.recommendations ?? "-"}</Text>
                  <Text style={[styles.colSigned, styles.cellText]}>{report.vetSignature ? "Ja" : "Nee"}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.legalNote}>
          Conform KB 27/04/2007 — Contractdierenarts bezoekt het asiel minstens 1x per maand. Rapporten worden minimaal 2 jaar bewaard.
        </Text>

        <Text style={styles.footer}>
          {PDF_LETTERHEAD.name} — Rapport R11: Bezoekrapporten contractdierenarts
        </Text>
      </Page>
    </Document>
  );
}
