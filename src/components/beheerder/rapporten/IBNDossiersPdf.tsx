import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { PDF_LETTERHEAD, SPECIES_LABELS } from "@/lib/constants";
import { PHASE_LABELS } from "@/lib/workflow/stepbar";
import type { IBNDossierReportRow } from "@/lib/queries/reports";

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
  colDossierNr: { width: "14%" },
  colPvNr: { width: "12%" },
  colAnimal: { width: "14%" },
  colSpecies: { width: "10%" },
  colDeadline: { width: "14%" },
  colPhase: { width: "14%" },
  colIntake: { width: "12%" },
  colUrgency: { width: "10%" },
  legalNote: { marginTop: 16, paddingTop: 8, borderTop: "0.5 solid #ccc", fontSize: 7, color: "#666", fontStyle: "italic" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

function getUrgency(deadline: string | null): { label: string; style: { color: string } } {
  if (!deadline) return { label: "-", style: { color: "#374151" } };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Verlopen", style: { color: "#991b1b" } };
  if (diffDays < 14) return { label: "Urgent", style: { color: "#dc2626" } };
  if (diffDays < 30) return { label: "Opgelet", style: { color: "#ea580c" } };
  return { label: "OK", style: { color: "#16a34a" } };
}

interface Props {
  dossiers: IBNDossierReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function IBNDossiersPdf({ dossiers, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>{PDF_LETTERHEAD.name}</Text>
          <Text style={styles.org}>{PDF_LETTERHEAD.address}</Text>
          <Text style={styles.title}>IBN-dossiers overzicht</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Gegenereerd op: {generatedAt}</Text>
          {filters && <Text style={styles.metaText}>Filters: {filters}</Text>}
          <Text style={styles.metaText}>Aantal resultaten: {dossiers.length}</Text>
        </View>

        {dossiers.length === 0 ? (
          <Text style={styles.empty}>Geen IBN-dossiers gevonden met de opgegeven filters.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDossierNr, styles.headerText]}>Dossiernr</Text>
              <Text style={[styles.colPvNr, styles.headerText]}>PV-nr</Text>
              <Text style={[styles.colAnimal, styles.headerText]}>Dier</Text>
              <Text style={[styles.colSpecies, styles.headerText]}>Soort</Text>
              <Text style={[styles.colDeadline, styles.headerText]}>Deadline</Text>
              <Text style={[styles.colPhase, styles.headerText]}>Fase</Text>
              <Text style={[styles.colIntake, styles.headerText]}>Intake</Text>
              <Text style={[styles.colUrgency, styles.headerText]}>Urgentie</Text>
            </View>
            {dossiers.map((dossier) => {
              const urgency = getUrgency(dossier.ibnDecisionDeadline);
              return (
                <View key={dossier.id} style={styles.tableRow}>
                  <Text style={[styles.colDossierNr, styles.cellText]}>{dossier.dossierNr}</Text>
                  <Text style={[styles.colPvNr, styles.cellText]}>{dossier.pvNr ?? "-"}</Text>
                  <Text style={[styles.colAnimal, styles.cellText]}>{dossier.name}</Text>
                  <Text style={[styles.colSpecies, styles.cellText]}>{SPECIES_LABELS[dossier.species] ?? dossier.species}</Text>
                  <Text style={[styles.colDeadline, styles.cellText]}>{dossier.ibnDecisionDeadline ?? "-"}</Text>
                  <Text style={[styles.colPhase, styles.cellText]}>{PHASE_LABELS[dossier.workflowPhase ?? ""] ?? dossier.workflowPhase ?? "-"}</Text>
                  <Text style={[styles.colIntake, styles.cellText]}>{dossier.intakeDate ?? "-"}</Text>
                  <Text style={[styles.colUrgency, styles.cellText, urgency.style]}>{urgency.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.legalNote}>
          Conform artikel 9 van de Wet van 14 augustus 1986 betreffende de bescherming en het welzijn der dieren — IBN-dieren worden maximaal 60 dagen in het asiel gehouden.
        </Text>

        <Text style={styles.footer}>
          {PDF_LETTERHEAD.name} — Rapport R12: IBN-dossiers
        </Text>
      </Page>
    </Document>
  );
}
