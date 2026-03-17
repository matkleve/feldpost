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

function protectPlaceholders(input) {
  const placeholders = [];
  let index = 0;

  const protectedText = input.replace(/{{\s*[^}]+\s*}}/g, (match) => {
    const token = `__PH_${index++}__`;
    placeholders.push({ token, value: match });
    return token;
  });

  return { protectedText, placeholders };
}

function restorePlaceholders(input, placeholders) {
  let result = input;
  for (const entry of placeholders) {
    result = result.replaceAll(entry.token, entry.value);
  }
  return result;
}

const translationCache = new Map();

async function translateEnToDe(value) {
  const trimmed = value.trim();
  if (!trimmed || !/[A-Za-z]/.test(trimmed)) return value;

  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed);
  }

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim();

  const { protectedText, placeholders } = protectPlaceholders(core);
  const query = encodeURIComponent(protectedText);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=de&dt=t&q=${query}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation request failed: ${response.status}`);
  }

  const json = await response.json();
  const translatedCore = Array.isArray(json?.[0])
    ? json[0].map((entry) => entry?.[0] ?? "").join("")
    : core;

  const restored = restorePlaceholders(translatedCore, placeholders);
  const finalText = `${leading}${restored}${trailing}`;

  translationCache.set(trimmed, finalText);
  return finalText;
}

async function main() {
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
    throw new Error(
      "Could not find en/de columns in translation-workbench.csv",
    );
  }

  let changed = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const en = (row[enIdx] ?? "").trim();
    const de = (row[deIdx] ?? "").trim();

    if (!en) continue;
    if (!force && de && de !== en) continue;

    const translated = await translateEnToDe(en);
    if (translated !== de) {
      row[deIdx] = translated;
      changed++;
    }
  }

  writeFileSync(csvPath, toCsv(rows), "utf8");
  console.log(
    `Updated de translations with Google Translate: ${changed} (force=${force})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
