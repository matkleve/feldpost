#!/usr/bin/env node
/**
 * sync-tokens.mjs
 *
 * Parses apps/web/src/styles/tokens.scss and exports literal CSS custom
 * properties to docs/design/figma-tokens.json in W3C Design Token Community
 * Group (DTCG) format, with `light` and `dark` as separate token sets.
 *
 * Run:  node scripts/sync-tokens.mjs
 *       npm run sync-tokens
 *
 * Computed values (var(), calc(), color-mix()) are skipped and logged.
 * Import the resulting JSON into Figma using Tokens Studio or the Variables
 * Import plugin. The agent's job ends at figma-tokens.json — the human is
 * the bridge that imports into Figma.
 *
 * Naming convention:
 *   --color-bg-base  →  Color/Bg/Base  →  JSON path ["Color"]["Bg"]["Base"]
 *
 * @see docs/design/tokens.md § Figma Bridge
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const SCSS_PATH = resolve(repoRoot, 'apps/web/src/styles/tokens.scss');
const OUTPUT_PATH = resolve(repoRoot, 'docs/design/figma-tokens.json');

// ── Type inference ────────────────────────────────────────────────────────────

/**
 * Infer W3C DTCG $type from a resolved CSS value string.
 * Returns null for values that cannot be represented as literal DTCG tokens
 * (aliases, calc expressions, color-mix, multi-value shorthand, keywords).
 */
function inferType(value) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return 'color';
  if (/^[\d.]+(?:rem|px|em|vw|vh|ch|%)$/.test(value)) return 'dimension';
  if (/^[\d.]+m?s$/.test(value)) return 'duration';
  if (/^cubic-bezier\(/.test(value)) return 'cubicBezier';
  if (/^\d+$/.test(value)) return 'number'; // integer: z-index, font-weight
  if (/^\d+\.\d+$/.test(value)) return 'number'; // decimal: line-height, ratio
  // Quoted font stacks (Figma / Base / font)
  if (/^'[^']+'$/.test(value)) return 'fontFamily';
  return null;
}

/**
 * W3C DTCG cubicBezier $value must be a [P1x, P1y, P2x, P2y] numeric array.
 */
function parseCubicBezier(str) {
  const m = str.match(
    /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/,
  );
  return m
    ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])]
    : str;
}

function normaliseValue(value, type) {
  if (type === 'cubicBezier') return parseCubicBezier(value);
  if (type === 'number') return parseFloat(value);
  if (type === 'fontFamily') return value.replace(/^'|'$/g, '');
  return value;
}

/** Expand simple var(--token) chains for export (Figma Alias → Base). */
const VAR_REF = /^var\(--([a-zA-Z0-9-]+)\)$/;

function buildDeclMap(declarations) {
  const m = new Map();
  for (const { name, rawValue } of declarations) {
    m.set(name, rawValue);
  }
  return m;
}

function resolveVarChain(rawValue, map) {
  let v = rawValue;
  for (let i = 0; i < 30; i++) {
    const match = v.match(VAR_REF);
    if (!match) return v;
    const next = map.get(match[1]);
    if (next === undefined) return null;
    v = next;
  }
  return null;
}

// ── Naming convention ─────────────────────────────────────────────────────────

/**
 * --color-bg-base  →  ['Color', 'Bg', 'Base']
 * Each hyphen-separated segment is capitalised and used as a JSON object key.
 */
function cssVarToPath(name) {
  return name
    .split('-')
    .map((seg) => (seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg));
}

// ── Tree builder ──────────────────────────────────────────────────────────────

function setNested(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof cur[path[i]] !== 'object' || cur[path[i]] === null) {
      cur[path[i]] = {};
    }
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}

// ── SCSS parsing ──────────────────────────────────────────────────────────────

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/\/\/[^\n]*/g, '');         // line comments
}

/**
 * Extract the brace-balanced content of the first block matching startRegex.
 */
function extractBlock(text, startRegex) {
  const matchIdx = text.search(startRegex);
  if (matchIdx === -1) return null;
  const openIdx = text.indexOf('{', matchIdx);
  if (openIdx === -1) return null;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return null;
}

/**
 * Extract all `--prop: value;` declarations from a SCSS block.
 * Comments are stripped first; multi-line values are collapsed to one line.
 */
function extractDeclarations(blockText) {
  const clean = stripComments(blockText);
  const results = [];
  const re = /--([a-zA-Z0-9-]+)\s*:\s*([\s\S]*?);/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const name = m[1];
    const rawValue = m[2].replace(/\s+/g, ' ').trim();
    results.push({ name, rawValue });
  }
  return results;
}

/**
 * Build a W3C DTCG token tree from an array of declarations.
 * Resolves simple var(--*) aliases when the target resolves to a literal.
 */
function buildTree(declarations, skipped) {
  const map = buildDeclMap(declarations);
  const tree = {};
  for (const { name, rawValue } of declarations) {
    let lit = rawValue;
    const trimmed = rawValue.trim();
    if (VAR_REF.test(trimmed)) {
      // Only expand Feldpost Alias → Base (avoid flattening all legacy var() chains into JSON)
      if (!name.startsWith('fp-alias-')) {
        skipped.push({ name, rawValue, reason: 'alias' });
        continue;
      }
      const resolved = resolveVarChain(trimmed, map);
      if (resolved === null || VAR_REF.test(resolved)) {
        skipped.push({ name, rawValue, reason: 'alias' });
        continue;
      }
      lit = resolved;
    }
    const type = inferType(lit);
    if (!type) {
      let reason = 'complex';
      if (rawValue.startsWith('calc(')) reason = 'calc';
      else if (rawValue.startsWith('color-mix(')) reason = 'color-mix';
      skipped.push({ name, rawValue, reason });
      continue;
    }
    const path = cssVarToPath(name);
    setNested(tree, path, {
      $value: normaliseValue(lit, type),
      $type: type,
    });
  }
  return tree;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const source = readFileSync(SCSS_PATH, 'utf-8');

const rootBlock = extractBlock(source, /:root\s*\{/);
if (!rootBlock) {
  console.error('sync-tokens: ERROR — could not locate :root { } block in tokens.scss');
  process.exit(1);
}

const darkBlock = extractBlock(source, /@mixin\s+dark-theme-overrides\s*\{/);
if (!darkBlock) {
  console.error('sync-tokens: ERROR — could not locate @mixin dark-theme-overrides { } block in tokens.scss');
  process.exit(1);
}

const lightSkipped = [];
const darkSkipped = [];

const lightDecls = extractDeclarations(rootBlock);
const darkDecls = extractDeclarations(darkBlock);

const lightTree = buildTree(lightDecls, lightSkipped);
const darkTree = buildTree(darkDecls, darkSkipped);

const output = {
  light: lightTree,
  dark: darkTree,
  $metadata: {
    tokenSetOrder: ['light', 'dark'],
    exportedFrom: 'apps/web/src/styles/tokens.scss',
    generatedAt: new Date().toISOString(),
    note: 'Generated by scripts/sync-tokens.mjs. Code is the source of truth — do not edit manually. Import via Tokens Studio or Variables Import plugin.',
  },
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');

const outRel = relative(repoRoot, OUTPUT_PATH).replace(/\\/g, '/');
const lightExported = lightDecls.length - lightSkipped.length;
const darkExported = darkDecls.length - darkSkipped.length;

console.log(`sync-tokens: complete → ${outRel}`);
console.log(`  light  ${lightExported} exported, ${lightSkipped.length} skipped (computed/alias)`);
console.log(`  dark   ${darkExported} exported, ${darkSkipped.length} skipped (computed/alias)`);

if (lightSkipped.length > 0) {
  console.log('\nSkipped light tokens (require manual Figma Variable aliases):');
  for (const s of lightSkipped) {
    console.log(`  --${s.name}  [${s.reason}]`);
  }
}
