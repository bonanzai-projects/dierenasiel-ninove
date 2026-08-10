import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { PHASE_LABELS } from "@/lib/workflow/stepbar";
import { SPECIES_LABELS } from "@/lib/constants";
import type { WorkflowOverviewReportRow } from "@/lib/queries/reports";

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
  colName: { width: "18%" },
  colSpecies: { width: "12%" },
  colPhase: { width: "16%" },
  colIntake: { width: "16%" },
  colDays: { width: "14%" },
  colBottleneck: { width: "24%" },
  bottleneckYes: { fontSize: 8, color: "#dc2626" },
  bottleneckNo: { fontSize: 8, color: "#16a34a" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

interface Props {
  animals: WorkflowOverviewReportRow[];
  filters?: string;
  generatedAt: string;
}

function computeBottlenecks(animals: WorkflowOverviewReportRow[]): Map<number, boolean> {
  const phaseGroups = new Map<string, number[]>();
  for (const animal of animals) {
    const phase = animal.workflowPhase ?? "unknown";
    if (animal.daysSinceIntake == null) continue;
    const group = phaseGroups.get(phase) ?? [];
    group.push(animal.daysSinceIntake);
    phaseGroups.set(phase, group);
  }

  const phaseAverages = new Map<string, number>();
  for (const [phase, days] of phaseGroups) {
    const avg = days.reduce((sum, d) => sum + d, 0) / days.length;
    phaseAverages.set(phase, avg);
  }

  const result = new Map<number, boolean>();
  for (const animal of animals) {
    const phase = animal.workflowPhase ?? "unknown";
    const avg = phaseAverages.get(phase);
    if (animal.daysSinceIntake != null && avg != null && animal.daysSinceIntake > avg * 1.5) {
      result.set(animal.id, true);
    } else {
      result.set(animal.id, false);
    }
  }
  return result;
}

export default function WorkflowOverviewPdf({ animals, filters, generatedAt }: Props) {
  const bottlenecks = computeBottlenecks(animals);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Workflow-overzicht</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {animals.length}</Text>
        </View>

        {animals.length === 0 ? (
          <Text style={styles.empty}>Geen dieren gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colName, styles.headerText]}>Naam</Text>
              <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
              <Text style={[styles.colPhase, styles.headerText]}>Fase</Text>
              <Text style={[styles.colIntake, styles.headerText]}>Intakedatum</Text>
              <Text style={[styles.colDays, styles.headerText]}>Dagen in asiel</Text>
              <Text style={[styles.colBottleneck, styles.headerText]}>Knelpunt</Text>
            </View>
            {animals.map((animal) => (
              <View key={animal.id} style={styles.tableRow}>
                <Text style={[styles.colName, styles.cellText]}>{animal.name}</Text>
                <Text style={[styles.colSpecies, styles.cellText]}>{SPECIES_LABELS[animal.species] ?? animal.species}</Text>
                <Text style={[styles.colPhase, styles.cellText]}>{PHASE_LABELS[animal.workflowPhase ?? ""] ?? animal.workflowPhase ?? "-"}</Text>
                <Text style={[styles.colIntake, styles.cellText]}>{animal.intakeDate ?? "-"}</Text>
                <Text style={[styles.colDays, styles.cellText]}>{animal.daysSinceIntake != null ? String(animal.daysSinceIntake) : "-"}</Text>
                <Text style={[styles.colBottleneck, bottlenecks.get(animal.id) ? styles.bottleneckYes : styles.bottleneckNo]}>
                  {bottlenecks.get(animal.id) ? "Ja" : "Nee"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Rapport R13: Workflow-overzicht
        </Text>
      </Page>
    </Document>
  );
}
