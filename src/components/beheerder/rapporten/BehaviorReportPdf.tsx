import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { BEHAVIOR_VERZORGERS_ITEMS, BEHAVIOR_HONDEN_ITEMS } from "@/lib/constants";
import { formatDateBE } from "@/lib/reports/animal-report-format";
import {
  sortBehaviorRecordsAsc,
  behaviorAnswer,
  buildBehaviorColumns,
  chunkBehaviorColumns,
  behaviorRecorder,
} from "@/lib/reports/behavior-report-format";
import type { BehaviorRecordWithRecorder, Animal } from "@/types";

// Story 10.27: gealigneerd op de officiële Bijlage VIII B (KB 27/04/2007).
// Matrix-layout: criteria als rijen, elke evaluatiedatum als kolom. Minimum 5
// kolommen zoals het officiële formulier (evaluatie ≥ wekelijks, eerste 3 weken).
const MIN_COLUMNS = 5;

// Story 10.28: de invoerlimiet van 3 fiches is opgeheven, dus een langverblijver kan
// veel evaluaties hebben. Meer dan 10 kolommen naast elkaar wordt onleesbaar smal →
// de matrix wordt dan over meerdere blokken verdeeld (criteria-rijen herhaald).
const MAX_COLUMNS_PER_BLOCK = 10;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },
  legalRef: { fontSize: 9, textAlign: "center", marginBottom: 10 },
  shelterLine: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 8 },
  subtitle: { fontSize: 9, fontStyle: "italic", textAlign: "center", marginBottom: 10 },
  idBlock: { marginTop: 6, marginBottom: 12 },
  idRow: { fontSize: 9, marginBottom: 2 },
  idLabel: { fontFamily: "Helvetica-Bold" },
  sectionLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, textDecoration: "underline" },
  table: { borderTop: "0.5 solid #000", borderLeft: "0.5 solid #000" },
  row: { flexDirection: "row" },
  headerRow: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  cell: { borderRight: "0.5 solid #000", borderBottom: "0.5 solid #000", paddingVertical: 3, paddingHorizontal: 4, fontSize: 8, justifyContent: "center" },
  labelCell: { width: "28%" },
  dateCell: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  notesBlock: { marginTop: 12 },
  notesTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  notesItem: { fontSize: 8, marginBottom: 2 },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, textAlign: "center", fontSize: 7, color: "#999" },
});

interface Props {
  animal: Pick<Animal, "id" | "name" | "species" | "breed" | "dossierNr" | "identificationNr" | "intakeDate">;
  records: BehaviorRecordWithRecorder[];
  caregivers: string[];
  generatedAt: string;
}

type Column = BehaviorRecordWithRecorder | null;

function MatrixSection({
  title,
  items,
  andereKey,
  columns,
}: {
  title: string;
  items: readonly { key: string; label: string }[];
  andereKey: string;
  columns: Column[];
}) {
  const blocks = chunkBehaviorColumns(columns, MAX_COLUMNS_PER_BLOCK);

  return (
    <>
      {blocks.map((block, blockIndex) => (
        <MatrixBlock
          key={blockIndex}
          title={blockIndex === 0 ? title : `${title} (vervolg)`}
          items={items}
          andereKey={andereKey}
          columns={block}
        />
      ))}
    </>
  );
}

function MatrixBlock({
  title,
  items,
  andereKey,
  columns,
}: {
  title: string;
  items: readonly { key: string; label: string }[];
  andereKey: string;
  columns: Column[];
}) {
  const dateColWidth = `${72 / columns.length}%`;

  return (
    <View wrap={false}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.table}>
        {/* Koprij met datums */}
        <View style={styles.headerRow}>
          <Text style={[styles.cell, styles.labelCell]}>Datum :</Text>
          {columns.map((col, i) => (
            <Text key={i} style={[styles.cell, styles.dateCell, { width: dateColWidth }]}>
              {col ? formatDateBE(col.date) : ""}
            </Text>
          ))}
        </View>
        {/* Story 10.54 (Sven): wie de fiche invulde, per evaluatie. */}
        <View style={styles.row}>
          <Text style={[styles.cell, styles.labelCell]}>Ingevuld door :</Text>
          {columns.map((col, i) => (
            <Text key={i} style={[styles.cell, { width: dateColWidth }]}>
              {behaviorRecorder(col)}
            </Text>
          ))}
        </View>
        {/* Criteria-rijen */}
        {items.map((item) => (
          <View key={item.key} style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]}>{item.label}</Text>
            {columns.map((col, i) => (
              <Text key={i} style={[styles.cell, { width: dateColWidth }]}>
                {col ? behaviorAnswer(col.checklist as Record<string, unknown>, item.key) : ""}
              </Text>
            ))}
          </View>
        ))}
        {/* Andere-rij */}
        <View style={styles.row}>
          <Text style={[styles.cell, styles.labelCell]}>Andere :</Text>
          {columns.map((col, i) => {
            const val = col ? (col.checklist as Record<string, unknown>)[andereKey] : null;
            return (
              <Text key={i} style={[styles.cell, { width: dateColWidth }]}>
                {typeof val === "string" ? val : ""}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function BehaviorReportPdf({ animal, records, caregivers, generatedAt }: Props) {
  const columns = buildBehaviorColumns(records, MIN_COLUMNS);
  const recordsWithNotes = sortBehaviorRecordsAsc(records).filter((r) => r.notes);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.legalRef}>Bijlage VIII B bij het koninklijk besluit van 27 april 2007</Text>

        <Text style={styles.shelterLine}>Dierenasiel : Dierenasiel Ninove</Text>
        <Text style={styles.shelterLine}>
          Dossiernummer : <Text style={{ fontFamily: "Helvetica" }}>{animal.dossierNr ?? ""}</Text>
        </Text>

        <Text style={styles.title}>Evaluatiefiche van het gedrag in het asiel.</Text>
        <Text style={styles.subtitle}>
          Deze pagina bevat gegevens die zullen meegedeeld worden aan kandidaat-adoptanten
        </Text>

        <View style={styles.idBlock}>
          <Text style={styles.idRow}>
            <Text style={styles.idLabel}>Identificatieteken : </Text>
            {animal.identificationNr ?? ""}
          </Text>
          <Text style={styles.idRow}>
            <Text style={styles.idLabel}>Naam van het dier (facultatief) : </Text>
            {animal.name}
          </Text>
          <Text style={styles.idRow}>
            <Text style={styles.idLabel}>Datum van opname : </Text>
            {formatDateBE(animal.intakeDate)}
          </Text>
          <Text style={styles.idRow}>
            <Text style={styles.idLabel}>
              Na(a)m(en) van de perso(o)n(en) (verzorgers) die het dier verzorgen in het asiel :{" "}
            </Text>
            {caregivers.join(", ")}
          </Text>
        </View>

        {records.length === 0 ? (
          <Text style={styles.empty}>Geen gedragsfiches geregistreerd voor dit dier.</Text>
        ) : null}

        <MatrixSection
          title="1. Gedrag tegenover de verzorgers"
          items={BEHAVIOR_VERZORGERS_ITEMS}
          andereKey="verzorgers_andere"
          columns={columns}
        />

        <MatrixSection
          title="2. Gedrag tegenover andere honden"
          items={BEHAVIOR_HONDEN_ITEMS}
          andereKey="honden_andere"
          columns={columns}
        />

        {recordsWithNotes.length > 0 && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesTitle}>Opmerkingen</Text>
            {recordsWithNotes.map((r) => (
              <Text key={r.id} style={styles.notesItem}>
                {formatDateBE(r.date)}: {r.notes}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove — Evaluatiefiche gedrag (Bijlage VIII B) — gegenereerd op {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
