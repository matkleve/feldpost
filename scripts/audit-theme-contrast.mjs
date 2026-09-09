#!/usr/bin/env node

/**
 * WCAG AA contrast audit for theme tokens.
 * Checks foreground/background pairs across light, dark, and sandstone themes.
 *
 * Usage: node scripts/audit-theme-contrast.mjs [--fail-on-warn]
 *
 * Exit 1 if any pair fails AA (4.5:1 normal text, 3:1 large text / UI).
 *
 * The palettes are READ FROM `apps/web/src/styles.scss`, not copied here. They
 * used to be a hand-maintained hex table labelled "hex values from styles.scss",
 * and it had drifted: it claimed dark `--destructive` was #7f1d1d and sandstone
 * #c53030 while both themes actually resolve to #ef4444, so two real AA failures
 * were reported as passes. A contrast gate that reads a second copy of the
 * palette measures the copy — see docs/audits/2026-09-08-design-system-adoption.md § A5.
 *
 * A token this script cannot resolve is reported as unresolved and fails the
 * run. Silently skipping it would recreate the same blind spot.
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

/** oklch(L C H) → #rrggbb, clipped to sRGB (Björn Ottosson's matrices). */
function oklchToHex(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return (
    '#' +
    linear
      .map(x => {
        const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, v)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

// ─── Read the palettes out of styles.scss ────────────────────────────────────

const STYLES = resolve(ROOT, 'apps/web/src/styles.scss');
const css = readFileSync(STYLES, 'utf-8');

/** Body of the first block opened by `opener`, matched by brace depth. */
function blockBody(source, opener) {
  const start = source.indexOf(opener);
  if (start === -1) throw new Error(`cannot find "${opener}" in apps/web/src/styles.scss`);

  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      return source.slice(source.indexOf('{', start) + 1, i);
    }
  }
  throw new Error(`unbalanced braces after "${opener}"`);
}

/** `--name: value;` declarations at any depth inside a block body. */
function declarations(body) {
  const out = new Map();
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(name, value.trim());
  }
  return out;
}

const base = declarations(blockBody(css, '\n:root {'));
const darkOverrides = declarations(blockBody(css, '@mixin tweakcn-dark-semantic-palette'));
const sandstoneOverrides = declarations(blockBody(css, 'html[data-theme="sandstone"]'));

/**
 * Themes layer over `:root`: dark and sandstone only override what they
 * redeclare, exactly as the cascade does. Getting this wrong is how the old
 * table came to disagree with the product.
 */
const themeTokens = {
  light: base,
  dark: new Map([...base, ...darkOverrides]),
  sandstone: new Map([...base, ...sandstoneOverrides]),
};

const unresolved = [];

/** Resolve one token to a hex string, following `var()` chains. */
function resolveToken(tokens, name, seen = new Set()) {
  const raw = tokens.get(`--${name}`);
  if (raw === undefined) return null;

  const value = raw.trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value.slice(0, 7);

  const oklch = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (oklch) return oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));

  const ref = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (ref) {
    if (seen.has(ref[1])) return null; // cyclic
    return resolveToken(tokens, ref[1], new Set([...seen, name]));
  }

  return null; // color-mix() and anything else: reported, never guessed
}

/** { tokenName: hex } per theme, recording what could not be resolved. */
const themes = Object.fromEntries(
  Object.entries(themeTokens).map(([themeName, tokens]) => {
    const resolved = {};
    for (const key of tokens.keys()) {
      const name = key.slice(2);
      const hex = resolveToken(tokens, name);
      if (hex) resolved[name] = hex;
    }
    return [themeName, resolved];
  }),
);

// ─── Pairs to check ──────────────────────────────────────────────────────────

// ─── Known failures (ratchet) ────────────────────────────────────────────────
//
// Pairs that already failed when this gate was wired in on 2026-09-08. Each is
// a brand-colour decision the owner has to make, not a mechanical fix, so they
// are recorded rather than silently tolerated:
//
//   - a pair listed here that gets WORSE fails the run
//   - a pair listed here that now PASSES fails the run too, telling you to
//     delete the entry — the ratchet may only tighten
//   - anything not listed here fails on its first regression
//
// Do not add entries to buy a green run. See
// docs/audits/2026-09-08-design-system-adoption.md § A3.
const BASELINE = {
  'dark|primary button text': {
    ratio: 3.62,
    why: 'white on the #3e8cc9 primary; needs a darker primary or a dark ink',
  },
  'sandstone|primary button text': {
    ratio: 2.26,
    why: 'white on the brand gold; the gold is the brand, so the ink is the decision',
  },
  'sandstone|muted on card': {
    ratio: 4.42,
    why: 'marginal — 0.08 short; a small darkening of --muted-foreground clears it',
  },
};

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
    if (!fgHex || !bgHex) {
      console.log(`    ? SKIP  ${label}: ${!fgHex ? `--${fg}` : `--${bg}`} did not resolve to a color`);
      unresolved.push(`${themeName}: ${label} (--${!fgHex ? fg : bg})`);
      continue;
    }
    const ratio = contrastRatio(fgHex, bgHex);
    const known = BASELINE[`${themeName}|${label}`];

    if (known) {
      // Rounded to the recorded precision so float noise is not a failure.
      const now = Number(ratio.toFixed(2));
      if (now < known.ratio) {
        console.log(
          `    ✗ FAIL  ${label}: ${now}:1 — worse than the recorded ${known.ratio}:1 [${fg} ${fgHex} on ${bg} ${bgHex}]`,
        );
        failures++;
      } else if (ratio >= 4.5) {
        console.log(
          `    ✗ FAIL  ${label}: ${now}:1 now passes — remove this entry from BASELINE in this script`,
        );
        failures++;
      } else {
        console.log(`    ! KNOWN ${label}: ${now}:1 (need 4.5:1) — ${known.why}`);
      }
      continue;
    }

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
    if (!fgHex || !bgHex) {
      console.log(`    ? SKIP  ${label}: ${!fgHex ? `--${fg}` : `--${bg}`} did not resolve to a color`);
      unresolved.push(`${themeName}: ${label} (--${!fgHex ? fg : bg})`);
      continue;
    }
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

console.log(`── Summary: ${failures} failures, ${warnings} warnings, ${unresolved.length} unresolved ──`);

if (unresolved.length) {
  console.log('\n? Unresolved token(s) — a pair nobody can measure is a pair nobody is checking:');
  for (const item of unresolved) console.log(`    ${item}`);
}

if (failures > 0 || unresolved.length > 0) {
  console.log('\n✗ Contrast audit failed. Fix the pairs above before shipping.');
  process.exit(1);
}
if (warnings > 0 && failOnWarn) {
  console.log('\n⚠ Warnings treated as errors (--fail-on-warn).');
  process.exit(1);
}
const knownCount = Object.keys(BASELINE).length;

if (failures === 0) {
  console.log(
    knownCount
      ? `\n✓ No new contrast failures. ${knownCount} known failure(s) still recorded in BASELINE — do not add to them.`
      : '\n✓ All pairs pass WCAG AA.',
  );
}
process.exit(0);
