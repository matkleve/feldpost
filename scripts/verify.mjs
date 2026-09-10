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
  {
    name: "spec-code-paths",
    cmd: "node",
    args: ["scripts/check-spec-code-paths.mjs"],
    soft: true,
    debt:
      "263 broken code paths outside docs/specs/service/media-upload-service, docs/specs/component/upload, docs/specs/ui/upload (2026-09-10) — those three were the upload-process audit's scope and are now clean; the rest is unrelated pre-existing drift across the wider docs/specs tree.",
  },
  {
    name: "specs",
    cmd: "npm",
    args: ["run", "--silent", "lint:specs"],
    soft: true,
    debt: "201 errors predating this gate (spec size caps + missing sections). Tracked in docs/specs/SPEC-SIZE-BACKLOG.md.",
  },
  { name: "design-system", cmd: "npm", args: ["run", "--silent", "design-system:check"] },
  { name: "i18n", cmd: "npm", args: ["run", "--silent", "i18n:check"] },
  {
    name: "lint",
    cmd: "npm",
    args: ["run", "--silent", "lint"],
    soft: true,
    debt: "151 errors + 1068 warnings on main (2026-09-08); `--max-warnings 0` means warnings fail too.",
  },
  {
    name: "test",
    cmd: "npm",
    args: ["run", "--silent", "test"],
    soft: true,
    debt: "the test bundle does not compile on main (2026-09-08): ~101 TS errors, incl. 4 unresolved imports in *.spec.ts. Fix this first.",
  },
  { name: "build", cmd: "npm", args: ["run", "--silent", "build"] },
];

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
