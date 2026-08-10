import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import type { VetInspectionReport, TreatedAnimalEntry, EuthanizedAnimalEntry, AbnormalBehaviorEntry } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, textAlign: "center" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#333" },
  org: { fontSize: 9, color: "#666", marginBottom: 2 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, paddingBottom: 8, borderBottom: "1 solid #ccc" },
  metaItem: { fontSize: 10 },
  metaLabel: { fontFamily: "Helvetica-Bold", color: "#555" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#1b4332", borderBottom: "0.5 solid #1b4332", paddingBottom: 3 },
  table: { marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "0.5 solid #ccc", paddingVertical: 4, paddingHorizontal: 6 },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 3, paddingHorizontal: 6 },
  colName: { width: "20%", fontSize: 9 },
  colSpecies: { width: "12%", fontSize: 9 },
  colChip: { width: "18%", fontSize: 9 },
  colWide: { width: "25%", fontSize: 9 },
  colReason: { width: "50%", fontSize: 9 },
  headerText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
  recommendations: { fontSize: 10, lineHeight: 1.5, marginTop: 4, padding: 8, backgroundColor: "#f9fafb", borderRadius: 2 },
  signature: { marginTop: 20, paddingTop: 12, borderTop: "1 solid #ccc" },
  signatureStatus: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  signatureDate: { fontSize: 9, color: "#666", marginTop: 2 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 4 },
});

interface Props {
  report: VetInspectionReport;
}

export default function InspectionReportPdf({ report }: Props) {
  const treated = (report.animalsTreated ?? []) as TreatedAnimalEntry[];
  const euthanized = (report.animalsEuthanized ?? []) as EuthanizedAnimalEntry[];
  const abnormal = (report.abnormalBehavior ?? []) as AbnormalBehaviorEntry[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Bezoekrapport Contractdierenarts</Text>
          <Text style={styles.subtitle}>KB 27 april 2007 — Maandelijkse inspectie</Text>
        </View>

        <View style={styles.meta}>
          <View>
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Bezoekdatum: </Text>
              {report.visitDate}
            </Text>
          </View>
          <View>
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Dierenarts: </Text>
              {report.vetName}
            </Text>
          </View>
        </View>

        {/* Behandelde dieren */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Behandelde dieren</Text>
          {treated.length === 0 ? (
            <Text style={styles.empty}>Geen behandelde dieren geregistreerd.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colName, styles.headerText]}>Naam</Text>
                <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
                <Text style={[styles.colChip, styles.headerText]}>Chipnr</Text>
                <Text style={[styles.colWide, styles.headerText]}>Diagnose</Text>
                <Text style={[styles.colWide, styles.headerText]}>Behandeling</Text>
              </View>
              {treated.map((entry, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colName}>{entry.animalName}</Text>
                  <Text style={styles.colSpecies}>{entry.species}</Text>
                  <Text style={styles.colChip}>{entry.chipNr || "-"}</Text>
                  <Text style={styles.colWide}>{entry.diagnosis}</Text>
                  <Text style={styles.colWide}>{entry.treatment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Geëuthanaseerde dieren */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Geëuthanaseerde dieren</Text>
          {euthanized.length === 0 ? (
            <Text style={styles.empty}>Geen euthanasie geregistreerd.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colName, styles.headerText]}>Naam</Text>
                <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
                <Text style={[styles.colChip, styles.headerText]}>Chipnr</Text>
                <Text style={[styles.colReason, styles.headerText]}>Reden</Text>
              </View>
              {euthanized.map((entry, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colName}>{entry.animalName}</Text>
                  <Text style={styles.colSpecies}>{entry.species}</Text>
                  <Text style={styles.colChip}>{entry.chipNr || "-"}</Text>
                  <Text style={styles.colReason}>{entry.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Afwijkend gedrag */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Dieren met afwijkend gedrag</Text>
          {abnormal.length === 0 ? (
            <Text style={styles.empty}>Geen afwijkend gedrag geregistreerd.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colName, styles.headerText]}>Naam</Text>
                <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
                <Text style={[styles.colChip, styles.headerText]}>Chipnr</Text>
                <Text style={[styles.colReason, styles.headerText]}>Beschrijving</Text>
              </View>
              {abnormal.map((entry, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colName}>{entry.animalName}</Text>
                  <Text style={styles.colSpecies}>{entry.species}</Text>
                  <Text style={styles.colChip}>{entry.chipNr || "-"}</Text>
                  <Text style={styles.colReason}>{entry.description}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Aanbevelingen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Aanbevelingen</Text>
          {report.recommendations ? (
            <Text style={styles.recommendations}>{report.recommendations}</Text>
          ) : (
            <Text style={styles.empty}>Geen aanbevelingen.</Text>
          )}
        </View>

        {/* Ondertekening */}
        <View style={styles.signature}>
          {report.vetSignature ? (
            <>
              <Text style={[styles.signatureStatus, { color: "#166534" }]}>
                Ondertekend door {report.vetName}
              </Text>
              <Text style={styles.signatureDate}>
                Ondertekend op: {report.signedAt ? new Date(report.signedAt).toLocaleDateString("nl-BE") : "-"}
              </Text>
            </>
          ) : (
            <Text style={[styles.signatureStatus, { color: "#b45309" }]}>
              Concept — Nog niet ondertekend
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Dit document wordt bewaard conform KB 27/04/2007 (min. 2 jaar)
        </Text>
      </Page>
    </Document>
  );
}
