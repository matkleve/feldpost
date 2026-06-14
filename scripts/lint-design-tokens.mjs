#!/usr/bin/env node

/**
 * Lightweight token-lint gate for CI.
 * Catches hardcoded values that should use design tokens.
 * Runs as part of `npm run design-system:check`.
 *
 * @see .cursor/rules/token-usage-gate.mdc (agent-facing lookup table)
 * @see docs/design/tokens.md (canonical reference)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const errors = [];
const warnings = [];

function rg(pattern, paths, flags = "") {
  try {
    const cmd = `rg ${flags} --no-heading --line-number "${pattern}" ${paths.join(" ")}`;
    return execSync(cmd, { encoding: "utf-8", cwd: process.cwd() }).trim();
  } catch {
    return "";
  }
}

const appScss = "apps/web/src/app";
const sharedScss = "apps/web/src/app/shared";

// ── Forbidden legacy tokens ─────────────────────────────────────────────────

const legacyHits = rg("var\\(--color-clay|var\\(--fp-|var\\(--overlay-rail-|var\\(--layout-sidebar-", [appScss], "--glob '*.scss'");
if (legacyHits) {
  for (const line of legacyHits.split("\n").filter(Boolean)) {
    errors.push(`Legacy token: ${line}`);
  }
}

// ── Hardcoded pill radius ───────────────────────────────────────────────────

const pillHits = rg("border-radius:\\s*999px|border-radius:\\s*9999px", [appScss], "--glob '*.scss' --glob '*.ts'");
if (pillHits) {
  for (const line of pillHits.split("\n").filter(Boolean)) {
    errors.push(`Use var(--radius-full) instead of hardcoded pill radius: ${line}`);
  }
}

// ── Hardcoded sandstone hex (should use var(--sandstone-*)) ─────────────────

const sandstoneHex = ["#2f271f", "#6b5a47", "#a38d73", "#c59f63", "#66594a"];
for (const hex of sandstoneHex) {
  const hits = rg(hex, [appScss], "--glob '*.scss'");
  if (hits) {
    for (const line of hits.split("\n").filter(Boolean)) {
      errors.push(`Use var(--sandstone-*) instead of hardcoded hex: ${line}`);
    }
  }
}

// ── Z-index drift from product ladder ───────────────────────────────────────

const toastScss = "apps/web/src/app/shared/toast/toast-container.component.scss";
if (existsSync(resolve(process.cwd(), toastScss))) {
  const content = readFileSync(resolve(process.cwd(), toastScss), "utf-8");
  const zMatch = content.match(/z-index:\s*(\d+)/);
  if (zMatch && Number(zMatch[1]) !== 400) {
    errors.push(`${toastScss}: Toast z-index is ${zMatch[1]}, expected 400 per docs/design/tokens.md`);
  }
}

// ── Advisory: raw rem font-size in shared components (warn only) ─────────────

const rawFontHits = rg("font-size:\\s*0\\.[0-9]+rem", [sharedScss], "--glob '*.scss'");
if (rawFontHits) {
  const lines = rawFontHits.split("\n").filter(Boolean);
  if (lines.length > 5) {
    warnings.push(`${lines.length} raw font-size values in shared/ — consider migrating to var(--font-size-*)`);
  }
}

// ── Theme parity: light vars that need a dark override ──────────────────────

const stylesPath = "apps/web/src/styles.scss";
if (existsSync(resolve(process.cwd(), stylesPath))) {
  const stylesContent = readFileSync(resolve(process.cwd(), stylesPath), "utf-8");

  function extractVars(block) {
    const matches = block.matchAll(/^\s*--([\w-]+):/gm);
    return new Set([...matches].map(m => m[1]));
  }

  const rootMatch = stylesContent.match(/:root\s*\{([\s\S]*?)^\}/m);
  const darkMatch = stylesContent.match(/@mixin tweakcn-dark-semantic-palette\s*\{([\s\S]*?)^\}/m);

  if (rootMatch && darkMatch) {
    const lightVars = extractVars(rootMatch[1]);
    const darkVars = extractVars(darkMatch[1]);

    // Vars that are layout/utility and intentionally theme-independent
    const themeIndependent = new Set([
      "spacing", "tracking-normal", "radius",
      "font-sans", "font-serif", "font-mono",
      "shadow-x", "shadow-y", "shadow-blur", "shadow-spread", "shadow-opacity",
    ]);

    const missingInDark = [...lightVars]
      .filter(v => !darkVars.has(v) && !themeIndependent.has(v))
      .filter(v => !v.startsWith("sandstone-")); // sandstone-only tokens

    if (missingInDark.length > 3) {
      warnings.push(`${missingInDark.length} :root vars without dark override — check if new color/state tokens need dark values: ${missingInDark.slice(0, 5).map(v => '--' + v).join(', ')}...`);
    }
  }
}

// ── Banned :host-context sandstone blocks ────────────────────────────────────

const hostContextHits = rg(":host-context\\(\\[data-theme.*sandstone", [appScss], "--glob '*.scss'");
if (hostContextHits) {
  for (const line of hostContextHits.split("\n").filter(Boolean)) {
    errors.push(`Banned :host-context sandstone — use global --menu-*/--action-* tokens: ${line}`);
  }
}

// ── Banned component-local theme bridge vars ─────────────────────────────────

const localBridgeHits = rg("\\-\\-mdv-|\\-\\-cde-|\\-\\-invite-border-muted", [appScss], "--glob '*.scss'");
if (localBridgeHits) {
  for (const line of localBridgeHits.split("\n").filter(Boolean)) {
    errors.push(`Removed local theme bridge var — use global tokens: ${line}`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log("\nToken lint warnings:");
  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
}

if (errors.length > 0) {
  console.error("\nToken lint FAILED:");
  for (const e of errors) {
    console.error(`  ✗ ${e}`);
  }
  process.exit(1);
}

console.log("Token lint passed.");
