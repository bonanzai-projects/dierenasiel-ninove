import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/setup";
import { genderLabel } from "@/lib/utils";
import { animalTraitLines, type AnimalTraits } from "@/lib/animals/animal-traits";
import { posterSterielLabel, posterAgeLine } from "@/lib/posters/poster-format";
import type { Animal } from "@/types";

/**
 * Story 10.32 — affiche voor het bord buiten, nagemaakt naar het papieren blad
 * van het asiel: naam groot bovenaan, dan foto's + eigenschappen naast elkaar,
 * dan de kerngegevens, dan de vrije tekst. Alles in omkaderde blokken.
 */

const BORDER = "1 solid #111";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  name: { fontSize: 34, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 12 },

  columns: { flexDirection: "row", gap: 10 },
  photoBox: { width: "56%", border: BORDER, padding: 6 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photoCell: { width: "48.5%", height: 118, border: "0.5 solid #ccc" },
  photo: { width: "100%", height: "100%", objectFit: "cover" },
  photoEmpty: { width: "48.5%", height: 118, border: "0.5 solid #ddd", backgroundColor: "#fafafa" },
  noPhotos: { fontSize: 9, color: "#999", textAlign: "center", paddingVertical: 40 },

  traitsBox: { width: "44%", border: BORDER, padding: 8 },
  traitsTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  traitRow: { flexDirection: "row", marginBottom: 3.5 },
  traitLabel: { fontSize: 9 },
  traitValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  coreBox: { border: BORDER, borderTop: "0 solid #111", padding: 8 },
  coreRow: { flexDirection: "row", marginBottom: 2 },
  coreLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },

  textBox: { border: BORDER, borderTop: "0 solid #111", padding: 10, flexGrow: 1 },
  bodyText: { fontSize: 10, lineHeight: 1.5 },
  bodyEmpty: { fontSize: 9, color: "#999" },
});

export type AnimalPosterAnimal = Pick<
  Animal,
  "id" | "name" | "breed" | "gender" | "isNeutered" | "dateOfBirth" | "description"
>;

interface Props {
  animal: AnimalPosterAnimal;
  traits: AnimalTraits | null;
  /** Vooraf opgehaalde foto's als data-URL (zie `fetchImageAsDataUrl`). Max 4. */
  photos: string[];
}

function CoreRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coreRow}>
      <Text style={styles.coreLabel}>{label}: </Text>
      <Text>{value}</Text>
    </View>
  );
}

export default function AnimalPosterPdf({ animal, traits, photos }: Props) {
  const lines = animalTraitLines(traits);
  // Het raster is 2×2: bij 1 of 3 foto's blijven de resterende cellen leeg,
  // zodat de blokindeling van het papieren blad behouden blijft.
  const cells = photos.slice(0, 4);
  const emptyCells = Math.max(0, (cells.length <= 2 ? 2 : 4) - cells.length);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{animal.name}</Text>

        <View style={styles.columns}>
          <View style={styles.photoBox}>
            {cells.length === 0 ? (
              <Text style={styles.noPhotos}>Geen foto&apos;s beschikbaar</Text>
            ) : (
              <View style={styles.photoGrid}>
                {cells.map((src, i) => (
                  <View key={i} style={styles.photoCell}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={src} style={styles.photo} />
                  </View>
                ))}
                {Array.from({ length: emptyCells }, (_, i) => (
                  <View key={`empty-${i}`} style={styles.photoEmpty} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.traitsBox}>
            <Text style={styles.traitsTitle}>Eigenschappen</Text>
            {lines.map((line) => (
              <View key={line.key} style={styles.traitRow}>
                <Text style={styles.traitLabel}>{line.label}: </Text>
                <Text style={styles.traitValue}>{line.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.coreBox}>
          <CoreRow label="Ras" value={animal.breed || "niet gekend"} />
          <CoreRow label="Geslacht" value={genderLabel(animal.gender)} />
          <CoreRow label="Steriel" value={posterSterielLabel(animal.isNeutered)} />
          <CoreRow label="Leeftijd" value={posterAgeLine(animal.dateOfBirth)} />
        </View>

        <View style={styles.textBox}>
          {animal.description?.trim() ? (
            <Text style={styles.bodyText}>{animal.description.trim()}</Text>
          ) : (
            <Text style={styles.bodyEmpty}>
              Nog geen beschrijving ingevuld — vul die aan bij het dier zelf.
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
