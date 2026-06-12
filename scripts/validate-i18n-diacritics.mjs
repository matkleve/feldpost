import { readFileSync } from "node:fs";
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
const languagesToValidate = langArg
  ? [langArg.slice("--lang=".length).trim().toLowerCase()]
  : I18N_DIACRITIC_LANGUAGES;

/** @type {Array<{ source: string; lang: string; key: string; current: string; expected: string }>} */
const violations = [];

/** @param {string} source @param {string} lang @param {string} key @param {string} current */
function checkValue(source, lang, key, current) {
  if (current.includes("\uFFFD")) {
    violations.push({
      source,
      lang,
      key,
      current,
      expected: "(contains U+FFFD replacement character — re-run normalize)",
    });
    return;
  }
  const expected = normalizeForLanguage(lang, current);
  if (expected !== current) {
    violations.push({ source, lang, key, current, expected });
  }
}

const csv = readFileSync(csvPath, "utf8");
const rows = parseCsv(csv);
if (rows.length < 2) {
  throw new Error("translation-workbench.csv is empty.");
}

const header = rows[0].map((cell, idx) => {
  const raw = String(cell);
  const withoutBom = idx === 0 ? raw.replace(/^\ufeff/, "") : raw;
  return withoutBom.trim().toLowerCase();
});

const keyIdx = header.indexOf("key");
if (keyIdx === -1) {
  throw new Error("translation-workbench.csv must contain a key column.");
}

for (const lang of languagesToValidate) {
  const langIdx = header.indexOf(lang);
  if (langIdx === -1) {
    throw new Error(`translation-workbench.csv must contain ${lang} column.`);
  }

  for (const row of rows.slice(1)) {
    const key = String(row[keyIdx] ?? "").trim();
    const value = String(row[langIdx] ?? "");
    if (!key || !value) continue;
    checkValue("csv", lang, key, value);
  }
}

const catalogSource = readFileSync(catalogPath, "utf8");

for (const lang of languagesToValidate) {
  const catalogPattern = new RegExp(
    `key:\\s*'((?:\\\\'|[^'])*)'[\\s\\S]*?${lang}:\\s*'((?:\\\\'|[^'])*)'`,
    "g",
  );

  for (const match of catalogSource.matchAll(catalogPattern)) {
    const key = match[1];
    const value = match[2];
    checkValue("catalog", lang, key, value);
  }
}

console.log(
  `i18n diacritics validation (${languagesToValidate.join(", ")}): violations=${violations.length}`,
);

if (violations.length > 0) {
  console.error(
    "Locale translations must use native diacritics — not ASCII fallbacks or mojibake.",
  );
  console.error("Run: node scripts/normalize-i18n-diacritics.mjs");
  for (const item of violations.slice(0, 40)) {
    console.error(
      `[${item.source}/${item.lang}] ${item.key}\n  current:  ${item.current}\n  expected: ${item.expected}`,
    );
  }
  if (violations.length > 40) {
    console.error(`... and ${violations.length - 40} more`);
  }
  process.exit(1);
}
