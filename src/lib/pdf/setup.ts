import { Font } from "@react-pdf/renderer";

/**
 * Zet automatische woordafbreking uit in álle PDF's.
 *
 * @react-pdf breekt standaard af met een Engelse regel. Op een Nederlands
 * rapport levert dat "Gecastreerd & uit-gezet" op, en op een veld als
 * `#K1,K7,K12,K13,K18` zelfs "#-" gevolgd door de rest — wat eruitziet als een
 * fout in de gegevens. Gezien in R14 (zwerfkatten), maar het gold voor elke PDF.
 *
 * Liever een woord dat naar de volgende regel springt dan een woord dat op de
 * verkeerde plaats gebroken wordt: een rapport dat naar een gemeentebestuur
 * gaat, mag er niet slordig uitzien.
 *
 * Importeer dit bestand bovenaan elk PDF-component — het registreren is een
 * neveneffect en gebeurt één keer per proces.
 */
Font.registerHyphenationCallback((word) => [word]);
