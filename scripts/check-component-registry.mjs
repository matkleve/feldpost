#!/usr/bin/env node
/**
 * Gate: the component registry describes the components that actually exist.
 *
 * The reuse gate is a Hard Blocker — AGENTS.md § Required Feature Workflow
 * step 5 and .cursor/rules/component-reuse-gate.mdc both say "search the
 * registry before writing a new component". Until this script existed nothing
 * compared that catalog to `apps/web/src`, and it had drifted both ways: 15 of
 * the 82 shared components had no entry at all, and 10 entries described
 * selectors that exist nowhere in the codebase. An agent obeying the gate would
 * miss a reusable component and be offered a deleted one.
 *
 * Asserted here:
 *   1. coverage      every shared component with a selector has a registry entry
 *   2. paths+specs   every entry's `path` and `spec` resolve on disk
 *   3. specId        `specId` agrees with `spec`
 *   4. freshness     the rendered supplements match registry.json
 *   5. stale ratchet entries whose component is gone are counted, and the count
 *                    may only go down
 *
 * Scope of assertion 1 is `apps/web/src/app/shared/` only. Feature-local
 * components are catalogued for orientation but are by definition not reuse
 * targets ("not intended for reuse outside their feature folder" —
 * registry.feature-local.supplement.md), so the catalog is not required to be
 * exhaustive there. Entries that do exist for them are still checked by 2–4.
 *
 * Usage: node scripts/check-component-registry.mjs
 * Exit 0 when the registry matches the code; 1 otherwise.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { readRegistry, renderAll, ROOT } from "./generate-component-registry.mjs";

/** Assertion 1 is exhaustive here and nowhere else. */
const EXHAUSTIVE_ROOT = "apps/web/src/app/shared";

/**
 * Entries kept after their component was deleted, pending an owner decision to
 * remove or restore them. Measured 2026-09-10; a ratchet, not an exemption —
 * raising it needs the same review as deleting the entries would.
 */
const MAX_STALE_ENTRIES = 10;

const COL = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const errors = [];
const notes = [];

function fail(rule, message) {
  errors.push({ rule, message });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const registry = readRegistry();
const components = registry.components;

// ── 1. coverage ─────────────────────────────────────────────────────────────

const sharedFiles = walk(join(ROOT, EXHAUSTIVE_ROOT))
  .filter((f) => f.endsWith(".component.ts") && !f.endsWith(".spec.ts"))
  .map((f) => relative(ROOT, f).replaceAll("\\", "/"))
  .sort();

const withoutSelector = [];
const uncovered = [];
const registryPaths = components.map((c) => c.path).filter(Boolean);

for (const file of sharedFiles) {
  const source = readFileSync(join(ROOT, file), "utf8");
  if (!/selector:\s*['"`]/.test(source)) {
    // Abstract base classes (`@Directive` with no selector) cannot be reused by
    // selector, so there is nothing for the reuse gate to find. Named, not hidden.
    withoutSelector.push(file);
    continue;
  }
  const covered = registryPaths.some(
    (path) => path === file || (path.endsWith("/") && file.startsWith(path)),
  );
  if (!covered) uncovered.push(file);
}

for (const file of uncovered) {
  fail("registry-coverage", `${file} has no registry entry (add one to ${"docs/specs/component/registry.json"})`);
}
notes.push(
  `${sharedFiles.length} shared components · ${withoutSelector.length} without a selector (abstract base, out of scope): ${
    withoutSelector.map((f) => f.split("/").pop()).join(", ") || "none"
  }`,
);

// ── 2. paths and specs resolve ──────────────────────────────────────────────

const stale = components.filter((c) => c.status === "stale");

for (const entry of components) {
  const label = entry.selector ?? entry.name;

  if (entry.path && entry.status !== "stale" && !existsSync(join(ROOT, entry.path))) {
    fail("registry-path", `${label}: path does not exist — ${entry.path}`);
  }
  if (entry.spec && !existsSync(join(ROOT, entry.spec))) {
    fail("registry-spec", `${label}: spec does not exist — ${entry.spec}`);
  }

  // ── 3. specId agrees with spec ──
  const expectedId = entry.spec
    ? entry.spec.replace(/^docs\/specs\//, "").replace(/\.md$/, "")
    : null;
  if ((entry.specId ?? null) !== expectedId) {
    fail(
      "registry-spec-id",
      `${label}: specId '${entry.specId}' does not match spec '${entry.spec}' (expected '${expectedId}')`,
    );
  }
}

// ── 4. rendered supplements are not stale ───────────────────────────────────

for (const { file, contents } of renderAll(registry)) {
  if (!existsSync(join(ROOT, file))) {
    fail("registry-generated", `${file} is missing — run node scripts/generate-component-registry.mjs`);
    continue;
  }
  if (readFileSync(join(ROOT, file), "utf8") !== contents) {
    fail(
      "registry-generated",
      `${file} does not match registry.json — run node scripts/generate-component-registry.mjs`,
    );
  }
}

// ── 5. stale-entry ratchet ──────────────────────────────────────────────────

if (stale.length > MAX_STALE_ENTRIES) {
  fail(
    "registry-stale-ratchet",
    `${stale.length} stale entries, ratchet is ${MAX_STALE_ENTRIES}. Delete the entry or restore the component; do not raise the ratchet.`,
  );
}

// ── Output ──────────────────────────────────────────────────────────────────

console.log(`\n${COL.bold}Component Registry Check${COL.reset}`);
console.log("─".repeat(60));
console.log(
  `${COL.dim}${components.length} entries · ${sharedFiles.length} shared components · scope: ${EXHAUSTIVE_ROOT}${COL.reset}`,
);
for (const note of notes) console.log(`${COL.dim}${note}${COL.reset}`);

if (stale.length) {
  console.log(
    `${COL.yellow}!${COL.reset} ${stale.length}/${MAX_STALE_ENTRIES} stale entries — component deleted, entry kept pending an owner decision:`,
  );
  for (const entry of stale) {
    console.log(`${COL.dim}    ${entry.selector} — ${entry.path}${COL.reset}`);
  }
}

if (errors.length) {
  console.log("");
  for (const { rule, message } of errors) {
    console.log(`${COL.red}✖${COL.reset} ${COL.dim}[${rule}]${COL.reset} ${message}`);
  }
  console.log(
    `\n${COL.red}${errors.length} error${errors.length === 1 ? "" : "s"}${COL.reset} — registry.json and apps/web/src disagree.\n`,
  );
  process.exit(1);
}

console.log(`\n${COL.green}✔ component registry matches the code${COL.reset}\n`);
