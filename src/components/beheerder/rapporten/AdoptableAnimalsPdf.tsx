import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { GENDER_LABELS, PDF_LETTERHEAD, SPECIES_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { Animal } from "@/types";

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
  colName: { width: "16%" },
  colSpecies: { width: "10%" },
  colBreed: { width: "16%" },
  colGender: { width: "10%" },
  colStatus: { width: "12%" },
  colChip: { width: "16%" },
  colIntake: { width: "12%" },
  colDescription: { width: "8%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  animals: Animal[];
  filters?: string;
  generatedAt: string;
}

export default function AdoptableAnimalsPdf({ animals, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>{PDF_LETTERHEAD.name}</Text>
          <Text style={styles.org}>{PDF_LETTERHEAD.address}</Text>
          <Text style={styles.title}>Te adopteren dieren</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {animals.length}</Text>
        </View>

        {animals.length === 0 ? (
          <Text style={styles.empty}>Geen te adopteren dieren gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colName, styles.headerText]}>Naam</Text>
              <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
              <Text style={[styles.colBreed, styles.headerText]}>Ras</Text>
              <Text style={[styles.colGender, styles.headerText]}>Geslacht</Text>
              <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
              <Text style={[styles.colChip, styles.headerText]}>Chipnr</Text>
              <Text style={[styles.colIntake, styles.headerText]}>Intake</Text>
              <Text style={[styles.colDescription, styles.headerText]}>Beschrijving</Text>
            </View>
            {animals.map((animal) => (
              <View key={animal.id} style={styles.tableRow}>
                <Text style={[styles.colName, styles.cellText]}>{animal.name}</Text>
                <Text style={[styles.colSpecies, styles.cellText]}>{SPECIES_LABELS[animal.species] ?? animal.species}</Text>
                <Text style={[styles.colBreed, styles.cellText]}>{animal.breed ?? "-"}</Text>
                <Text style={[styles.colGender, styles.cellText]}>{GENDER_LABELS[animal.gender] ?? animal.gender}</Text>
                <Text style={[styles.colStatus, styles.cellText]}>{STATUS_LABELS[animal.status ?? ""] ?? animal.status}</Text>
                <Text style={[styles.colChip, styles.cellText]}>{animal.identificationNr ?? "-"}</Text>
                <Text style={[styles.colIntake, styles.cellText]}>{animal.intakeDate ?? "-"}</Text>
                <Text style={[styles.colDescription, styles.cellText]}>{animal.shortDescription ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          {PDF_LETTERHEAD.name} — Rapport R6: Te adopteren dieren
        </Text>
      </Page>
    </Document>
  );
}
