import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/setup";
import { CONTACT, HK_NUMBER, PDF_LETTERHEAD } from "@/lib/constants";
import type { DossierRij, IbnDossierPdfData } from "@/lib/animals/ibn-dossier";

/**
 * Story 10.72 — het volledige IBN-dossier van één dier, voor politie of
 * Dierenwelzijn: het dier, de inbeslagname en het verwaarlozingsrapport met de
 * bewijsfoto's. Foto's komen binnen als (verkleinde) data-URL.
 */

const ROOD = "#991b1b";

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
