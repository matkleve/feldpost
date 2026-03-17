import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const csvPath = join(repoRoot, 'docs', 'i18n', 'translation-workbench.csv');

const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const targetLanguage = langArg ? langArg.slice('--lang='.length).trim().toLowerCase() : 'it';
const strictSame = process.argv.includes('--strict-same');
const maxSameArg = process.argv.find((arg) => arg.startsWith('--max-same='));
const maxSame = maxSameArg ? Number(maxSameArg.slice('--max-same='.length)) : 0;

function parseCsv(text) {
  const rows = [];
  let current = '';
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

    if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
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

function isLikelyAcceptableSameText(en) {
  if (!en) return true;
  if (/^[A-Za-z0-9 .:+\-_/&()]{1,6}$/.test(en)) return true; // e.g., 2FA
  if (/^[A-Z0-9\s.+\-_/&()]+$/.test(en)) return true; // acronyms/technical labels
  if (/^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(en)) return true; // names like Jane Smith
  return false;
}

const csv = readFileSync(csvPath, 'utf8');
const rows = parseCsv(csv);
if (rows.length < 2) {
  throw new Error('translation-workbench.csv is empty.');
}

const header = rows[0].map((cell, idx) => {
  const raw = String(cell);
  const withoutBom = idx === 0 ? raw.replace(/^\ufeff/, '') : raw;
  return withoutBom.trim().toLowerCase();
});

const keyIdx = header.indexOf('key');
const enIdx = header.indexOf('en');
const targetIdx = header.indexOf(targetLanguage);

if ([keyIdx, enIdx, targetIdx].some((idx) => idx === -1)) {
  throw new Error(
    `translation-workbench.csv must contain key, en and ${targetLanguage} columns.`,
  );
}

const body = rows.slice(1).filter((r) => r.length >= header.length);
const missing = [];
const same = [];

for (const row of body) {
  const key = (row[keyIdx] ?? '').trim();
  const en = (row[enIdx] ?? '').trim();
  const target = (row[targetIdx] ?? '').trim();
  if (!key) continue;

  if (!target) {
    missing.push(key);
    continue;
  }

  if (en && target === en && !isLikelyAcceptableSameText(en)) {
    same.push(key);
  }
}

console.log(
  `i18n validation (${targetLanguage}): total=${body.length} missing=${missing.length} same_nontrivial=${same.length}`,
);

if (missing.length > 0) {
  console.error('Missing translations for keys:');
  console.error(missing.slice(0, 50).join('\n'));
  process.exit(1);
}

if (strictSame && same.length > maxSame) {
  console.error(
    `Too many same-as-en translations for ${targetLanguage}: ${same.length} > ${maxSame}`,
  );
  console.error(same.slice(0, 50).join('\n'));
  process.exit(1);
}

if (same.length > 0) {
  console.warn(
    `Warning: ${same.length} non-trivial entries are still same as EN. Run with --strict-same to fail CI.`,
  );
}
