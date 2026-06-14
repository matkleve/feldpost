#!/usr/bin/env node

/**
 * WCAG AA contrast audit for theme tokens.
 * Checks foreground/background pairs across light, dark, and sandstone themes.
 *
 * Usage: node scripts/audit-theme-contrast.mjs [--fail-on-warn]
 *
 * Exit 1 if any pair fails AA (4.5:1 normal text, 3:1 large text / UI).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const failOnWarn = process.argv.includes('--fail-on-warn');

// ─── Color math ──────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Theme definitions (hex values from styles.scss) ─────────────────────────

const themes = {
  light: {
    background: '#ffffff',
    foreground: '#09090b',
    'muted-foreground': '#71717a',
    primary: '#18181b',
    'primary-foreground': '#fafafa',
    border: '#e4e4e7',
    card: '#ffffff',
    'card-foreground': '#09090b',
    popover: '#ffffff',
    'popover-foreground': '#09090b',
    destructive: '#ef4444',
    'destructive-foreground': '#fafafa',
    accent: '#f4f4f5',
    'accent-foreground': '#18181b',
  },
  dark: {
    background: '#09090b',
    foreground: '#fafafa',
    'muted-foreground': '#a1a1aa',
    primary: '#fafafa',
    'primary-foreground': '#18181b',
    border: '#27272a',
    card: '#09090b',
    'card-foreground': '#fafafa',
    popover: '#09090b',
    'popover-foreground': '#fafafa',
    destructive: '#7f1d1d',
    'destructive-foreground': '#fafafa',
    accent: '#27272a',
    'accent-foreground': '#fafafa',
  },
  sandstone: {
    background: '#faf6f0',
    foreground: '#2f271f',
    'muted-foreground': '#6b5a47',
    primary: '#8b6914',
    'primary-foreground': '#fdf8ef',
    border: '#e8dfd4',
    card: '#fffdf9',
    'card-foreground': '#2f271f',
    popover: '#fffdf9',
    'popover-foreground': '#2f271f',
    destructive: '#c53030',
    'destructive-foreground': '#fdf8ef',
    accent: '#f5ede3',
    'accent-foreground': '#2f271f',
  },
};

// ─── Pairs to check ──────────────────────────────────────────────────────────

const textPairs = [
  { fg: 'foreground', bg: 'background', label: 'body text' },
  { fg: 'foreground', bg: 'card', label: 'card text' },
  { fg: 'muted-foreground', bg: 'background', label: 'muted text' },
  { fg: 'muted-foreground', bg: 'card', label: 'muted on card' },
  { fg: 'primary-foreground', bg: 'primary', label: 'primary button text' },
  { fg: 'card-foreground', bg: 'card', label: 'card-foreground on card' },
  { fg: 'popover-foreground', bg: 'popover', label: 'popover text' },
  { fg: 'destructive-foreground', bg: 'destructive', label: 'destructive button text' },
  { fg: 'accent-foreground', bg: 'accent', label: 'accent text' },
];

const uiPairs = [
  { fg: 'border', bg: 'background', label: 'border vs background' },
  { fg: 'primary', bg: 'background', label: 'primary on background (icon/link)' },
];

// ─── Audit ───────────────────────────────────────────────────────────────────

let failures = 0;
let warnings = 0;

console.log('─── WCAG AA Contrast Audit ───\n');

for (const [themeName, tokens] of Object.entries(themes)) {
  console.log(`  Theme: ${themeName}`);

  for (const { fg, bg, label } of textPairs) {
    const fgHex = tokens[fg];
    const bgHex = tokens[bg];
    if (!fgHex || !bgHex) continue;
    const ratio = contrastRatio(fgHex, bgHex);
    if (ratio < 4.5) {
      console.log(`    ✗ FAIL  ${label}: ${ratio.toFixed(2)}:1 (need 4.5:1) [${fg} ${fgHex} on ${bg} ${bgHex}]`);
      failures++;
    } else {
      console.log(`    ✓ PASS  ${label}: ${ratio.toFixed(2)}:1`);
    }
  }

  for (const { fg, bg, label } of uiPairs) {
    const fgHex = tokens[fg];
    const bgHex = tokens[bg];
    if (!fgHex || !bgHex) continue;
    const ratio = contrastRatio(fgHex, bgHex);
    if (ratio < 3.0) {
      console.log(`    ⚠ WARN  ${label}: ${ratio.toFixed(2)}:1 (need 3:1 for UI) [${fg} ${fgHex} on ${bg} ${bgHex}]`);
      warnings++;
    } else {
      console.log(`    ✓ PASS  ${label}: ${ratio.toFixed(2)}:1 (UI ≥3:1)`);
    }
  }
  console.log('');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`── Summary: ${failures} failures, ${warnings} warnings ──`);

if (failures > 0) {
  console.log('\n✗ Contrast audit failed. Fix the pairs above before shipping.');
  process.exit(1);
}
if (warnings > 0 && failOnWarn) {
  console.log('\n⚠ Warnings treated as errors (--fail-on-warn).');
  process.exit(1);
}
if (failures === 0 && warnings === 0) {
  console.log('\n✓ All pairs pass WCAG AA.');
}
process.exit(0);
