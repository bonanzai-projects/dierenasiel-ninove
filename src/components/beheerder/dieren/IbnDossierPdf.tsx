import { Document, Page, Text, View, Image, StyleSheet, Svg, Path, Circle } from "@react-pdf/renderer";

import "@/lib/pdf/setup";
import { CONTACT, HK_NUMBER, PDF_LETTERHEAD } from "@/lib/constants";
import { IBN_WEIGHT_CHART, type DossierRij, type IbnDossierPdfData } from "@/lib/animals/ibn-dossier";
import { formatWeight } from "@/lib/animals/weight";

/**
 * Story 10.72 — het volledige IBN-dossier van één dier, voor politie of
 * Dierenwelzijn: het dier, de inbeslagname en het verwaarlozingsrapport met de
 * bewijsfoto's. Foto's komen binnen als (verkleinde) data-URL.
 */

const ROOD = "#991b1b";
const GROEN = "#1b4332";

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 50, fontSize: 9, fontFamily: "Helvetica", color: "#222" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  orgName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  orgLine: { fontSize: 7.5, color: "#444", marginTop: 1, textAlign: "right" },
  rule: { borderBottom: "0.8 solid #333", marginBottom: 8 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: ROOD, marginTop: 4 },
  subtitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  meta: { fontSize: 8, color: "#555", marginTop: 3, marginBottom: 10 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: ROOD, paddingBottom: 3, borderBottom: "0.8 solid #333", marginBottom: 6 },
  animalRow: { flexDirection: "row", gap: 14 },
  animalFields: { flex: 1 },
  mainPhoto: { width: 150, height: 150, objectFit: "cover", borderRadius: 3 },
  row: { flexDirection: "row", paddingVertical: 2.5, borderBottom: "0.4 solid #ddd" },
  rowLabel: { width: 165, fontSize: 8.5, color: "#555" },
  rowValue: { flex: 1, fontSize: 9.5 },
  textBlock: { marginTop: 7 },
  textLabel: { fontSize: 8.5, color: "#555", marginBottom: 2 },
  textValue: { fontSize: 9.5, border: "0.5 solid #bbb", padding: 5, lineHeight: 1.35 },
  missing: { fontSize: 10, fontFamily: "Helvetica-Oblique", color: ROOD, border: "0.6 solid #e5a3a3", padding: 8 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  photoBox: { width: 250, height: 188, border: "0.5 solid #ccc", padding: 2 },
  photo: { width: "100%", height: "100%", objectFit: "contain" },
  note: { fontSize: 8, color: "#555", marginTop: 5 },
  weightSummary: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  chartBox: { marginBottom: 8 },
  weightHead: { flexDirection: "row", paddingVertical: 2.5, borderBottom: "0.6 solid #999" },
  weightRow: { flexDirection: "row", paddingVertical: 2.5, borderBottom: "0.4 solid #ddd" },
  colDate: { width: 75, fontSize: 9 },
  colWeight: { width: 70, fontSize: 9 },
  colDelta: { width: 70, fontSize: 9 },
  colNote: { flex: 1, fontSize: 9 },
  headText: { fontSize: 8, color: "#555" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7, color: "#999" },
});

function Rijen({ rijen }: { rijen: DossierRij[] }) {
  return (
    <View>
      {rijen.map((r) => (
        <View key={r.label} style={s.row} wrap={false}>
          <Text style={s.rowLabel}>{r.label}</Text>
          <Text style={s.rowValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

interface Props {
  data: IbnDossierPdfData;
  /** Hoofdfoto als data-URL; zonder foto staat er niets. */
  mainPhoto?: string;
  evidencePhotos: string[];
  /** Bewijsfoto's boven het maximum die niet in het dossier staan. */
  omittedPhotos?: number;
}

export default function IbnDossierPdf({ data: d, mainPhoto, evidencePhotos, omittedPhotos = 0 }: Props) {
  const kop = d.dossierNr ? `${d.animalName} — dossier ${d.dossierNr}` : d.animalName;

  return (
    <Document title={`IBN-dossier ${kop}`} author={PDF_LETTERHEAD.name}>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.orgName}>{PDF_LETTERHEAD.name}</Text>
          <View>
            <Text style={s.orgLine}>{PDF_LETTERHEAD.address}</Text>
            <Text style={s.orgLine}>{CONTACT.phone}</Text>
            <Text style={s.orgLine}>{CONTACT.emailGeneral} - {CONTACT.website}</Text>
            <Text style={s.orgLine}>{HK_NUMBER}</Text>
          </View>
        </View>
        <View style={s.rule} />

        <Text style={s.title}>IBN-dossier</Text>
        <Text style={s.subtitle}>{kop}</Text>
        <Text style={s.meta}>Opgemaakt op {d.drawnUpOn}</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dier</Text>
          <View style={s.animalRow}>
            <View style={s.animalFields}>
              <Rijen rijen={d.animal} />
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf kent geen alt */}
            {mainPhoto && <Image src={mainPhoto} style={s.mainPhoto} />}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Inbeslagname</Text>
          <Rijen rijen={d.seizure} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Verwaarlozingsrapport</Text>
          {d.neglect ? (
            <View>
              <Rijen rijen={d.neglect.facts} />
              {d.neglect.texts.map((t) => (
                <View key={t.label} style={s.textBlock}>
                  <Text style={s.textLabel}>{t.label}</Text>
                  <Text style={s.textValue}>{t.value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.missing}>Nog geen verwaarlozingsrapport ingevuld.</Text>
          )}
        </View>

        {/* Story 10.79 (Sven: "de curve mag zeker bijgehouden worden voor dossier IBN"). */}
        <View style={s.section}>
          {/* Titel, samenvatting en grafiek blijven samen: geen losse titel onderaan een pagina.
              De tabel eronder mag wel over pagina's doorlopen. */}
          <View wrap={false}>
            <Text style={s.sectionTitle}>Gewichtsverloop</Text>
            {d.weights.rows.length === 0 && <Text style={s.note}>Nog geen wegingen geregistreerd.</Text>}
            {d.weights.summary && <Text style={s.weightSummary}>{d.weights.summary}</Text>}
            {d.weights.chart && (
              <View style={s.chartBox}>
                <Svg
                  width={IBN_WEIGHT_CHART.width + 12}
                  height={IBN_WEIGHT_CHART.height + 12}
                  viewBox={`-6 -6 ${IBN_WEIGHT_CHART.width + 12} ${IBN_WEIGHT_CHART.height + 12}`}
                >
                  <Path d={d.weights.chart.path} stroke={GROEN} strokeWidth={1.5} fill="none" />
                  {d.weights.chart.dots.map((dot, i) => (
                    <Circle key={i} cx={dot.x} cy={dot.y} r={2.5} fill={GROEN} />
                  ))}
                </Svg>
                <Text style={s.note}>
                  {`Laagste ${formatWeight(d.weights.chart.min)} · hoogste ${formatWeight(d.weights.chart.max)}`}
                </Text>
              </View>
            )}
          </View>
          {d.weights.rows.length > 0 && (
            <View>
              <View style={s.weightHead}>
                <Text style={[s.colDate, s.headText]}>Datum</Text>
                <Text style={[s.colWeight, s.headText]}>Gewicht</Text>
                <Text style={[s.colDelta, s.headText]}>Verschil</Text>
                <Text style={[s.colNote, s.headText]}>Opmerking</Text>
              </View>
              {d.weights.rows.map((r, i) => (
                <View key={i} style={s.weightRow} wrap={false}>
                  <Text style={s.colDate}>{r.date}</Text>
                  <Text style={s.colWeight}>{r.weight}</Text>
                  <Text style={s.colDelta}>{r.delta || "—"}</Text>
                  <Text style={s.colNote}>{r.note || "—"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {(evidencePhotos.length > 0 || omittedPhotos > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Bewijsfoto&apos;s</Text>
            <View style={s.photoGrid}>
              {evidencePhotos.map((src, i) => (
                <View key={i} style={s.photoBox} wrap={false}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf kent geen alt */}
                  <Image src={src} style={s.photo} />
                </View>
              ))}
            </View>
            {omittedPhotos > 0 && (
              <Text style={s.note}>
                {`${omittedPhotos} foto's niet opgenomen — te veel voor één dossier; ze staan bij het verwaarlozingsrapport in het programma.`}
              </Text>
            )}
          </View>
        )}

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${PDF_LETTERHEAD.name} — IBN-dossier ${kop} — pagina ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
