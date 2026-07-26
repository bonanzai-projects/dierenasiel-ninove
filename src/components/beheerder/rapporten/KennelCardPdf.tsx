import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { KennelCardModel, KennelCardOption } from "@/lib/animals/kennel-card";

/**
 * Story 10.43 — kaart om aan de kennel te hangen.
 *
 * Nagemaakt naar de handgeschreven steekkaart van het asiel: ras groot bovenaan,
 * daaronder de velden onder elkaar met een schrijflijn, en de keuzes Reu/Teef en
 * Ja/Neen allebei zichtbaar met één omcirkeld.
 *
 * Liggend A5: past op een half blad, groot genoeg om vanop een meter te lezen.
 * Wat het systeem weet, staat voorgedrukt; de rest blijft een lege lijn om met
 * de hand in te vullen — net als vroeger.
 */

const INKT = "#111";
const LIJN = "0.8 solid #111";

const styles = StyleSheet.create({
  page: { paddingVertical: 26, paddingHorizontal: 30, fontFamily: "Helvetica", color: INKT },

  kop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  kopLinks: { flexGrow: 1 },
  rasLabel: { fontSize: 9, marginBottom: 2 },
  ras: { fontSize: 30, fontFamily: "Helvetica-Bold" },
  rasLeeg: { borderBottom: LIJN, height: 34, width: 300 },

  gewichtBlok: { width: 92, border: LIJN, padding: 5, alignItems: "center" },
  gewichtLabel: { fontSize: 8 },
  gewichtWaarde: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 3 },
  gewichtLeeg: { height: 20 },

  rij: { flexDirection: "row", alignItems: "flex-end", marginBottom: 11 },
  label: { fontSize: 11, width: 108 },
  waardeLijn: { flexGrow: 1, borderBottom: LIJN, paddingBottom: 2, minHeight: 17 },
  waarde: { fontSize: 14, fontFamily: "Helvetica-Bold" },

  keuzes: { flexDirection: "row", gap: 26, flexGrow: 1, paddingBottom: 2 },
  keuze: { flexDirection: "row", alignItems: "center", gap: 6 },
  bolletje: { width: 13, height: 13, borderRadius: 7, border: LIJN },
  bolletjeAan: { width: 13, height: 13, borderRadius: 7, border: "2.5 solid #111" },
  keuzeTekst: { fontSize: 13 },
  keuzeTekstAan: { fontSize: 13, fontFamily: "Helvetica-Bold" },

  tweeKolommen: { flexDirection: "row", gap: 22 },
  halveRij: { flexDirection: "row", alignItems: "flex-end", width: "48%" },
  halfLabel: { fontSize: 11, width: 84 },

  opmerkingenLabel: { fontSize: 11, marginBottom: 3 },
  opmerkingenVak: { border: LIJN, flexGrow: 1, minHeight: 74 },

  voet: { marginTop: 10, fontSize: 7.5, color: "#777", textAlign: "right" },
});

function Keuzes({ opties }: { opties: KennelCardOption[] }) {
  return (
    <View style={styles.keuzes}>
      {opties.map((optie) => (
        <View key={optie.label} style={styles.keuze}>
          <View style={optie.gemarkeerd ? styles.bolletjeAan : styles.bolletje} />
          <Text style={optie.gemarkeerd ? styles.keuzeTekstAan : styles.keuzeTekst}>
            {optie.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Regel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <View style={styles.rij}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.waardeLijn}>
        <Text style={styles.waarde}>{waarde}</Text>
      </View>
    </View>
  );
}

export default function KennelCardPdf({ kaart }: { kaart: KennelCardModel }) {
  const naam = kaart.echteNaam ? `${kaart.naam}  (${kaart.echteNaam})` : kaart.naam;

  return (
    <Document title={`Kennelkaart ${kaart.naam}`}>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.kop}>
          <View style={styles.kopLinks}>
            <Text style={styles.rasLabel}>Ras</Text>
            {kaart.ras ? <Text style={styles.ras}>{kaart.ras}</Text> : <View style={styles.rasLeeg} />}
          </View>
          <View style={styles.gewichtBlok}>
            <Text style={styles.gewichtLabel}>Kg</Text>
            {kaart.gewicht ? (
              <Text style={styles.gewichtWaarde}>{kaart.gewicht}</Text>
            ) : (
              <View style={styles.gewichtLeeg} />
            )}
          </View>
        </View>

        <Regel label="Naam" waarde={naam} />

        <View style={styles.rij}>
          <Text style={styles.label}>Geslacht</Text>
          <Keuzes opties={kaart.geslacht} />
        </View>

        <View style={styles.rij}>
          <Text style={styles.label}>Steriel</Text>
          <Keuzes opties={kaart.steriel} />
        </View>

        <Regel label="Geboortedatum" waarde={kaart.geboortedatum} />

        <View style={styles.tweeKolommen}>
          <View style={styles.halveRij}>
            <Text style={styles.halfLabel}>Gevaccineerd</Text>
            <View style={styles.waardeLijn}>
              <Text style={styles.waarde}>{kaart.gevaccineerd}</Text>
            </View>
          </View>
          <View style={styles.halveRij}>
            <Text style={styles.halfLabel}>Ontworming</Text>
            <View style={styles.waardeLijn}>
              <Text style={styles.waarde}>{kaart.ontworming}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12, flexGrow: 1 }}>
          <Text style={styles.opmerkingenLabel}>Opmerkingen</Text>
          <View style={styles.opmerkingenVak} />
        </View>

        <View style={{ marginTop: 12 }}>
          <Regel label="In huis sinds" waarde={kaart.inHuisSinds} />
        </View>

        <Text style={styles.voet}>Dierenasiel Ninove</Text>
      </Page>
    </Document>
  );
}
