import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import type { DraaiboekPrintModel } from "@/lib/events/draaiboek-print";

/**
 * Story 13.4 — het draaiboek om af te drukken.
 *
 * Staand A4, want het is een lijst en geen tabel. Het vakje vooraan is er om met
 * de hand aan te kruisen: op de dag zelf hangt het blad aan de muur.
 */
const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 10, fontFamily: "Helvetica" },
  org: { fontSize: 9, color: "#666" },
  titel: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1b4332", marginTop: 4 },
  ondertitel: { fontSize: 11, color: "#1b4332", marginTop: 2 },
  meta: { marginTop: 8, paddingBottom: 8, borderBottom: "1 solid #ccc" },
  metaRij: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metaLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" },
  metaWaarde: { fontSize: 10, color: "#111" },
  omschrijving: { marginTop: 8, fontSize: 9, color: "#374151" },

  fase: { marginTop: 14 },
  faseKop: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1b4332" },
  faseHint: { fontSize: 8, color: "#6b7280", marginTop: 1, marginBottom: 4 },

  taak: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottom: "0.5 solid #e5e7eb",
  },
  vakje: {
    width: 11,
    height: 11,
    border: "1 solid #4b5563",
    borderRadius: 2,
    marginRight: 8,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Bewust een gevuld blokje en geen vinkje: het standaard-lettertype van
  // @react-pdf heeft geen glyph voor een vinkje en tekent dan niets.
  vakjeGevuld: { width: 6, height: 6, backgroundColor: "#1b4332", borderRadius: 1 },
  taakTekst: { flex: 1, paddingRight: 6 },
  taakTitel: { fontSize: 10, color: "#111" },
  taakTitelDone: { fontSize: 10, color: "#9ca3af", textDecoration: "line-through" },
  taakNotitie: { fontSize: 8, color: "#6b7280", marginTop: 1 },
  moment: { width: 78, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
  wie: { width: 90, fontSize: 9, color: "#374151", textAlign: "right" },

  shiftKop: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1b4332", marginTop: 16 },
  shiftDag: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#374151", marginTop: 8 },
  shiftPost: { flexDirection: "row", marginTop: 3, paddingBottom: 2, borderBottom: "0.5 solid #e5e7eb" },
  shiftPostNaam: { width: 90, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#4b5563" },
  shiftRegels: { flex: 1, fontSize: 9, color: "#111" },
  // Breder dan de shiftkolom: "Geleend · terugbezorgd" mag niet afbreken.
  materiaalStatus: { width: 130, fontSize: 9, color: "#374151", textAlign: "right" },

  leeg: { marginTop: 20, fontSize: 10, color: "#6b7280", fontStyle: "italic" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#999",
  },
});

export default function DraaiboekPdf({ model }: { model: DraaiboekPrintModel }) {
  return (
    <Document title={`Draaiboek — ${model.titel}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.org}>Dierenasiel Ninove VZW — draaiboek</Text>
        <Text style={styles.titel}>{model.titel}</Text>
        <Text style={styles.ondertitel}>{model.ondertitel}</Text>

        <View style={styles.meta}>
          <View style={styles.metaRij}>
            {model.gegevens.map((g) => (
              <View key={g.label}>
                <Text style={styles.metaLabel}>{g.label}</Text>
                <Text style={styles.metaWaarde}>{g.waarde}</Text>
              </View>
            ))}
            {model.voortgang.total > 0 && (
              <View>
                <Text style={styles.metaLabel}>Afgevinkt</Text>
                <Text style={styles.metaWaarde}>
                  {model.voortgang.done} van {model.voortgang.total}
                </Text>
              </View>
            )}
          </View>
          {model.omschrijving !== "" && (
            <Text style={styles.omschrijving}>{model.omschrijving}</Text>
          )}
        </View>

        {model.leeg && (
          <Text style={styles.leeg}>
            Er staan nog geen taken in dit draaiboek. Vul ze aan in de backoffice en druk dit
            blad daarna opnieuw af.
          </Text>
        )}

        {model.fasen.map((fase) => (
          // wrap={false} zou een lange fase over de paginarand duwen; taken mogen
          // dus splitsen, maar de kop blijft bij wat erop volgt.
          <View key={fase.label} style={styles.fase}>
            <Text style={styles.faseKop} minPresenceAhead={40}>
              {fase.label}
            </Text>
            <Text style={styles.faseHint}>{fase.hint}</Text>

            {fase.taken.map((taak, index) => (
              <View key={`${fase.label}-${index}`} style={styles.taak} wrap={false}>
                <View style={styles.vakje}>{taak.done && <View style={styles.vakjeGevuld} />}</View>
                <Text style={styles.moment}>{taak.moment}</Text>
                <View style={styles.taakTekst}>
                  <Text style={taak.done ? styles.taakTitelDone : styles.taakTitel}>
                    {taak.titel}
                  </Text>
                  {taak.notitie !== "" && <Text style={styles.taakNotitie}>{taak.notitie}</Text>}
                </View>
                <Text style={styles.wie}>{taak.wie}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Story 13.6 — het blad "wie staat waar" hoort bij hetzelfde blad aan de muur. */}
        {model.shiftDagen.length > 0 && (
          <View>
            <Text style={styles.shiftKop} minPresenceAhead={60}>
              Wie staat waar
            </Text>
            {model.shiftDagen.map((dag) => (
              <View key={dag.label}>
                <Text style={styles.shiftDag}>{dag.label}</Text>
                {dag.posten.map((groep) => (
                  <View key={`${dag.label}-${groep.post}`} style={styles.shiftPost} wrap={false}>
                    <Text style={styles.shiftPostNaam}>{groep.post}</Text>
                    <Text style={styles.shiftRegels}>{groep.regels.join("   ·   ")}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Story 13.11 — wat we nodig hebben en wat er terug moet. */}
        {model.materialen.length > 0 && (
          <View>
            <Text style={styles.shiftKop} minPresenceAhead={60}>
              Materiaal
            </Text>
            {model.materialen.map((m, index) => (
              <View key={`materiaal-${index}`} style={styles.shiftPost} wrap={false}>
                <Text style={styles.shiftRegels}>{m.regel}</Text>
                <Text style={styles.materiaalStatus}>
                  {[m.herkomst, m.terug].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Afgedrukt op {model.afgedruktOp}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
