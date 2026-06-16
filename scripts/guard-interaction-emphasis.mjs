#!/usr/bin/env node
/**
 * Guard: Interaction Emphasis Inline Pattern
 *
 * Detects component SCSS files that write inline color-mix() for hover/selected
 * emphasis instead of using the canonical mixin or token.
 *
 * Banned patterns (full hover treatment: bg + ink as a bg+color pair):
 *   color-mix(in srgb, var(--primary) 10%, transparent)  in a :hover context
 *   color-mix(in srgb, var(--interaction-selected-ink) X%, transparent)
 *
 * Banned token duplications:
 *   color-mix(in srgb, var(--primary) 8%, transparent)   → use var(--menu-item-hover)
 *   color-mix(in srgb, var(--primary) 12%, transparent)  → use var(--action-hover)
 *
 * Canonical references:
 *   @see docs/design/state-visuals.md § Interaction emphasis
 *   @see apps/web/src/styles/_interaction-emphasis-quiet-row.scss
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const projectRoot = process.cwd();
const errors = [];

// Files that define the tokens/mixins themselves — not violations
const EXCEPTION_FILES = new Set([
  "apps/web/src/styles/_interaction-emphasis-quiet-row.scss",
  "apps/web/src/styles/_option-menu-item-states.scss",
  "apps/web/src/styles/styles.scss",
  "apps/web/src/styles.scss",
  // These use color-mix for non-emphasis semantic purposes (chip fill, borders, etc.)
  // and are documented exceptions:
  "apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.scss",
]);

/**
 * Banned inline patterns that must use the mixin or a canonical token.
 * Format: { pattern: RegExp, message: string }
 */
const BANNED_PATTERNS = [
  {
    // Full hover treatment with both bg+ink — must use @include emphasis.hover(10%)
    pattern: /color-mix\(in srgb, var\(--primary\) 10%, transparent\)/,
    message:
      'Use "@include emphasis.hover(10%)" from _interaction-emphasis-quiet-row.scss instead of inline color-mix for primary 10%.',
    tokenAlternative: null,
  },
  {
    // List-row hover background — must use var(--menu-item-hover)
    pattern: /color-mix\(in srgb, var\(--primary\) 8%, transparent\)/,
    message:
      'Use "var(--menu-item-hover)" instead of inline color-mix for primary 8%.',
    tokenAlternative: "--menu-item-hover",
  },
  {
    // Action hover — must use var(--action-hover)
    pattern: /color-mix\(in srgb, var\(--primary\) 12%, transparent\)/,
    message:
      'Use "var(--action-hover)" instead of inline color-mix for primary 12%.',
    tokenAlternative: "--action-hover",
  },
  {
    // Selected state with selected-ink — must use @include emphasis.selected(X%)
    pattern:
      /color-mix\(in srgb, var\(--interaction-selected-ink\) \d+%, transparent\)/,
    message:
      'Use "@include emphasis.selected(X%)" from _interaction-emphasis-quiet-row.scss instead of inline color-mix for --interaction-selected-ink.',
    tokenAlternative: null,
  },
];

function scanDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...scanDir(full));
    } else if (entry.endsWith(".scss")) {
      files.push(full);
    }
  }
  return files;
}

function check() {
  const scssRoot = resolve(projectRoot, "apps/web/src");
  if (!existsSync(scssRoot)) {
    console.error(`guard-interaction-emphasis: apps/web/src not found.`);
    process.exit(1);
  }

  const allFiles = scanDir(scssRoot);

  for (const absPath of allFiles) {
    const relPath = relative(projectRoot, absPath);

    // Skip exception files
    if (EXCEPTION_FILES.has(relPath)) continue;

    // Only check component SCSS + shared partials (not the global styles directory)
    // The styles/ directory defines the tokens/mixins; skip it (except the exceptions above)
    if (relPath.startsWith("apps/web/src/styles/")) continue;

    const content = readFileSync(absPath, "utf-8");

    const lines = content.split("\n");

    for (const { pattern, message } of BANNED_PATTERNS) {
      if (pattern.test(content)) {
        const violatingLines = lines
          .map((line, i) => ({ line, num: i + 1 }))
          .filter(({ line }) => pattern.test(line));

        for (const { line, num } of violatingLines) {
          // Allow suppression via trailing comment: // emphasis-ok: <reason>
          if (/\/\/\s*emphasis-ok:/.test(line)) continue;
          errors.push(
            `${relPath}:${num}: ${message}\n    @see docs/design/state-visuals.md § Interaction emphasis`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(
      "guard-interaction-emphasis: Inline color-mix patterns detected that must use the mixin or canonical token:\n",
    );
    for (const err of errors) {
      console.error(`  ✘ ${err}\n`);
    }
    console.error(
      "Fix: replace each inline color-mix with the appropriate mixin call or token.",
    );
    console.error(
      "Reference: docs/design/state-visuals.md § Interaction emphasis",
    );
    process.exit(1);
  }

  console.log(
    `guard-interaction-emphasis: passed (${allFiles.length} SCSS files checked).`,
  );
}

check();
