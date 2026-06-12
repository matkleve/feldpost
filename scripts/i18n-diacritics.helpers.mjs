/**
 * Diacritic normalization for i18n locale columns.
 * Machine translation and legacy ASCII exports often drop accents/umlauts
 * or emit digraph fallbacks (de: ae/oe/ue) and mojibake (U+FFFD).
 */

/** @typedef {'de' | 'it' | 'en'} DiacriticLanguageCode */

/** @type {DiacriticLanguageCode[]} */
export const I18N_DIACRITIC_LANGUAGES = ["de", "it"];

/** Shared mojibake / punctuation repair for all locale columns. */
/** @type {Array<[RegExp, string]>} */
const SHARED_REPLACEMENTS = [
  [/ \uFFFD /g, " – "],
  [/\uFFFD None \uFFFD/g, "— None —"],
  [/(\d+)\uFFFD(\d)/g, "$1°$2"],
  [/Value\uFFFD/g, "Value…"],
  [/Valore\uFFFD/g, "Valore…"],
  [/Gruppe\uFFFD/g, "Gruppe…"],
  [/gruppo\uFFFD/g, "gruppo…"],
  [/maps\.google\.com\/\uFFFD/g, "maps.google.com/…"],
  [/corso\uFFFD/g, "corso…"],
  [/läuft\uFFFD/g, "läuft…"],
  [/erstellt\uFFFD/g, "erstellt…"],
  [/gesendet\uFFFD/g, "gesendet…"],
  [/aktualisiert\uFFFD/g, "aktualisiert…"],
  [/in corso\uFFFD/g, "in corso…"],
  [/\uFFFD{4,}/g, "••••••••"],
  [
    /JPEG \uFFFD PNG \uFFFD HEIC \uFFFD WebP \uFFFD MP4 \uFFFD MOV \uFFFD WebM \uFFFD PDF \uFFFD DOCX \uFFFD XLSX \uFFFD PPTX \uFFFD max/g,
    "JPEG – PNG – HEIC – WebP – MP4 – MOV – WebM – PDF – DOCX – XLSX – PPTX – max",
  ],
  [/\uFFFD/g, "…"],
];

/** @type {Array<[RegExp, string]>} */
export const DE_REPLACEMENTS = [
  [/\bStrasse\b/g, "Straße"],
  [/\bstrasse\b/g, "straße"],
  [/\bStrassen/g, "Straßen"],
  [/\bstrassen/g, "straßen"],
  [/\bGross\b/g, "Groß"],
  [/\bgross\b/g, "groß"],
  [/Grossbuchstaben/g, "Großbuchstaben"],
  [/grossbuchstaben/g, "großbuchstaben"],
  [/\bZurueck\b/g, "Zurück"],
  [/\bzurueck\b/g, "zurück"],
  [/\bZuruecksetzen\b/g, "Zurücksetzen"],
  [/\bzuruecksetzen\b/g, "zurücksetzen"],
  [/\bzurueckgesetzt\b/g, "zurückgesetzt"],
  [/\brueckgaengig\b/g, "rückgängig"],
  [/\bRueckgaengig\b/g, "Rückgängig"],
  [/\bWaehle\b/g, "Wähle"],
  [/\bwaehle\b/g, "wähle"],
  [/\bAuswaehlen\b/g, "Auswählen"],
  [/\bauswaehlen\b/g, "auswählen"],
  [/\bAusgewaehl/g, "Ausgewähl"],
  [/\bausgewaehl/g, "ausgewähl"],
  [/\bwaehl/g, "wähl"],
  [/\bWaehl/g, "Wähl"],
  [/\bLaeuft\b/g, "Läuft"],
  [/\blaeuft\b/g, "läuft"],
  [/\bPruefe\b/g, "Prüfe"],
  [/\bpruefe\b/g, "prüfe"],
  [/\bgueltig\b/g, "gültig"],
  [/\bGueltig\b/g, "Gültig"],
  [/\bgueltige\b/g, "gültige"],
  [/\bGueltige\b/g, "Gültige"],
  [/\bgueltiger\b/g, "gültiger"],
  [/\bGueltiger\b/g, "Gültiger"],
  [/\bgueltiges\b/g, "gültiges"],
  [/\bGueltiges\b/g, "Gültiges"],
  [/\bBestaetig/g, "Bestätig"],
  [/\bbestaetig/g, "bestätig"],
  [/\bVollstaendig\b/g, "Vollständig"],
  [/\bvollstaendig\b/g, "vollständig"],
  [/\bVollstaend/g, "Vollständ"],
  [/\bvollstaend/g, "vollständ"],
  [/\bPasswoerter\b/g, "Passwörter"],
  [/\bpasswoerter\b/g, "passwörter"],
  [/\bueberein\b/g, "überein"],
  [/\bUeberein\b/g, "Überein"],
  [/\baufgeloest\b/g, "aufgelöst"],
  [/\bAufgeloest\b/g, "Aufgelöst"],
  [/\baufloes/g, "auflös"],
  [/\bAufloes/g, "Auflös"],
  [/\boeffnen\b/g, "öffnen"],
  [/\bOeffnen\b/g, "Öffnen"],
  [/\bgeoeff/g, "geöff"],
  [/\bGeoeff/g, "Geöff"],
  [/\bKontextmenue\b/g, "Kontextmenü"],
  [/\bkontextmenue\b/g, "kontextmenü"],
  [/\bHausnaehe\b/g, "Hausnähe"],
  [/\bhausnaehe\b/g, "hausnähe"],
  [/\bStrassennaehe\b/g, "Straßennähe"],
  [/\bstrassennaehe\b/g, "straßennähe"],
  [/\bnaehe\b/g, "nähe"],
  [/\bNaehe\b/g, "Nähe"],
  [/\bhinzufuegen\b/g, "hinzufügen"],
  [/\bHinzufuegen\b/g, "Hinzufügen"],
  [/\bhinzugefuegt\b/g, "hinzugefügt"],
  [/\bHinzugefuegt\b/g, "Hinzugefügt"],
  [/\beinfueg/g, "einfüg"],
  [/\bEinfueg/g, "Einfüg"],
  [/\bfueg/g, "füg"],
  [/\bFueg/g, "Füg"],
  [/\bgeloescht\b/g, "gelöscht"],
  [/\bGeloescht\b/g, "Gelöscht"],
  [/\bloeschen\b/g, "löschen"],
  [/\bLoeschen\b/g, "Löschen"],
  [/\bloest\b/g, "löst"],
  [/\bLoest\b/g, "Löst"],
  [/\benthaelt\b/g, "enthält"],
  [/\bEnthaelt\b/g, "Enthält"],
  [/\bverfuegbar\b/g, "verfügbar"],
  [/\bVerfuegbar\b/g, "Verfügbar"],
  [/\bverfuegbaren\b/g, "verfügbaren"],
  [/\bVerfuegbaren\b/g, "Verfügbaren"],
  [/\bungueltig\b/g, "ungültig"],
  [/\bUngueltig\b/g, "Ungültig"],
  [/\bfuer\b/g, "für"],
  [/\bFuer\b/g, "Für"],
  [/\bmoeglicherweise\b/g, "möglicherweise"],
  [/\bMoeglicherweise\b/g, "Möglicherweise"],
  [/\baend/g, "änd"],
  [/\bAend/g, "Änd"],
  [/\bkoenn/g, "könn"],
  [/\bKoenn/g, "Könn"],
  [/\bursprueng/g, "ursprüng"],
  [/\bUrsprueng/g, "Ursprüng"],
  [/\bPrioritaet\b/g, "Priorität"],
  [/\bprioritaet\b/g, "priorität"],
  [/\bhaeng/g, "häng"],
  [/\bHaeng/g, "Häng"],
  [/\bGroess/g, "Groß"],
  [/\bgroess/g, "groß"],
  [/\bunterstuetz/g, "unterstütz"],
  [/\bUnterstuetz/g, "Unterstütz"],
  [/\bPraes/g, "Präs"],
  [/\bpraes/g, "präs"],
  [/\bEmpfaeng/g, "Empfäng"],
  [/\bempfaeng/g, "empfäng"],
  [/\bbenoetig/g, "benötig"],
  [/\bBenoetig/g, "Benötig"],
  [/\bUeberspr/g, "Überspr"],
  [/\bueberspr/g, "überspr"],
  [/\bLaender/g, "Länder"],
  [/\blaender/g, "länder"],
  [/\bhoeher/g, "höher"],
  [/\bHoeher/g, "Höher"],
  [/\bHoeh/g, "Höh"],
  [/\bhoeh/g, "höh"],
  [/\btraeger/g, "träger"],
  [/\bTraeger/g, "Träger"],
  [/\bhaelt/g, "hält"],
  [/\bHaelt/g, "Hält"],
  [/\bErhoeh/g, "Erhöh"],
  [/\berhoeh/g, "erhöh"],
  [/\boeffter/g, "öfter"],
  [/\bOeffter/g, "Öfter"],
  [/\bprimaer/g, "primär"],
  [/\bPrimaer/g, "Primär"],
  [/\bVorschlae/g, "Vorschlä"],
  [/\bvorschlae/g, "vorschlä"],
  [/\bMindestlaeng/g, "Mindestläng"],
  [/\bmindestlaeng/g, "mindestläng"],
  [/\bAbfragelaeng/g, "Abfrageläng"],
  [/\babfragelaeng/g, "abfrageläng"],
  [/\bwaere/g, "wäre"],
  [/\bWaere/g, "Wäre"],
  [/f\uFFFDg/g, "füg"],
  [/F\uFFFDg/g, "Füg"],
  [/f\uFFFDr/g, "für"],
  [/F\uFFFDr/g, "Für"],
  [/best\uFFFDtig/g, "bestätig"],
  [/Best\uFFFDtig/g, "Bestätig"],
  [/L\uFFFDsch/g, "Lösch"],
  [/l\uFFFDsch/g, "lösch"],
  [/schlie\uFFFD/g, "schließ"],
  [/Schlie\uFFFD/g, "Schließ"],
  [/Zus\uFFFDtz/g, "Zusätz"],
  [/z\uFFFDtz/g, "zätz"],
  [/M\uFFFDchtest/g, "Möchtest"],
  [/m\uFFFDchtest/g, "möchtest"],
  [/endg\uFFFDltig/g, "endgültig"],
  [/verf\uFFFDgbar/g, "verfügbar"],
  [/geh\uFFFDren/g, "gehören"],
  [/hinzuf\uFFFD/g, "hinzufü"],
  [/Hinzuf\uFFFD/g, "Hinzufü"],
  [/Zur\uFFFDck/g, "Zurück"],
  [/zur\uFFFDck/g, "zurück"],
  [/\uFFFDndern/g, "ändern"],
  [/\uFFFDnder/g, "änder"],
  [/Ausw\uFFFDhl/g, "Auswähl"],
  [/ausw\uFFFDhl/g, "auswähl"],
  [/W\uFFFDhl/g, "Wähl"],
  [/w\uFFFDhl/g, "wähl"],
  [/pr\uFFFDf/g, "prüf"],
  [/Pr\uFFFDf/g, "Prüf"],
  [/Gr\uFFFD\uFFFD/g, "Größ"],
  [/gr\uFFFD\uFFFD/g, "größ"],
  [/Gro\uFFFD/g, "Groß"],
  [/gro\uFFFD/g, "groß"],
  [/Schl\uFFFDssel/g, "Schlüssel"],
  [/schl\uFFFDssel/g, "schlüssel"],
  [/L\uFFFDdt/g, "Lädt"],
  [/l\uFFFDdt/g, "lädt"],
  [/n\uFFFDch/g, "näch"],
  [/Endg\uFFFDltig/g, "Endgültig"],
  [/l\uFFFDsch/g, "lösch"],
  [/Prim\uFFFDr/g, "Primär"],
  [/prim\uFFFDr/g, "primär"],
  [/Stra\uFFFDe/g, "Straße"],
  [/stra\uFFFDe/g, "straße"],
  [/Sch\uFFFDnbrunner/g, "Schönbrunner"],
  [/sch\uFFFDnbrunner/g, "schönbrunner"],
  [/Abl\uFFFDuf/g, "Abläuf"],
  [/abl\uFFFDuf/g, "abläuf"],
  [/Zur\uFFFDckweisen/g, "Zurückweisen"],
  [/zur\uFFFDckweisen/g, "zurückweisen"],
];

/** @type {Array<[RegExp, string]>} */
export const IT_REPLACEMENTS = [
  [/\bgia\b/g, "già"],
  [/\bGia\b/g, "Già"],
  [/\bcitta\b/g, "città"],
  [/\bCitta\b/g, "Città"],
  [/\bpriorita\b/g, "priorità"],
  [/\bPriorita\b/g, "Priorità"],
  [/\bpuo\b/g, "può"],
  [/\bPuo\b/g, "Può"],
  [/\bverra\b/g, "verrà"],
  [/\bVerra\b/g, "Verrà"],
  [/\brimuovera\b/g, "rimuoverà"],
  [/\bRimuovera\b/g, "Rimuoverà"],
  [/\bperche\b/g, "perché"],
  [/\bPerche\b/g, "Perché"],
  [/\bdensita\b/g, "densità"],
  [/\bDensita\b/g, "Densità"],
  [/densit\uFFFD/g, "densità"],
  [/\bproprieta\b/g, "proprietà"],
  [/\bProprieta\b/g, "Proprietà"],
  [/\bfunzionalita\b/g, "funzionalità"],
  [/\bFunzionalita\b/g, "Funzionalità"],
  [/\btonalita\b/g, "tonalità"],
  [/\bTonalita\b/g, "Tonalità"],
  [/\bmodalita\b/g, "modalità"],
  [/\bModalita\b/g, "Modalità"],
  [/\bsara\b/g, "sarà"],
  [/\bSara\b/g, "Sarà"],
  [/\bpiu\b/g, "più"],
  [/\bPiu\b/g, "Più"],
  [/\btornera\b/g, "tornerà"],
  [/\bTornera\b/g, "Tornerà"],
  [/\briaprira\b/g, "riaprirà"],
  [/\bRiaprira\b/g, "Riaprirà"],
  [/\bspostera\b/g, "sposterà"],
  [/\bSpostera\b/g, "Sposterà"],
  [/\b non e /g, " non è "],
  [/\bNon e /g, "Non è "],
  [/Citt\uFFFD/g, "Città"],
  [/verr\uFFFD/g, "verrà"],
  [/pu\uFFFD/g, "può"],
  [/propriet\uFFFD/g, "proprietà"],
  [/funzionalit\uFFFD/g, "funzionalità"],
  [/Tonalit\uFFFD/g, "Tonalità"],
  [/Modalit\uFFFD/g, "Modalità"],
  [/sar\uFFFD/g, "sarà"],
  [/c'\uFFFD/g, "c'è"],
  [/\uFFFD stato/g, "è stato"],
  [/password \uFFFD/g, "password è"],
  [/passaggio \uFFFD/g, "passaggio è"],
  [/GPS \uFFFD/g, "GPS è"],
  [/torner\uFFFD/g, "tornerà"],
  [/riaprir\uFFFD/g, "riaprirà"],
  [/passaggio – /g, "passaggio è "],
  [/GPS – /g, "GPS è "],
  [/password – /g, "password è "],
  [/Media Marker – /g, "Media Marker è "],
  [/Nuova password best\uFFFDetigen/g, "Conferma nuova password"],
  [/best\uFFFDetigen/g, "conferma"],
];

/** @type {Record<DiacriticLanguageCode, Array<[RegExp, string]>>} */
const LANGUAGE_REPLACEMENTS = {
  de: DE_REPLACEMENTS,
  it: IT_REPLACEMENTS,
  en: [],
};

/** @param {string} value @param {Array<[RegExp, string]>} replacements */
function applyReplacements(value, replacements) {
  let out = value;
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** @param {string} lang @param {string} value */
export function normalizeForLanguage(lang, value) {
  const language = String(lang).toLowerCase();
  let out = value;
  const languageRules = LANGUAGE_REPLACEMENTS[language];
  if (languageRules) {
    out = applyReplacements(out, languageRules);
  }
  out = applyReplacements(out, SHARED_REPLACEMENTS);
  return out;
}

/** @deprecated Use normalizeForLanguage('de', value) */
export function normalizeGerman(value) {
  return normalizeForLanguage("de", value);
}

/** @param {string} text */
export function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}
