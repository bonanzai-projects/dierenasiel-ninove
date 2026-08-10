import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { SPECIES_LABELS } from "@/lib/constants";
import type { AdoptionContractReportRow } from "@/lib/queries/reports";

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
  colAnimal: { width: "16%" },
  colSpecies: { width: "10%" },
  colAdoptant: { width: "18%" },
  colDate: { width: "12%" },
  colAmount: { width: "10%" },
  colPayment: { width: "14%" },
  colDogidCatid: { width: "10%" },
  colNotes: { width: "10%" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  contracts: AdoptionContractReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function AdoptionContractsPdf({ contracts, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Overzicht adoptiecontracten</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {contracts.length}</Text>
        </View>

        {contracts.length === 0 ? (
          <Text style={styles.empty}>Geen adoptiecontracten gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colAnimal, styles.headerText]}>Dier</Text>
              <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
              <Text style={[styles.colAdoptant, styles.headerText]}>Adoptant</Text>
              <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
              <Text style={[styles.colAmount, styles.headerText]}>Bedrag</Text>
              <Text style={[styles.colPayment, styles.headerText]}>Betaalwijze</Text>
              <Text style={[styles.colDogidCatid, styles.headerText]}>DogID/CatID</Text>
              <Text style={[styles.colNotes, styles.headerText]}>Opmerkingen</Text>
            </View>
            {contracts.map((contract) => (
              <View key={contract.id} style={styles.tableRow}>
                <Text style={[styles.colAnimal, styles.cellText]}>{contract.animalName}</Text>
                <Text style={[styles.colSpecies, styles.cellText]}>{SPECIES_LABELS[contract.animalSpecies] ?? contract.animalSpecies}</Text>
                <Text style={[styles.colAdoptant, styles.cellText]}>{contract.candidateFirstName} {contract.candidateLastName}</Text>
                <Text style={[styles.colDate, styles.cellText]}>{contract.contractDate}</Text>
                <Text style={[styles.colAmount, styles.cellText]}>{contract.paymentAmount}</Text>
                <Text style={[styles.colPayment, styles.cellText]}>{contract.paymentMethod}</Text>
                <Text style={[styles.colDogidCatid, styles.cellText]}>{contract.dogidCatidTransferred ? "Ja" : "Nee"}</Text>
                <Text style={[styles.colNotes, styles.cellText]}>{contract.notes ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Rapport R3: Overzicht adoptiecontracten
        </Text>
      </Page>
    </Document>
  );
}
