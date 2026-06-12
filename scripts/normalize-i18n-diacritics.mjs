import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  I18N_DIACRITIC_LANGUAGES,
  normalizeForLanguage,
  parseCsv,
} from "./i18n-diacritics.helpers.mjs";

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

const langArg = process.argv.find((arg) => arg.startsWith("--lang="));
const requestedLanguages = langArg
  ? [langArg.slice("--lang=".length).trim().toLowerCase()]
  : [...I18N_DIACRITIC_LANGUAGES, "en"];

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

function normalizeCsvColumns() {
  const csv = readFileSync(csvPath, "utf8");
  const rows = parseCsv(csv);
  if (rows.length === 0) return {};

  const header = rows[0].map((cell, idx) => {
    const raw = String(cell);
    const withoutBom = idx === 0 ? raw.replace(/^\ufeff/, "") : raw;
    return withoutBom.trim().toLowerCase();
  });

  /** @type {Record<string, number>} */
  const changesByLang = {};

  for (const lang of requestedLanguages) {
    const langIdx = header.indexOf(lang);
    if (langIdx === -1) continue;

    let changes = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const current = String(row[langIdx] ?? "");
      const next = normalizeForLanguage(lang, current);
      if (next !== current) {
        row[langIdx] = next;
        changes++;
      }
    }
    changesByLang[lang] = changes;
  }

  writeFileSync(csvPath, toCsv(rows), "utf8");
  return changesByLang;
}

function normalizeCatalogValues() {
  /** @type {Record<string, number>} */
  const changesByLang = {};
  let source = readFileSync(catalogPath, "utf8");

  for (const lang of requestedLanguages) {
    if (!I18N_DIACRITIC_LANGUAGES.includes(lang) && lang !== "en") continue;

    let changes = 0;
    const pattern = new RegExp(`${lang}:\\s*'((?:\\\\'|[^'])*)'`, "g");
    source = source.replace(pattern, (full, rawValue) => {
      const normalized = normalizeForLanguage(lang, rawValue);
      if (normalized !== rawValue) {
        changes++;
        return `${lang}: '${normalized}'`;
      }
      return full;
    });
    changesByLang[lang] = changes;
  }

  writeFileSync(catalogPath, source, "utf8");
  return changesByLang;
}

const csvChanges = normalizeCsvColumns();
const catalogChanges = normalizeCatalogValues();

console.log(
  `Normalized i18n diacritics: csv=${JSON.stringify(csvChanges)}, catalog=${JSON.stringify(catalogChanges)}`,
);
