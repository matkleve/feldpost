import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const appRoot = join(repoRoot, "apps", "web", "src", "app");
const outCsv = join(repoRoot, "docs", "i18n", "translation-workbench.csv");

const textEntries = new Map();
const existingTranslationsByOriginal = new Map();

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

function loadExistingTranslations() {
  if (!existsSync(outCsv)) return;

  const csv = readFileSync(outCsv, "utf8");
  const rows = parseCsv(csv);
  if (rows.length < 2) return;

  const header = rows[0].map((cell, idx) => {
    const raw = String(cell);
    const withoutBom = idx === 0 ? raw.replace(/^\ufeff/, "") : raw;
    return withoutBom.trim().toLowerCase();
  });

  const originalIdx = header.indexOf("original");
  const enIdx = header.indexOf("en");
  const deIdx = header.indexOf("de");
  const itIdx = header.indexOf("it");

  if (originalIdx === -1 || enIdx === -1 || deIdx === -1) return;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const original = (row[originalIdx] ?? "").replace(/\s+/g, " ").trim();
    if (!original) continue;

    existingTranslationsByOriginal.set(original.toLowerCase(), {
      en: (row[enIdx] ?? "").trim(),
      de: (row[deIdx] ?? "").trim(),
      it: itIdx === -1 ? "" : (row[itIdx] ?? "").trim(),
    });
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!fullPath.endsWith(".html") && !fullPath.endsWith(".component.ts")) {
      continue;
    }
    scanFile(fullPath);
  }
}

function addEntry(original, context) {
  const normalized = original.replace(/\s+/g, " ").trim();
  if (!normalized) return;
  if (normalized.length < 2) return;
  if (context.includes("text-node") && /^[a-z][a-z0-9_]*$/.test(normalized))
    return;
  if (/^[{}()[\],.:;!?+\-/*0-9\s]+$/.test(normalized)) return;
  if (!/[A-Za-z]/.test(normalized)) return;
  if (/[@$]|=>|^\/|\.component\.|\.service\.|^--/.test(normalized)) return;
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(normalized)) return;

  const key = normalized.toLowerCase();
  if (!textEntries.has(key)) {
    const existing = existingTranslationsByOriginal.get(key);
    textEntries.set(key, {
      key: "",
      original: normalized,
      context,
      en: existing?.en || normalized,
      de: existing?.de || normalized,
      it: existing?.it || normalized,
    });
  }
}

function keyify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function scanFile(filePath) {
  const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
  const content = readFileSync(filePath, "utf8");

  const extractFromTemplate = (template, contextPrefix) => {
    const textNodeRegex = />([^<>{}@][^<>{}]*)</g;
    for (const match of template.matchAll(textNodeRegex)) {
      addEntry(match[1], `${contextPrefix} text-node`);
    }

    const attrRegex = /(title|aria-label|placeholder)\s*=\s*"([^"]+)"/g;
    for (const match of template.matchAll(attrRegex)) {
      addEntry(match[2], `${contextPrefix} attr:${match[1]}`);
    }

    // Extract string literals from Angular interpolations, e.g.
    // {{ saving() ? 'Saving...' : 'Save name' }}
    const interpolationRegex = /\{\{([\s\S]*?)\}\}/g;
    for (const interpolationMatch of template.matchAll(interpolationRegex)) {
      const expression = interpolationMatch[1];
      const literalRegex =
        /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      for (const literalMatch of expression.matchAll(literalRegex)) {
        const value = (literalMatch[1] ?? literalMatch[2] ?? "")
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, " ")
          .trim();
        if (!value) continue;
        addEntry(value, `${contextPrefix} interpolation-literal`);
      }
    }

    // Extract string literals from bound attributes, e.g.
    // [title]="'Confirm logout'"
    const boundAttrRegex =
      /\[(title|aria-label|placeholder|message|confirmLabel|cancelLabel)\]\s*=\s*"([^"]+)"/g;
    for (const boundAttrMatch of template.matchAll(boundAttrRegex)) {
      const expression = boundAttrMatch[2];
      const literalRegex =
        /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      for (const literalMatch of expression.matchAll(literalRegex)) {
        const value = (literalMatch[1] ?? literalMatch[2] ?? "")
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, " ")
          .trim();
        if (!value) continue;
        addEntry(value, `${contextPrefix} bound-attr:${boundAttrMatch[1]}`);
      }
    }
  };

  if (filePath.endsWith(".html")) {
    extractFromTemplate(content, rel);
    return;
  }

  if (filePath.endsWith(".component.ts")) {
    const inlineTemplateRegex = /template\s*:\s*`([\s\S]*?)`/g;
    for (const match of content.matchAll(inlineTemplateRegex)) {
      extractFromTemplate(match[1], `${rel} inline-template`);
    }

    // Extract TS-side user-facing toast/dialog messages.
    const messageRegex =
      /\b(message|title|confirmLabel|cancelLabel)\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    for (const match of content.matchAll(messageRegex)) {
      const value = match[2].replace(/\\'/g, "'").replace(/\\n/g, " ").trim();
      if (!value) continue;
      addEntry(value, `${rel} ts-prop:${match[1]}`);
    }
  }
}

function csvEscape(value) {
  const v = String(value ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

loadExistingTranslations();
walk(appRoot);

const rows = [...textEntries.values()]
  .sort((a, b) => a.original.localeCompare(b.original))
  .map((entry, index) => ({
    ...entry,
    key: `auto.${String(index + 1).padStart(4, "0")}.${keyify(entry.original) || "text"}`,
  }));

const header = ["key", "original", "context", "en", "de", "it"];
const lines = [header.join(",")];
for (const row of rows) {
  lines.push(
    [
      csvEscape(row.key),
      csvEscape(row.original),
      csvEscape(row.context),
      csvEscape(row.en),
      csvEscape(row.de),
      csvEscape(row.it),
    ].join(","),
  );
}

writeFileSync(outCsv, `\ufeff${lines.join("\n")}\n`, "utf8");
console.log(
  `Generated ${rows.length} translation rows -> ${relative(repoRoot, outCsv)}`,
);
