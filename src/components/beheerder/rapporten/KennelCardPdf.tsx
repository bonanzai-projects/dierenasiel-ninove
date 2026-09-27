import { Document, Page, Text, View, StyleSheet, Svg, Polyline } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import type { KennelCardModel, KennelCardOption } from "@/lib/animals/kennel-card";

/**
 * Story 10.43 — kaart om aan de kennel te hangen.
 *
 * Nagemaakt naar de handgeschreven steekkaart van het asiel: de velden onder
 * elkaar met een schrijflijn, en de keuzes Reu/Teef en Ja/Neen allebei zichtbaar
 * met één omcirkeld. Sinds story 10.80 (Sven) staat de naam groot bovenaan en
 * het ras kleiner, is de ontworming een tabel (datum + product) en staat de
 * reden van intake naast "In huis sinds".
 *
 * Liggend A5: past op een half blad, groot genoeg om vanop een meter te lezen.
 * Wat het systeem weet, staat voorgedrukt; de rest blijft een lege lijn om met
 * de hand in te vullen — net als vroeger.
 */

const INKT = "#111";
const LIJN = "0.8 solid #111";

const styles = StyleSheet.create({
  page: { paddingVertical: 24, paddingHorizontal: 30, fontFamily: "Helvetica", color: INKT },

  // Story 10.80 (Sven): de naam groot bovenaan, het ras kleiner eronder.
  kop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  kopLinks: { flexGrow: 1 },
  naamLabel: { fontSize: 9, marginBottom: 2 },
  naamRij: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  naam: { fontSize: 32, fontFamily: "Helvetica-Bold" },
  echteNaam: { fontSize: 14, marginBottom: 4 },
  naamLeeg: { borderBottom: LIJN, height: 36, width: 300 },

  gewichtBlok: { width: 92, border: LIJN, padding: 5, alignItems: "center" },
  gewichtLabel: { fontSize: 8 },
  gewichtWaarde: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 3 },
  gewichtLeeg: { height: 20 },

  rij: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10 },
  label: { fontSize: 11, width: 108 },
  waardeLijn: { flexGrow: 1, borderBottom: LIJN, paddingBottom: 2, minHeight: 17 },
  waarde: { fontSize: 14, fontFamily: "Helvetica-Bold" },

  keuzes: { flexDirection: "row", gap: 26, flexGrow: 1, paddingBottom: 2 },
  keuze: { flexDirection: "row", alignItems: "center", gap: 6 },
  bolletje: {
    width: 15,
    height: 15,
    borderRadius: 8,
    border: LIJN,
    alignItems: "center",
    justifyContent: "center",
  },
  bolletjeAan: {
    width: 15,
    height: 15,
    borderRadius: 8,
    border: "1.4 solid #111",
    alignItems: "center",
    justifyContent: "center",
  },
  keuzeTekst: { fontSize: 13 },
  keuzeTekstAan: { fontSize: 13, fontFamily: "Helvetica-Bold" },

  tweeKolommen: { flexDirection: "row", gap: 22 },
  halveRij: { flexDirection: "row", alignItems: "flex-end", width: "48%", marginBottom: 10 },
  halfLabel: { fontSize: 11, width: 108 },

  // Story 10.80: ontworming als tabel (links), opmerkingen ernaast (rechts).
  onderaan: { flexDirection: "row", gap: 18, marginTop: 2, flexGrow: 1 },
  ontwormingKolom: { width: "44%" },
  opmerkingenKolom: { flexGrow: 1 },
  blokLabel: { fontSize: 11, marginBottom: 3 },
  tabelKop: { flexDirection: "row", borderBottom: LIJN, paddingBottom: 1 },
  tabelKopTekst: { fontSize: 8 },
  tabelRij: { flexDirection: "row", alignItems: "flex-end", borderBottom: "0.6 solid #111", height: 16 },
  colDatum: { width: 62 },
  colProduct: { flexGrow: 1 },
  tabelWaarde: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  opmerkingenVak: { border: LIJN, flexGrow: 1, minHeight: 74 },

  voet: { marginTop: 8, fontSize: 7.5, color: "#777", textAlign: "right" },
});
/**
 * Het vinkje wordt **getekend**, niet als letterteken gezet: de standaard
 * PDF-fonts (Helvetica) hebben geen ✓ in hun tekenset, dus een tekstvinkje komt
 * er als een leeg vakje of een verkeerd teken uit.
 */
function Vinkje() {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      <Polyline
        points="1.2,5.3 3.9,8.2 8.8,1.6"
        stroke={INKT}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function Keuzes({ opties }: { opties: KennelCardOption[] }) {
  return (
    <View style={styles.keuzes}>
      {opties.map((optie) => (
        <View key={optie.label} style={styles.keuze}>
          <View style={optie.gemarkeerd ? styles.bolletjeAan : styles.bolletje}>
            {optie.gemarkeerd ? <Vinkje /> : null}
          </View>
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
  // Story 10.80 (Sven): "bij in huis is eigenlijk de intake en mag ook miss naast reden van intake".
  const inHuis = [kaart.inHuisSinds, kaart.redenIntake].filter(Boolean).join(" · ");

  return (
    <Document title={`Kennelkaart ${kaart.naam}`}>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.kop}>
          <View style={styles.kopLinks}>
            <Text style={styles.naamLabel}>Naam</Text>
            {kaart.naam ? (
              <View style={styles.naamRij}>
                <Text style={styles.naam}>{kaart.naam}</Text>
                {kaart.echteNaam ? <Text style={styles.echteNaam}>{`(${kaart.echteNaam})`}</Text> : null}
              </View>
            ) : (
              <View style={styles.naamLeeg} />
            )}
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

        <Regel label="Ras" waarde={kaart.ras} />

        <View style={styles.rij}>
          <Text style={styles.label}>Geslacht</Text>
          <Keuzes opties={kaart.geslacht} />
        </View>

        <View style={styles.rij}>
          <Text style={styles.label}>Steriel</Text>
          <Keuzes opties={kaart.steriel} />
        </View>

        <View style={styles.tweeKolommen}>
          <View style={styles.halveRij}>
            <Text style={styles.halfLabel}>Geboortedatum</Text>
            <View style={styles.waardeLijn}>
              <Text style={styles.waarde}>{kaart.geboortedatum}</Text>
            </View>
          </View>
          <View style={styles.halveRij}>
            <Text style={styles.halfLabel}>Gevaccineerd</Text>
            <View style={styles.waardeLijn}>
              <Text style={styles.waarde}>{kaart.gevaccineerd}</Text>
            </View>
          </View>
        </View>

        <View style={styles.onderaan}>
          {/* Story 10.80 (Sven): "korte data met daarnaast ontwormingsproduct". Oudste bovenaan,
              lege regels eronder om met de hand bij te schrijven. */}
          <View style={styles.ontwormingKolom}>
            <Text style={styles.blokLabel}>Ontworming</Text>
            <View style={styles.tabelKop}>
              <Text style={[styles.colDatum, styles.tabelKopTekst]}>Datum</Text>
              <Text style={[styles.colProduct, styles.tabelKopTekst]}>Product</Text>
            </View>
            {kaart.ontwormingen.map((o, i) => (
              <View key={`o-${i}`} style={styles.tabelRij}>
                <Text style={[styles.colDatum, styles.tabelWaarde]}>{o.datum}</Text>
                <Text style={[styles.colProduct, styles.tabelWaarde]}>{o.product}</Text>
              </View>
            ))}
            {Array.from({ length: kaart.ontwormingLegeRegels }, (_, i) => (
              <View key={`leeg-${i}`} style={styles.tabelRij} />
            ))}
          </View>

          <View style={styles.opmerkingenKolom}>
            <Text style={styles.blokLabel}>Opmerkingen</Text>
            <View style={styles.opmerkingenVak} />
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Regel label="In huis sinds" waarde={inHuis} />
        </View>

        <Text style={styles.voet}>Dierenasiel Ninove</Text>
      </Page>
    </Document>
  );
}