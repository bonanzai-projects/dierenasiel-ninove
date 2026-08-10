import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { SPECIES_LABELS } from "@/lib/constants";
import type { MedicationReportRow } from "@/lib/queries/reports";

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
  colMedication: { width: "18%" },
  colDosage: { width: "16%" },
  colStart: { width: "10%" },
  colEnd: { width: "10%" },
  colStatus: { width: "8%" },
  colNotes: { width: "16%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  medications: MedicationReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function MedicationReportPdf({ medications, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Medicatie-opvolging</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {medications.length}</Text>
        </View>

        {medications.length === 0 ? (
          <Text style={styles.empty}>Geen medicaties gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colAnimal, styles.headerText]}>Dier</Text>
              <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
              <Text style={[styles.colMedication, styles.headerText]}>Medicatie</Text>
              <Text style={[styles.colDosage, styles.headerText]}>Dosering</Text>
              <Text style={[styles.colStart, styles.headerText]}>Start</Text>
              <Text style={[styles.colEnd, styles.headerText]}>Eind</Text>
              <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
              <Text style={[styles.colNotes, styles.headerText]}>Opmerkingen</Text>
            </View>
            {medications.map((med) => (
              <View key={med.id} style={styles.tableRow}>
                <Text style={[styles.colAnimal, styles.cellText]}>{med.animalName}</Text>
                <Text style={[styles.colSpecies, styles.cellText]}>{SPECIES_LABELS[med.animalSpecies] ?? med.animalSpecies}</Text>
                <Text style={[styles.colMedication, styles.cellText]}>{med.medicationName}</Text>
                <Text style={[styles.colDosage, styles.cellText]}>{med.dosage}</Text>
                <Text style={[styles.colStart, styles.cellText]}>{med.startDate}</Text>
                <Text style={[styles.colEnd, styles.cellText]}>{med.endDate ?? "-"}</Text>
                <Text style={[styles.colStatus, styles.cellText]}>{med.isActive ? "Actief" : "Afgerond"}</Text>
                <Text style={[styles.colNotes, styles.cellText]}>{med.notes ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Rapport R5: Medicatie-opvolging
        </Text>
      </Page>
    </Document>
  );
}
