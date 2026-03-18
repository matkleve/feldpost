import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const csvPath = join(repoRoot, "docs", "i18n", "translation-workbench.csv");
const catalogPath = join(
  repoRoot,
  "apps",
  "web",
  "src",
  "app",
  "core",
  "i18n",
  "translation-catalog.ts",
);

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

const DE_REPLACEMENTS = [
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
  [/\boeffnen\b/g, "öffnen"],
  [/\bOeffnen\b/g, "Öffnen"],
  [/\bKontextmenue\b/g, "Kontextmenü"],
  [/\bkontextmenue\b/g, "kontextmenü"],
  [/\bHausnaehe\b/g, "Hausnähe"],
  [/\bhausnaehe\b/g, "hausnähe"],
  [/\bStrassennaehe\b/g, "Straßennähe"],
  [/\bstrassennaehe\b/g, "straßennähe"],
  [/\bhinzufuegen\b/g, "hinzufügen"],
  [/\bHinzufuegen\b/g, "Hinzufügen"],
  [/\bgeloescht\b/g, "gelöscht"],
  [/\bGeloescht\b/g, "Gelöscht"],
  [/\bloeschen\b/g, "löschen"],
  [/\bLoeschen\b/g, "Löschen"],
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
];

function normalizeGerman(value) {
  let out = value;
  for (const [pattern, replacement] of DE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function normalizeCsvDeColumn() {
  const csv = readFileSync(csvPath, "utf8");
  const rows = parseCsv(csv);
  if (rows.length === 0) return 0;

  const header = rows[0].map((cell, idx) => {
    const raw = String(cell);
    const withoutBom = idx === 0 ? raw.replace(/^\ufeff/, "") : raw;
    return withoutBom.trim().toLowerCase();
  });

  const deIdx = header.indexOf("de");
  if (deIdx === -1) {
    throw new Error("Could not find de column in translation-workbench.csv");
  }

  let changes = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const current = String(row[deIdx] ?? "");
    const next = normalizeGerman(current);
    if (next !== current) {
      row[deIdx] = next;
      changes++;
    }
  }

  writeFileSync(csvPath, toCsv(rows), "utf8");
  return changes;
}

function normalizeCatalogDeValues() {
  const source = readFileSync(catalogPath, "utf8");
  let changes = 0;

  const next = source.replace(/de:\s*'((?:\\'|[^'])*)'/g, (full, rawValue) => {
    const normalized = normalizeGerman(rawValue);
    if (normalized !== rawValue) {
      changes++;
      return `de: '${normalized}'`;
    }
    return full;
  });

  writeFileSync(catalogPath, next, "utf8");
  return changes;
}

const csvChanges = normalizeCsvDeColumn();
const catalogChanges = normalizeCatalogDeValues();

console.log(
  `Normalized German umlauts: csv=${csvChanges}, catalog=${catalogChanges}`,
);
