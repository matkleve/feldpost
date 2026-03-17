import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const appRoot = join(repoRoot, "apps", "web", "src", "app");
const outCsv = join(repoRoot, "docs", "i18n", "translation-workbench.csv");

const textEntries = new Map();

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!fullPath.endsWith(".html")) continue;
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
    textEntries.set(key, {
      key: "",
      original: normalized,
      context,
      en: normalized,
      de: normalized,
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

  if (filePath.endsWith(".html")) {
    const textNodeRegex = />([^<>{}@][^<>{}]*)</g;
    for (const match of content.matchAll(textNodeRegex)) {
      addEntry(match[1], `${rel} text-node`);
    }

    const attrRegex = /(title|aria-label|placeholder)\s*=\s*"([^"]+)"/g;
    for (const match of content.matchAll(attrRegex)) {
      addEntry(match[2], `${rel} attr:${match[1]}`);
    }
  }

  // Intentionally HTML-only: TS literals include many implementation strings/noise.
}

function csvEscape(value) {
  const v = String(value ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

walk(appRoot);

const rows = [...textEntries.values()]
  .sort((a, b) => a.original.localeCompare(b.original))
  .map((entry, index) => ({
    ...entry,
    key: `auto.${String(index + 1).padStart(4, "0")}.${keyify(entry.original) || "text"}`,
  }));

const header = ["key", "original", "context", "en", "de"];
const lines = [header.join(",")];
for (const row of rows) {
  lines.push(
    [
      csvEscape(row.key),
      csvEscape(row.original),
      csvEscape(row.context),
      csvEscape(row.en),
      csvEscape(row.de),
    ].join(","),
  );
}

writeFileSync(outCsv, `\ufeff${lines.join("\n")}\n`, "utf8");
console.log(
  `Generated ${rows.length} translation rows -> ${relative(repoRoot, outCsv)}`,
);
