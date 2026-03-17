import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const csvPath = join(repoRoot, "docs", "i18n", "translation-workbench.csv");
const force = process.argv.includes("--force");

function parseCsv(text) {
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

function toCsv(rows) {
  return `${rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    )
    .join("\n")}\n`;
}

function translateHeuristic(value) {
  const phraseMap = {
    "Add a filter": "Filter hinzufügen",
    "No filters applied": "Keine Filter aktiv",
    "Remove filter": "Filter entfernen",
    Where: "Wobei",
    And: "Und",
    Or: "Oder",
    Property: "Eigenschaft",
    Operator: "Operator",
    "Value...": "Wert...",
    "Value…": "Wert…",
    "Sign in": "Anmelden",
    "Create account": "Konto erstellen",
    "Create one": "Konto erstellen",
    "Back to sign in": "Zurück zur Anmeldung",
    "Check your email": "Prüfe deine E-Mail",
    "Email is required.": "E-Mail ist erforderlich.",
    "Enter a valid email address.": "Gib eine gültige E-Mail-Adresse ein.",
    "Enter your email and we'll send you a reset link.":
      "Gib deine E-Mail-Adresse ein und wir senden dir einen Zurücksetzungslink.",
    "Forgot password?": "Passwort vergessen?",
    "Confirm password": "Passwort bestätigen",
    "Confirm new password": "Neues Passwort bestätigen",
    "New password": "Neues Passwort",
    "No uploads yet": "Noch keine Uploads",
    "No recent searches yet.": "Noch keine letzten Suchen.",
    "No photo attached": "Kein Foto angehängt",
    "No projects found": "Keine Projekte gefunden",
    "No projects match your filters": "Keine Projekte passen zu deinen Filtern",
    "Map style": "Kartenstil",
    "Photo map": "Fotokarte",
    "Historic map": "Historische Karte",
    "Street map": "Straßenkarte",
    "Back to gallery": "Zurück zur Galerie",
    "Loading projects": "Projekte werden geladen",
    "Loading image details": "Bilddetails werden geladen",
    "Loading QR code": "QR-Code wird geladen",
    "Loading...": "Wird geladen...",
    "Loading…": "Wird geladen…",
    "Open settings overlay": "Einstellungs-Overlay öffnen",
    "Close settings overlay": "Einstellungs-Overlay schließen",
    "Main navigation": "Hauptnavigation",
    "Workspace Preferences": "Arbeitsbereich-Einstellungen",
    "Settings sections": "Einstellungsbereiche",
    "Upload failure alerts": "Upload-Fehlerhinweise",
    "Map Preferences": "Karten-Einstellungen",
    "Search Tuning": "Such-Optimierung",
    "Data and Privacy": "Daten und Datenschutz",
    "Invite Management": "Einladungsverwaltung",
    ". Click it to activate your account.":
      ". Klicke darauf, um dein Konto zu aktivieren.",
    "Add files to start. Status dots and lane filters appear once files enter the queue.":
      "Füge Dateien hinzu, um zu starten. Statuspunkte und Spurfilter erscheinen, sobald Dateien in die Warteschlange gelangen.",
    "Add photos, videos, PDFs, and Office files for the active project.":
      "Füge Fotos, Videos, PDFs und Office-Dateien für das aktive Projekt hinzu.",
    "Already have an account?": "Hast du bereits ein Konto?",
    "Don't have an account?": "Noch kein Konto?",
    "Choose a strong password for your account.":
      "Wähle ein sicheres Passwort für dein Konto.",
    "Drag &amp; drop files here": "Dateien hierher ziehen und ablegen",
    "Drag files here or click to select":
      "Dateien hierher ziehen oder zum Auswählen klicken",
    "Full name is required.": "Vollständiger Name ist erforderlich.",
    "GPS assignment disabled for this file type.":
      "GPS-Zuweisung ist für diesen Dateityp deaktiviert.",
    "GPS assignment is disabled for this file type.":
      "GPS-Zuweisung ist für diesen Dateityp deaktiviert.",
    "No GPS: this item can only belong to one project.":
      "Kein GPS: Dieser Eintrag kann nur zu einem Projekt gehören.",
    "This feature is coming soon.": "Diese Funktion kommt bald.",
    "Try a different address or pin manually.":
      "Versuche eine andere Adresse oder setze den Pin manuell.",
    "Try another search or reset your status filter.":
      "Versuche eine andere Suche oder setze deinen Statusfilter zurück.",
    "We sent a confirmation link to":
      "Wir haben einen Bestätigungslink an folgende Adresse gesendet:",
    "We sent a password reset link to":
      "Wir haben einen Link zum Zurücksetzen des Passworts an folgende Adresse gesendet:",
    "Welcome back to Feldpost": "Willkommen zurück bei Feldpost",
  };

  if (phraseMap[value]) return phraseMap[value];

  // Keep unknown phrases untouched to avoid mixed DE/EN fragments.
  return value;
}

const csv = readFileSync(csvPath, "utf8");
const rows = parseCsv(csv);
const header = rows[0];
const normalizedHeader = header.map((cell, idx) => {
  const raw = String(cell);
  const withoutBom = idx === 0 ? raw.replace(/^\ufeff/, "") : raw;
  return withoutBom.trim().toLowerCase();
});
const enIdx = normalizedHeader.indexOf("en");
const deIdx = normalizedHeader.indexOf("de");

if (enIdx === -1 || deIdx === -1) {
  throw new Error("Could not find en/de columns in translation-workbench.csv");
}

let changed = 0;
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const en = (row[enIdx] ?? "").trim();
  const de = (row[deIdx] ?? "").trim();

  if (!en) continue;
  if (!force && de && de !== en) continue;

  const translated = translateHeuristic(en);
  if (translated !== de) {
    row[deIdx] = translated;
    changed++;
  }
}

writeFileSync(csvPath, toCsv(rows), "utf8");
console.log(`Updated de translations: ${changed} (force=${force})`);
