import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { PDF_LETTERHEAD } from "@/lib/constants";
import { R6_COLUMNS, r6Row, type R6Key } from "@/lib/reports/adoptable-report";
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
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

/** Kolombreedtes (samen 100 %); kolommen en waarden komen uit `adoptable-report` (story 10.73). */
const BREEDTE: Record<R6Key, string> = {
  name: "15%",
  species: "8%",
  breed: "19%",
  gender: "9%",
  status: "11%",
  chip: "13%",
  intakeDate: "11%",
  intakeReason: "14%",
};

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
              {R6_COLUMNS.map((k) => (
                <Text key={k.key} style={[{ width: BREEDTE[k.key] }, styles.headerText]}>{k.label}</Text>
              ))}
            </View>
            {animals.map((animal) => {
              const rij = r6Row(animal);
              return (
                <View key={animal.id} style={styles.tableRow}>
                  {R6_COLUMNS.map((k) => (
                    <Text key={k.key} style={[{ width: BREEDTE[k.key] }, styles.cellText]}>{rij[k.key]}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>
          {PDF_LETTERHEAD.name} — Rapport R6: Te adopteren dieren
        </Text>
      </Page>
    </Document>
  );
}
