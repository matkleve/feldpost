#!/usr/bin/env node
/**
 * Build apps/web/src/assets/geo/at-gemeinden-bev.json (slim municipality list for Fuse).
 *
 * English: Austrian **municipalities** (German: Gemeinden) — not districts (Bezirke) or states.
 *
 * Default source: Statistik Austria WFS (OGDEXT_GEM_1, CC BY 4.0).
 *   https://data.statistik.gv.at/web/meta.jsp?dataset=OGDEXT_GEM_1
 *
 * Faster fallback: --source=github (GeoJSON derived from Statistik Austria, CC BY 4.0)
 *   https://github.com/ginseng666/GeoJSON-TopoJSON-Austria
 *
 * Usage:
 *   node scripts/build-at-gemeinden-bev.mjs
 *   node scripts/build-at-gemeinden-bev.mjs --source=github
 *   node scripts/build-at-gemeinden-bev.mjs --vintage=20250101
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../apps/web/src/assets/geo/at-gemeinden-bev.json');
const MAX_BYTES = 500 * 1024;

/** First digit of municipality code (Gemeindekennziffer) → federal state name. */
const STATE_BY_CODE_DIGIT = {
  1: 'Burgenland',
  2: 'Kärnten',
  3: 'Niederösterreich',
  4: 'Oberösterreich',
  5: 'Salzburg',
  6: 'Steiermark',
  7: 'Tirol',
  8: 'Vorarlberg',
  9: 'Wien',
};

const args = process.argv.slice(2);
const source = args.includes('--source=github') ? 'github' : 'statistik';
const vintage =
  args.find((a) => a.startsWith('--vintage='))?.split('=')[1] ?? '20250101';

function stateFromCode(code) {
  const digit = String(code).trim()[0];
  return STATE_BY_CODE_DIGIT[digit] ?? null;
}

function asciiFold(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .trim();
}

function buildAliases(name) {
  const aliases = new Set();
  const folded = asciiFold(name);
  const lower = name.toLowerCase().trim();

  if (folded && folded !== lower) {
    aliases.add(folded);
  }

  if (/^sankt\s+/i.test(name)) {
    const rest = name.replace(/^sankt\s+/i, '').trim();
    aliases.add(`st ${rest}`.toLowerCase());
    aliases.add(`st. ${rest}`.toLowerCase());
    aliases.add(asciiFold(`St. ${rest}`));
  }

  if (/^st\.\s+/i.test(name)) {
    const rest = name.replace(/^st\.\s+/i, '').trim();
    aliases.add(`sankt ${rest}`.toLowerCase());
    aliases.add(asciiFold(`Sankt ${rest}`));
  }

  const ohnePrefix = name.replace(/^(gemeinde|stadt)\s+/i, '').trim();
  if (ohnePrefix !== name && ohnePrefix.length > 0) {
    aliases.add(ohnePrefix.toLowerCase());
    aliases.add(asciiFold(ohnePrefix));
  }

  return [...aliases].filter((a) => a && a !== lower && a !== folded);
}

function toSlimRecord(name, stateCode) {
  const state = stateFromCode(stateCode);
  if (!state) {
    return null;
  }
  const aliases = buildAliases(name);
  const record = { n: name, b: state };
  if (aliases.length > 0) {
    record.a = aliases;
  }
  return record;
}

async function fetchFromStatistik(vintageDate) {
  const typeName = `GEODATA:STATISTIK_AUSTRIA_GEM_${vintageDate}`;
  const url =
    `https://www.statistik.gv.at/gs-open/GEODATA/ows?service=WFS&version=2.0.0` +
    `&request=GetFeature&typeName=${encodeURIComponent(typeName)}` +
    `&outputFormat=application/json`;

  console.log(`Fetching Statistik Austria WFS (${typeName})…`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Statistik WFS HTTP ${response.status}`);
  }

  const geojson = await response.json();
  const features = geojson.features ?? [];
  console.log(`  ${features.length} features (geometry stripped in output)`);

  const records = [];
  for (const feature of features) {
    const props = feature.properties ?? {};
    const id = props.g_id ?? props.G_ID ?? props.id;
    const name = props.g_name ?? props.G_NAME ?? props.name;
    if (!id || !name) {
      continue;
    }
    const row = toSlimRecord(String(name).trim(), String(id));
    if (row) {
      records.push(row);
    }
  }
  return records;
}

async function fetchFromGithub() {
  const url =
    'https://raw.githubusercontent.com/ginseng666/GeoJSON-TopoJSON-Austria/master/2021/simplified-99.5/gemeinden_995_geo.json';

  console.log('Fetching GeoJSON (Statistik-derived, GitHub mirror)…');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GitHub mirror HTTP ${response.status}`);
  }

  const geojson = await response.json();
  const features = geojson.features ?? [];
  console.log(`  ${features.length} features`);

  const records = [];
  for (const feature of features) {
    const props = feature.properties ?? {};
    const name = props.name;
    const iso = props.iso;
    if (!name || !iso) {
      continue;
    }
    const row = toSlimRecord(String(name).trim(), String(iso));
    if (row) {
      records.push(row);
    }
  }
  return records;
}

function dedupeRecords(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.b}|${record.n.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }
    const merged = new Set([...(existing.a ?? []), ...(record.a ?? [])]);
    if (merged.size > 0) {
      existing.a = [...merged];
    }
  }
  return [...byKey.values()].sort((a, b) => a.n.localeCompare(b.n, 'de'));
}

async function main() {
  const records =
    source === 'github' ? await fetchFromGithub() : await fetchFromStatistik(vintage);

  const slim = dedupeRecords(records);
  const json = JSON.stringify(slim);
  const bytes = Buffer.byteLength(json, 'utf8');

  if (slim.length < 2000) {
    console.error(`Too few municipalities (${slim.length}); aborting.`);
    process.exit(1);
  }
  if (bytes > MAX_BYTES) {
    console.error(`Output ${bytes} bytes exceeds ${MAX_BYTES} byte budget.`);
    process.exit(1);
  }

  writeFileSync(OUT_PATH, json);
  console.log(`Wrote ${slim.length} municipalities → ${OUT_PATH} (${bytes} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
