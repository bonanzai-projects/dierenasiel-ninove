import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { GENDER_LABELS } from "@/lib/constants";
import {
  formatDateBE,
  sterielLabel,
  vaccinDisplay,
  redenOpvangDisplay,
  jaNee,
  okBlank,
} from "@/lib/reports/animal-report-format";
import type { AnimalReportRow } from "@/lib/queries/reports";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 7, fontFamily: "Helvetica" },
  header: { marginBottom: 12, textAlign: "center" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  org: { fontSize: 8, color: "#666", marginBottom: 2 },
  meta: { marginBottom: 10, paddingBottom: 6, borderBottom: "1 solid #ccc" },
  metaText: { fontSize: 8, color: "#555" },
  table: { marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "0.5 solid #ccc", paddingVertical: 3, paddingHorizontal: 2 },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 2, paddingHorizontal: 2 },
  headerText: { fontSize: 6, fontFamily: "Helvetica-Bold", color: "#374151" },
  cellText: { fontSize: 6, color: "#111" },
  footer: { position: "absolute", bottom: 16, left: 24, right: 24, textAlign: "center", fontSize: 7, color: "#999" },
  empty: { fontSize: 9, color: "#999", fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});

// Kolombreedtes (% — som = 100), gealigneerd op het as-is asielrapport.
const cols = {
  adoptie: { width: "5%" },
  reden: { width: "10%" },
  gedrag: { width: "6%" },
  naam: { width: "8%" },
  ras: { width: "8%" },
  mv: { width: "4%" },
  steriel: { width: "6%" },
  geboorte: { width: "7%" },
  chip: { width: "8%" },
  nwChip: { width: "4%" },
  paspoort: { width: "8%" },
  nwPaspoort: { width: "4%" },
  vaccin: { width: "6%" },
  ontworming: { width: "5%" },
  vlooien: { width: "5%" },
  website: { width: "3%" },
  adopteer: { width: "3%" },
} as const;

interface Props {
  animals: AnimalReportRow[];
  filters?: string;
  generatedAt: string;
}

export default function AnimalReportPdf({ animals, filters, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>Dierenasiel Ninove VZW</Text>
          <Text style={styles.org}>Minnenhofstraat 24, 9400 Denderwindeke</Text>
          <Text style={styles.title}>Overzicht dieren in asiel</Text>
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
              <Text style={[cols.adoptie, styles.headerText]}>Ter adoptie</Text>
              <Text style={[cols.reden, styles.headerText]}>Reden opvang</Text>
              <Text style={[cols.gedrag, styles.headerText]}>Gedragseval.</Text>
              <Text style={[cols.naam, styles.headerText]}>Naam</Text>
              <Text style={[cols.ras, styles.headerText]}>Ras</Text>
              <Text style={[cols.mv, styles.headerText]}>M/V</Text>
              <Text style={[cols.steriel, styles.headerText]}>Steriel</Text>
              <Text style={[cols.geboorte, styles.headerText]}>Geb.datum</Text>
              <Text style={[cols.chip, styles.headerText]}>Chip</Text>
              <Text style={[cols.nwChip, styles.headerText]}>Nwe chip</Text>
              <Text style={[cols.paspoort, styles.headerText]}>Paspoort</Text>
              <Text style={[cols.nwPaspoort, styles.headerText]}>Nw pasp.</Text>
              <Text style={[cols.vaccin, styles.headerText]}>Vaccin</Text>
              <Text style={[cols.ontworming, styles.headerText]}>Ontw.</Text>
              <Text style={[cols.vlooien, styles.headerText]}>Vlooien</Text>
              <Text style={[cols.website, styles.headerText]}>Web</Text>
              <Text style={[cols.adopteer, styles.headerText]}>Adopt.</Text>
            </View>
            {animals.map((animal) => (
              <View key={animal.id} style={styles.tableRow}>
                <Text style={[cols.adoptie, styles.cellText]}>{jaNee(animal.isAvailableForAdoption)}</Text>
                <Text style={[cols.reden, styles.cellText]}>{redenOpvangDisplay(animal.intakeReason, animal.intakeDate)}</Text>
                <Text style={[cols.gedrag, styles.cellText]}>{formatDateBE(animal.lastBehaviorDate) || "-"}</Text>
                <Text style={[cols.naam, styles.cellText]}>{animal.name}</Text>
                <Text style={[cols.ras, styles.cellText]}>{animal.breed ?? "-"}</Text>
                <Text style={[cols.mv, styles.cellText]}>{GENDER_LABELS[animal.gender] ?? animal.gender}</Text>
                <Text style={[cols.steriel, styles.cellText]}>{sterielLabel(animal.isNeutered, animal.neuteredByShelter)}</Text>
                <Text style={[cols.geboorte, styles.cellText]}>{formatDateBE(animal.dateOfBirth) || "-"}</Text>
                <Text style={[cols.chip, styles.cellText]}>{animal.identificationNr ?? "-"}</Text>
                <Text style={[cols.nwChip, styles.cellText]}>{jaNee(animal.isNewChip)}</Text>
                <Text style={[cols.paspoort, styles.cellText]}>{animal.passportNr ?? "-"}</Text>
                <Text style={[cols.nwPaspoort, styles.cellText]}>{jaNee(animal.isNewPassport)}</Text>
                <Text style={[cols.vaccin, styles.cellText]}>{vaccinDisplay(animal.lastVaccinationDate, animal.lastVaccinationByShelter) || "-"}</Text>
                <Text style={[cols.ontworming, styles.cellText]}>{formatDateBE(animal.lastDewormingDate) || "-"}</Text>
                <Text style={[cols.vlooien, styles.cellText]}>{formatDateBE(animal.lastFleaTreatmentDate) || "-"}</Text>
                <Text style={[cols.website, styles.cellText]}>{okBlank(animal.isOnWebsite)}</Text>
                <Text style={[cols.adopteer, styles.cellText]}>{okBlank(animal.isAvailableForAdoption)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Dierenasiel Ninove VZW — Rapport R1: Overzicht dieren in asiel
        </Text>
      </Page>
    </Document>
  );
}
