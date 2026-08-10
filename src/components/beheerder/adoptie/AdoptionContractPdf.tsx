import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/setup";
import { PDF_LETTERHEAD } from "@/lib/constants";
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica" },
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  orgBlock: { width: "60%" },
  orgName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  orgLine: { fontSize: 8, color: "#444", marginTop: 1 },
  // Title
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 10, textDecoration: "underline" },
  // Meta row (volgnr, datum, etc)
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 14, borderBottom: "0.5 solid #ccc", paddingBottom: 8 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 7, color: "#666", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  metaValue: { fontSize: 9, marginTop: 2, borderBottom: "0.5 solid #999", paddingBottom: 2, minHeight: 14 },
  // Section
  sectionHeader: { backgroundColor: "#1b4332", paddingVertical: 3, paddingHorizontal: 6, marginBottom: 4, marginTop: 10 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "white" },
  // Form fields
  fieldRow: { flexDirection: "row", marginBottom: 3 },
  fieldLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#333", width: 140 },
  fieldValue: { fontSize: 9, flex: 1, borderBottom: "0.5 dotted #999", paddingBottom: 1, minHeight: 12 },
  fieldValueShort: { fontSize: 9, borderBottom: "0.5 dotted #999", paddingBottom: 1, minHeight: 12, width: 120 },
  // Inline checkboxes
  checkRow: { flexDirection: "row", gap: 20, marginBottom: 3 },
  checkItem: { flexDirection: "row", gap: 4, alignItems: "center" },
  checkbox: { width: 10, height: 10, border: "0.5 solid #333" },
  checkboxChecked: { width: 10, height: 10, border: "0.5 solid #333", backgroundColor: "#1b4332" },
  checkLabel: { fontSize: 8, color: "#333" },
  // Conditions
  conditionsTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", textDecoration: "underline", marginTop: 10, marginBottom: 4 },
  conditionItem: { fontSize: 7.5, lineHeight: 1.5, marginBottom: 2, color: "#333" },
  conditionBullet: { fontFamily: "Helvetica-Bold" },
  // Signatures
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  sigBlock: { width: "45%", borderTop: "0.5 solid #333", paddingTop: 4 },
  sigLabel: { fontSize: 8, color: "#555" },
  sigSubtext: { fontSize: 7, color: "#888", marginTop: 2 },
  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7, color: "#aaa" },
});

function FormField({ label, value, short }: { label: string; value?: string; short?: boolean }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={short ? s.fieldValueShort : s.fieldValue}>{value ?? ""}</Text>
    </View>
  );
}

function Checkbox({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <View style={s.checkItem}>
      <View style={checked ? s.checkboxChecked : s.checkbox} />
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

interface ContractData {
  contractDate: string;
  contractNr?: string;
  // Adoptant
  firstName: string;
  lastName: string;
  address: string;
  dateOfBirth?: string;
  birthPlace?: string;
  rijksregister?: string;
  phone: string;
  email: string;
  // Dier
  animalName: string;
  species: string;
  breed: string;
  animalDateOfBirth?: string;
  identificationNr?: string;
  gender: string;
  isNeutered: boolean;
  color?: string;
  passportNr?: string;
  description?: string;
  // Contract
  paymentAmount: string;
  paymentMethod: string;
  notes?: string;
}

// ==========================================
// CONTRACT HONDEN
// ==========================================
function HondenContract({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.headerRow}>
        <View style={s.orgBlock}>
          <Text style={s.orgName}>Dierenasiel Ninove vzw</Text>
          <Text style={s.orgLine}>Minnehofstraat 24</Text>
          <Text style={s.orgLine}>9400 Denderwindeke</Text>
          <Text style={s.orgLine}>054/32 16 79</Text>
          <Text style={s.orgLine}>Vergunning nr: HK 30408195</Text>
        </View>
      </View>

      <Text style={s.title}>Adoptiecontract honden</Text>

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Datum</Text>
          <Text style={s.metaValue}>{data.contractDate}</Text>
        </View>
      </View>

      {/* Gegevens adoptant */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gegevens adoptant</Text></View>
      <FormField label="Naam:" value={`${data.lastName} ${data.firstName}`} />
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Geboortedatum:</Text>
        <Text style={s.fieldValueShort}>{data.dateOfBirth ?? ""}</Text>
        <Text style={[s.fieldLabel, { width: 80, marginLeft: 12 }]}>Rijksregister:</Text>
        <Text style={s.fieldValue}>{data.rijksregister ?? ""}</Text>
      </View>
      <FormField label="Adres:" value={data.address} />
      <FormField label="Tel:" value={data.phone} />
      <FormField label="E-mailadres:" value={data.email} />

      {/* Gegevens van het dier */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gegevens van het dier</Text></View>
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Naam:</Text>
        <Text style={s.fieldValueShort}>{data.animalName}</Text>
        <Text style={[s.fieldLabel, { width: 30, marginLeft: 12 }]}>Ras:</Text>
        <Text style={s.fieldValue}>{data.breed}</Text>
      </View>
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Geslacht:</Text>
        <Text style={s.fieldValueShort}>{data.gender}</Text>
        <Text style={[s.fieldLabel, { width: 90, marginLeft: 12 }]}>Geboortedatum:</Text>
        <Text style={s.fieldValue}>{data.animalDateOfBirth ?? ""}</Text>
      </View>
      <FormField label="Kleur:" value={data.color} />
      <FormField label="Chip:" value={data.identificationNr} />
      <FormField label="Nr. vaccinatieboekje:" value={data.passportNr} />
      <FormField label="Adoptiebijdrage:" value={`${data.paymentAmount} EUR (${data.paymentMethod})`} />
      <FormField label="Extra opmerkingen:" value={data.notes} />

      {/* Adoptievoorwaarden */}
      <Text style={s.conditionsTitle}>Adoptievoorwaarden</Text>
      {DOG_CONDITIONS.map((c, i) => (
        <Text key={i} style={s.conditionItem}>
          <Text style={s.conditionBullet}>{"✦ "}</Text>{c}
        </Text>
      ))}

      <Text style={[s.conditionItem, { marginTop: 4 }]}>
        De beide partijen verklaren samen te hebben doorgenomen (de correcte hokjes aankruisen):
      </Text>
      <View style={{ marginLeft: 16, marginTop: 3, gap: 3 }}>
        <View style={s.checkItem}>
          <View style={s.checkbox} />
          <Text style={[s.checkLabel, { fontSize: 7.5 }]}>De lijst van vragen die gesteld moeten worden voor de verwerving van een hond.</Text>
        </View>
        <View style={s.checkItem}>
          <View style={s.checkbox} />
          <Text style={[s.checkLabel, { fontSize: 7.5 }]}>De verklaring van afstand van de hond.</Text>
        </View>
        <View style={s.checkItem}>
          <View style={s.checkbox} />
          <Text style={[s.checkLabel, { fontSize: 7.5 }]}>De evaluatiefiche van het gedrag in het asiel.</Text>
        </View>
      </View>
      <Text style={[s.conditionItem, { marginTop: 3 }]}>
        en hebben dus kennis genomen met bepaalde bijzonderheden van de hond.
      </Text>

      {/* Handtekeningen */}
      <View style={s.sigRow}>
        <View style={s.sigBlock}>
          <Text style={s.sigLabel}>De verantwoordelijke Dierenasiel Ninove vzw</Text>
        </View>
        <View style={s.sigBlock}>
          <Text style={s.sigLabel}>Gelezen en goedgekeurd + handtekening</Text>
          <Text style={s.sigSubtext}>De adoptant</Text>
        </View>
      </View>

      <Text style={s.footer}>{PDF_LETTERHEAD.name} — Adoptiecontract honden</Text>
    </Page>
  );
}

// ==========================================
// CONTRACT KATTEN/KITTENS
// ==========================================
function KattenContract({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.headerRow}>
        <View style={s.orgBlock}>
          <Text style={s.orgName}>Dierenasiel Ninove Vzw</Text>
          <Text style={s.orgLine}>MINNEHOFSTRAAT 24</Text>
          <Text style={s.orgLine}>9400 DENDERWINDEKE</Text>
          <Text style={s.orgLine}>054/321879</Text>
          <Text style={s.orgLine}>www.dierenasielninove.be</Text>
          <Text style={s.orgLine}>HK: 30408195</Text>
        </View>
      </View>

      <Text style={s.title}>Adoptiecontract kittens/katten</Text>

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Volgnr</Text>
          <Text style={s.metaValue}>{data.contractNr ?? ""}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Opgemaakt op</Text>
          <Text style={s.metaValue}>{data.contractDate}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Opgemaakt te</Text>
          <Text style={s.metaValue}>Denderwindeke</Text>
        </View>
      </View>

      {/* Gegevens adoptant */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gegevens adoptant</Text></View>
      <FormField label="Naam:" value={`${data.lastName} ${data.firstName}`} />
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Geboortedatum:</Text>
        <Text style={s.fieldValueShort}>{data.dateOfBirth ?? ""}</Text>
        <Text style={[s.fieldLabel, { width: 80, marginLeft: 12 }]}>Rijksregister:</Text>
        <Text style={s.fieldValue}>{data.rijksregister ?? ""}</Text>
      </View>
      <FormField label="Adres:" value={data.address} />
      <FormField label="Tel:" value={data.phone} />
      <FormField label="E-mailadres:" value={data.email} />

      {/* Gegevens van het dier */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gegevens van het dier</Text></View>
      <FormField label="Naam:" value={data.animalName} />
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Soort:</Text>
        <Text style={s.fieldValueShort}>{data.species}</Text>
        <Text style={[s.fieldLabel, { width: 30, marginLeft: 12 }]}>Ras:</Text>
        <Text style={s.fieldValue}>{data.breed}</Text>
      </View>
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Geslacht:</Text>
        <Text style={s.fieldValueShort}>{data.gender}</Text>
        <Text style={[s.fieldLabel, { width: 90, marginLeft: 12 }]}>Geboortedatum:</Text>
        <Text style={s.fieldValue}>{data.animalDateOfBirth ?? ""}</Text>
      </View>
      <FormField label="Kleur:" value={data.color} />
      <FormField label="Chip:" value={data.identificationNr} />
      <FormField label="Nr. vaccinatieboekje:" value={data.passportNr} />
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Adoptiebijdrage cash:</Text>
        <Text style={s.fieldValueShort}>{data.paymentMethod === "cash" ? `${data.paymentAmount} EUR` : ""}</Text>
        <Text style={[s.fieldLabel, { width: 70, marginLeft: 12 }]}>Bancontact:</Text>
        <Text style={s.fieldValue}>{data.paymentMethod !== "cash" ? `${data.paymentAmount} EUR (${data.paymentMethod})` : ""}</Text>
      </View>
      <FormField label="Extra opmerkingen:" value={data.notes} />

      {/* Adoptievoorwaarden */}
      <Text style={s.conditionsTitle}>Adoptievoorwaarden</Text>
      {CAT_CONDITIONS.map((c, i) => (
        <Text key={i} style={s.conditionItem}>
          <Text style={s.conditionBullet}>{"✦ "}</Text>{c}
        </Text>
      ))}

      {/* Handtekeningen */}
      <View style={s.sigRow}>
        <View style={s.sigBlock}>
          <Text style={s.sigLabel}>De verantwoordelijke Dierenasiel Ninove vzw</Text>
        </View>
        <View style={s.sigBlock}>
          <Text style={s.sigLabel}>Gelezen en goedgekeurd + handtekening</Text>
          <Text style={s.sigSubtext}>De adoptant</Text>
        </View>
      </View>

      <Text style={s.footer}>{PDF_LETTERHEAD.name} — Adoptiecontract kittens/katten</Text>
    </Page>
  );
}

// ==========================================
// CONTRACT ANDERE DIEREN
// ==========================================
function AndereDierenContract({ data }: { data: ContractData }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.headerRow}>
        <View style={s.orgBlock}>
          <Text style={s.orgName}>Dierenasiel Ninove Vzw</Text>
          <Text style={s.orgLine}>Minnehofstraat 24 Denderwindeke</Text>
          <Text style={s.orgLine}>054/32 16 79</Text>
          <Text style={s.orgLine}>dierenasielnino@hotmail.com — www.dierenasielninove.be</Text>
          <Text style={s.orgLine}>HK 30408195</Text>
        </View>
      </View>

      <Text style={s.title}>Adoptie andere dieren</Text>

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Volgnr</Text>
          <Text style={s.metaValue}>{data.contractNr ?? ""}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Opgemaakt op</Text>
          <Text style={s.metaValue}>{data.contractDate}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Opgemaakt te</Text>
          <Text style={s.metaValue}>Denderwindeke</Text>
        </View>
      </View>

      {/* Gegevens van de Adoptant */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gegevens van de Adoptant</Text></View>
      <FormField label="Familienaam:" value={data.lastName} />
      <FormField label="Voornaam:" value={data.firstName} />
      <FormField label="Adres:" value={data.address} />
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Geboortedatum:</Text>
        <Text style={s.fieldValueShort}>{data.dateOfBirth ?? ""}</Text>
        <Text style={[s.fieldLabel, { width: 90, marginLeft: 12 }]}>Geboorteplaats:</Text>
        <Text style={s.fieldValue}>{data.birthPlace ?? ""}</Text>
      </View>
      <FormField label="Telefoon (gsm):" value={data.phone} />
      <FormField label="Emailadres:" value={data.email} />

      {/* Gegevens van het dier */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Gegevens van het dier</Text></View>
      <FormField label="Naam:" value={data.animalName} />
      <FormField label="Dierensoort:" value={data.species} />
      <FormField label="Ras:" value={data.breed} />
      <FormField label="Geboortedatum:" value={data.animalDateOfBirth} />
      <FormField label="Identificatienummer:" value={data.identificationNr} />
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Geslacht:</Text>
        <View style={[s.checkRow, { marginBottom: 0 }]}>
          <Checkbox label="Mannelijk" checked={data.gender === "reu" || data.gender === "mannetje" || data.gender === "kater"} />
          <Checkbox label="Vrouwelijk" checked={data.gender === "teef" || data.gender === "vrouwtje" || data.gender === "poes"} />
        </View>
      </View>
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>Gesteriliseerd:</Text>
        <View style={[s.checkRow, { marginBottom: 0 }]}>
          <Checkbox label="Ja" checked={data.isNeutered === true} />
          <Checkbox label="Neen" checked={data.isNeutered === false} />
        </View>
      </View>
      <FormField label="Nr Paspoort en/of vaccinatieboekje:" value={data.passportNr} />
      <FormField label="Beschrijving vacht / kenmerken:" value={data.description} />

      {/* Bijdragen en kosten */}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Bijdragen en kosten</Text></View>
      <FormField label="Verblijfskosten:" value="" />
      <FormField label="Totaal betaald bedrag:" value={`${data.paymentAmount} EUR (${data.paymentMethod})`} />

      {/* Handtekeningen */}
      <View style={s.sigRow}>
        <View style={[s.sigBlock, { border: "0.5 solid #333", padding: 8, minHeight: 60 }]}>
          <Text style={s.sigLabel}>Handtekening adoptant</Text>
        </View>
        <View style={[s.sigBlock, { border: "0.5 solid #333", padding: 8, minHeight: 60 }]}>
          <Text style={s.sigLabel}>Handtekening afgevaardigde Dierenasiel</Text>
        </View>
      </View>

      <Text style={s.footer}>{PDF_LETTERHEAD.name} — Adoptie andere dieren</Text>
    </Page>
  );
}

// ==========================================
// ADOPTIEVOORWAARDEN
// ==========================================
const DOG_CONDITIONS = [
  "Het dier zal binnenshuis verblijven, of uitzonderlijk een ruime loopren krijgen, maar zal niet aan een ketting vastgelegd worden.",
  "Het welzijn van het dier dient gerespecteerd te worden wat betreft de voeding, de verzorging en de huisvesting.",
  "Met het dier zal niet gefokt worden. Indien het dier toch nakomelingen krijgt dan zijn deze eigendom van Dierenasiel Ninove en zullen deze op speelleeftijd naar Dierenasiel Ninove gebracht worden.",
  "De adoptie is persoonlijk. Indien het dier niet meer gewenst is, wordt het teruggebracht naar het Dierenasiel Ninove. Indien het dier doorgegeven of afgestaan wordt aan een ander asiel dan kan Dierenasiel Ninove vzw een financiële vergoeding van \u20AC250 euro eisen en kan Dierenasiel Ninove vzw de terug bezorging van het dier eisen.",
  "Elke adresverandering wordt kenbaar gemaakt, evenals sterfte van het dier bij de bevoegde instantie van de registratie van de chip, bij honden: DogID.",
  "Bij verlies van het dier wordt de bevoegde instantie van de registratie van de chip zo vlug mogelijk verwittigd evenals het dierenasiel. Alle maatregelen dienen genomen te worden om het dier zo vlug mogelijk terug te vinden.",
  "Bij terugbrenging van het dier zal het betaalde adoptiegeld niet terugbetaald worden of er wordt geen dier ter vervanging gegeven.",
  "Bij terugbrenging van het dier na 14 dagen kunnen er afstandskosten aangerekend worden.",
  "Dierenasiel Ninove vzw behoudt zich het recht om ten alle tijde het dier te bezoeken bij de adoptant en het welzijn te controleren van het dier. Indien het welzijn van het dier niet optimaal is en de adoptante deze niet wilt verbeteren kan de adoptie onmiddellijk ingetrokken worden.",
  "Bij niet-naleving van bovenvermelde voorwaarden behoudt de dierenasiel vzw het recht voor de adoptie onmiddellijk in te trekken.",
  "Door het plaatsen van mijn handtekening ontsla ik Dierenasiel Ninove vzw van alle verantwoordelijkheid van het dier, verklaar ik akkoord te gaan met de adoptievoorwaarden en verklaar ik bij het verbreken van de adoptievoorwaarden de sancties en eventuele vergoedingen te aanvaarden.",
];

const CAT_CONDITIONS = [
  "Het welzijn van het dier dient gerespecteerd te worden wat betreft de voeding, de verzorging en de huisvesting.",
  "De adoptie is persoonlijk. Indien het dier niet meer gewenst is, wordt het teruggebracht naar het Dierenasiel Ninove. Indien het dier doorgegeven of afgestaan wordt aan een ander persoon of een ander asiel dan kan Dierenasiel Ninove vzw een financiële vergoeding van \u20AC200 euro eisen en kan Dierenasiel Ninove vzw de terug bezorging van het dier eisen.",
  "Elke adresverandering wordt kenbaar gemaakt, evenals sterfte van het dier bij de bevoegde instantie van de registratie van de chip, bij katten: CatID.",
  "Bij verlies van het dier wordt de bevoegde instantie van de registratie van de chip zo vlug mogelijk verwittigd evenals het dierenasiel. Alle maatregelen dienen genomen te worden om het dier zo vlug mogelijk terug te vinden.",
  "Bij terugbrenging van het dier zal het betaalde adoptiegeld niet terugbetaald worden of er wordt geen dier ter vervanging gegeven.",
  "Bij terugbrenging van het dier na 14 dagen kunnen er afstandskosten aangerekend worden.",
  "Dierenasiel Ninove vzw behoudt zich het recht om ten alle tijde het dier te bezoeken bij de adoptant en het welzijn te controleren van het dier. Indien het welzijn van het dier niet optimaal is en de adoptante deze niet wilt verbeteren kan de adoptie onmiddellijk ingetrokken worden.",
  "Bij niet-naleving van bovenvermelde voorwaarden behoudt de dierenasiel vzw het recht voor de adoptie onmiddellijk in te trekken.",
  "Alle kittens en katten worden gesteriliseerd/gecastreerd, gechipt met Europese paspoort, gevaccineerd, ontwormd en behandeld tegen vlooien voor ze geadopteerd worden.",
  "Adoptant erkent het risico op verborgen gebreken van het dier die door de dierenarts onmogelijk konden vastgesteld worden. Adoptant verbindt zich ertoe om in zo\u2019n geval Dierenasiel Ninove onmiddellijk op de hoogte te stellen.",
  "Door het plaatsen van mijn handtekening ontsla ik Dierenasiel Ninove vzw van alle verantwoordelijkheid van het dier, verklaar ik akkoord te gaan met de adoptievoorwaarden en verklaar ik bij het verbreken van de adoptievoorwaarden de sancties en eventuele vergoedingen te aanvaarden.",
];

// ==========================================
// MAIN EXPORT
// ==========================================
interface Props {
  data: ContractData;
}

export default function AdoptionContractPdf({ data }: Props) {
  const species = data.species.toLowerCase();

  return (
    <Document>
      {species === "hond" ? (
        <HondenContract data={data} />
      ) : species === "kat" ? (
        <KattenContract data={data} />
      ) : (
        <AndereDierenContract data={data} />
      )}
    </Document>
  );
}

export type { ContractData };
