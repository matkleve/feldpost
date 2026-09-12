#!/usr/bin/env node
/**
 * The gate. One command, so that "did you run the checks?" has one answer.
 *
 * Before this existed the answer depended on knowing which of `lint:specs`,
 * `design-system:check`, `i18n:check`, `ng build` and `ng test` applied to the
 * files you touched. That mapping is written down in AGENTS.md per change
 * class, and it still got skipped — not out of laziness, but because nobody can
 * hold the list. CI runs this same command (.github/workflows/verify.yml), so
 * local and CI cannot drift.
 *
 * Everything runs even after a failure, so one run tells you everything that is
 * wrong rather than the first thing.
 *
 * `soft: true` marks a check that is known-red for reasons predating this gate.
 * It reports loudly and does not fail the run. Three checks start soft, each
 * with the count measured on 2026-09-08; the counts are the ratchet — they may
 * only go down. A soft check is a debt with a name and a number, not an
 * exemption, and making a check soft to get a green run is the one thing this
 * file must never be used for.
 *
 * Why soft rather than red: `Build & Test` had been failing on `main` for
 * months without anyone acting on it. A gate that is red on a clean tree from
 * day one teaches people to ignore it, which is the failure this gate exists to
 * end. Everything genuinely green today (doc-links, design-system, i18n, build)
 * fails hard. See docs/audits/2026-09-08-grundriss-adoption.md § A5.
 */

import { spawnSync } from "node:child_process";

const CHECKS = [
  { name: "doc-links", cmd: "node", args: ["scripts/check-doc-links.mjs"] },
  { name: "skills-source", cmd: "node", args: ["scripts/check-skills-source.mjs"] },
  {
    name: "spec-code-paths",
    cmd: "node",
    args: ["scripts/check-spec-code-paths.mjs"],
    soft: true,
    debt:
      "204 broken code paths (2026-09-10; 263 → 262 when the component registry became generated, → 204 after clearing component/filters, service/filename-parser and service/media-download-service). Clean so far: the upload folders (media-upload-service, component/upload, ui/upload), filters, filename-parser, media-download-service. Largest remaining: ui/workspace 29, component/media 21, component/workspace 19, page 18, component/project 18, component/ui-primitives 16. Roughly 58% are moved files needing a repoint and 42% describe code that no longer exists. Tracked in issue #189.",
  },
  {
    name: "component-registry",
    cmd: "node",
    args: ["scripts/check-component-registry.mjs"],
  },
  { name: "spec-coverage", cmd: "node", args: ["scripts/check-spec-coverage.mjs"] },
  {
    name: "rpc-param-contract",
    cmd: "node",
    args: ["scripts/check-rpc-param-contract.mjs"],
  },
  {
    name: "upload-status-text",
    cmd: "node",
    args: ["scripts/validate-upload-status-text.mjs"],
  },
  {
    name: "specs",
    cmd: "npm",
    args: ["run", "--silent", "lint:specs"],
    soft: true,
    debt: "198 errors predating this gate (spec size caps + missing sections; down from 201 on 2026-09-08 after the upload-process-analysis merge). Tracked in docs/specs/SPEC-SIZE-BACKLOG.md.",
  },
  { name: "design-system", cmd: "npm", args: ["run", "--silent", "design-system:check"] },
  { name: "i18n", cmd: "npm", args: ["run", "--silent", "i18n:check"] },
  {
    name: "lint",
    cmd: "npm",
    args: ["run", "--silent", "lint"],
    soft: true,
    debt: "145 errors + 1038 warnings on main (2026-09-10, down from 151+1068 on 2026-09-08); `--max-warnings 0` means warnings fail too.",
  },
  {
    name: "test",
    cmd: "npm",
    args: ["run", "--silent", "test"],
    soft: true,
    debt:
      "30 failing tests across 13 pre-existing files (2026-09-12). This was recorded as 34/14 on 2026-09-10, but a clean-tree measurement on 2026-09-12 found 45/19 — the ratchet only means something if it is re-measured rather than carried forward, so this number was measured, not inherited. Down from 45 after: a chainable Supabase stub (src/test/mocks/supabase-chain.mock.ts) replacing hand-rolled query chains that broke whenever production extended a query; scoping vitest to src/ so it stops running Playwright e2e specs; and correcting tests that asserted the media_items location columns dropped in 20260525130000. The rest is per-file drift, largest first: projects-page 8, nav 6, login 4, media-detail-view.ui 3, then singles.",

  },
  { name: "build", cmd: "npm", args: ["run", "--silent", "build"] },
];

// `--list` exists so documentation can point at a command instead of copying
// the check names into prose. The copy in docs/agent-workflows/gates-and-commands.md
// had already lost `component-registry` by the time `spec-coverage` was added.
if (process.argv.includes("--list")) {
  for (const check of CHECKS) {
    console.log(`${check.name}\t${check.soft ? "soft (known debt)" : "hard"}`);
  }
  process.exit(0);
}

const only = process.argv.slice(2);
const selected = only.length ? CHECKS.filter((c) => only.includes(c.name)) : CHECKS;

if (only.length && selected.length === 0) {
  console.error(`Unknown check(s): ${only.join(", ")}`);
  console.error(`Available: ${CHECKS.map((c) => c.name).join(", ")}`);
  process.exit(2);
}

const failed = new Set();
const softFailed = new Set();

for (const check of selected) {
  process.stdout.write(`\n\x1b[1m▸ ${check.name}\x1b[0m\n`);
  const { status } = spawnSync(check.cmd, check.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (status === 0) continue;
  if (check.soft) softFailed.add(check.name);
  else failed.add(check.name);
}

console.log("\n" + "─".repeat(60));

for (const check of selected) {
  const mark = failed.has(check.name)
    ? "\x1b[31m✗"
    : softFailed.has(check.name)
      ? "\x1b[33m!"
      : "\x1b[32m✓";
  const note = softFailed.has(check.name) ? `  \x1b[33m(known debt: ${check.debt})` : "";
  console.log(`  ${mark} ${check.name}\x1b[0m${note}\x1b[0m`);
}

if (failed.size) {
  const first = [...failed][0];
  console.error(
    `\n\x1b[31m✗ verify failed: ${[...failed].join(", ")}\x1b[0m\n` +
      `  Re-run one at a time with: node scripts/verify.mjs ${first}\n`,
  );
  process.exit(1);
}

if (softFailed.size) {
  console.log(
    `\n\x1b[33m✓ verify passed, with known debt in: ${[...softFailed].join(", ")}\x1b[0m\n` +
      `  Do not add to it. Paste this output when you report the work done.\n`,
  );
} else {
  console.log("\n\x1b[32m✓ verify passed\x1b[0m — paste this output when you report the work done.\n");
}
