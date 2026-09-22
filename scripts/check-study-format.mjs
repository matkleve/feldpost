#!/usr/bin/env node
/**
 * Gate: the study system's own rules, made enforceable.
 *
 * `docs/study/` carries the repository's reasoning, and its value rests entirely
 * on two axes being trustworthy: a `status` that says whether a file still holds,
 * and an `id` that other documents, specs and issues can cite. Both are prose
 * conventions in `STUDY-FORMAT.md` — and prose conventions drift. They already
 * had: on the day this gate was written STUDY-009 carried `status: decided`, a
 * value that appears in no vocabulary, and `corrected-by: self (…)`, which is not
 * a study id. Nothing failed, because nothing was looking.
 *
 * What this checks is deliberately narrow: **structure, not judgement.** Whether
 * a claim is true, whether a study has gone stale, whether a grade is the right
 * grade — none of that is here. Those are an audit's job. A gate that reports
 * opinions gets ignored, and then so do its real findings.
 *
 * Rules, each from a named source:
 *
 *  1. Frontmatter is present and carries all five fields, `none` rather than
 *     omitted.                                  STUDY-FORMAT.md § Frontmatter
 *  2. `type` and `status` come from the documented vocabularies.
 *                                               STUDY-FORMAT.md § Frontmatter, § `status` values
 *  3. `id` is `STUDY-NNN`, matches the filename's `NNN`, and is unique.
 *                                               STUDY-FORMAT.md § Frontmatter (`id`)
 *  4. Every study has exactly one row in the README index, and that row's status
 *     agrees with the file.                     STUDY-FORMAT.md § Writing a study, step 5
 *  5. `supersedes` / `corrected-by` name study ids that exist.
 *                                               STUDY-FORMAT.md § Frontmatter
 *  6. No new file appears in a closed folder.   docs/study/README.md § Where new reasoning goes
 *
 * Known debt: a violation that predates this gate and cannot be fixed without
 * either editing a study body (forbidden — studies are never rewritten into
 * agreement) or taking a decision the product owner owns (a `status` change).
 * Each entry below is dated and says what it covers. The list is a ratchet: a
 * new violation fails, and an entry that no longer matches also fails, so the
 * debt cannot be carried after it is paid. It may only go down.
 *
 * @see docs/study/STUDY-FORMAT.md
 * @see docs/study/013-study-system-audit.md — the audit that produced this gate
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const STUDY_DIR = join(ROOT, "docs/study");

/** STUDY-FORMAT.md § Frontmatter — the `type` row. */
const TYPES = ["analysis", "investigation", "review", "proposal", "comparison"];

/** STUDY-FORMAT.md § `status` values. `historical` is the documented Feldpost extension. */
const STATUSES = [
  "draft",
  "proposed",
  "accepted",
  "active",
  "partially-remediated",
  "historical",
  "rejected",
  "superseded",
];

const REQUIRED = ["id", "type", "status", "supersedes", "corrected-by"];

/** docs/study/README.md § Where new reasoning goes — closed 2026-09-10. */
const CLOSED_FOLDERS = [
  "docs/audits",
  "docs/backlog",
  "docs/implementation-blueprints",
  "docs/migration/reports",
];

/**
 * The closed folders as they stood when they were closed. A path here may be
 * removed (that is reclassification into `docs/study/`, which is the intended
 * exit) but nothing may be added. Measured 2026-09-22: 65 tracked files, of
 * which 4 are folder READMEs — 61 documents. The counts in
 * `docs/study/README.md` § Where new reasoning goes are stated per folder.
 */
const CLOSED_FOLDER_BASELINE = new Set([
  "docs/audits/2026-09-08-design-system-adoption.md",
  "docs/audits/2026-09-08-grundriss-adoption.md",
  "docs/audits/2026-09-09-ui-primitives-conformance.md",
  "docs/audits/2026-09-10-engagement-summary.md",
  "docs/audits/2026-09-10-map-shell-test-migration-plan.md",
  "docs/audits/2026-09-10-spartan-and-state.md",
  "docs/audits/README.md",
  "docs/audits/file-status-consolidated-2026-04-15.md",
  "docs/audits/file-status-counts-2026-04-15.md",
  "docs/audits/moved-all-files-2026-04-15.md",
  "docs/audits/root-docs-coverage-2026-04-15.md",
  "docs/audits/root-docs-move-pass-2026-04-15.md",
  "docs/audits/root-docs-open-after-move-2026-04-15.md",
  "docs/audits/ui-containers-audit.md",
  "docs/audits/untouched-files-updated-root-and-readme-2026-04-15.md",
  "docs/audits/upload-flow-review-2026-09-10/01-flow-walkthrough.md",
  "docs/audits/upload-flow-review-2026-09-10/02-new-issues.md",
  "docs/audits/upload-flow-review-2026-09-10/03-hard-cases-and-decisions.md",
  "docs/audits/upload-flow-review-2026-09-10/04-status-of-prior-findings.md",
  "docs/audits/upload-flow-review-2026-09-10/05-address-resolution-and-ui-findings.md",
  "docs/audits/upload-flow-review-2026-09-10/06-improvement-plan.md",
  "docs/audits/upload-flow-review-2026-09-10/07-what-happens-when.md",
  "docs/audits/upload-flow-review-2026-09-10/08-product-intent-vs-code.md",
  "docs/audits/upload-process-analysis-2026-09-08/00-baseline.md",
  "docs/audits/upload-process-analysis-2026-09-08/00-progress.md",
  "docs/audits/upload-process-analysis-2026-09-08/01-structure.md",
  "docs/audits/upload-process-analysis-2026-09-08/02-happy-path.md",
  "docs/audits/upload-process-analysis-2026-09-08/03-branch-matrix.md",
  "docs/audits/upload-process-analysis-2026-09-08/04-state-machine.md",
  "docs/audits/upload-process-analysis-2026-09-08/05-spec-drift.md",
  "docs/audits/upload-process-analysis-2026-09-08/06-health.md",
  "docs/audits/upload-process-analysis-2026-09-08/07-failure-modes.md",
  "docs/audits/upload-process-analysis-2026-09-08/08-data-security.md",
  "docs/audits/upload-process-analysis-2026-09-08/09-coverage.md",
  "docs/audits/upload-process-analysis-2026-09-08/10-findings.md",
  "docs/audits/upload-process-analysis-2026-09-08/11-proposals.md",
  "docs/backlog/README.md",
  "docs/backlog/media-photo-symbol-rename-roadmap.md",
  "docs/backlog/prompt-analysis-upload-process.md",
  "docs/backlog/prompt-audit-specs-vs-code-and-media-terminology.md",
  "docs/backlog/service-spec-symmetry-matrix.md",
  "docs/backlog/sharing-first-and-pane-simplification-plan.md",
  "docs/backlog/workspace-pane-layout-and-spec-priorities.md",
  "docs/backlog/workspace-pane-layout-spec-implementation-plan.md",
  "docs/implementation-blueprints/README.md",
  "docs/implementation-blueprints/universal-search-provider-system.md",
  "docs/migration/reports/agent-handoff-authenticated-shell-layout-ownership.md",
  "docs/migration/reports/agent-token-decision-closure.md",
  "docs/migration/reports/archive-item-grid-legacy-deletion-prompt.md",
  "docs/migration/reports/authenticated-layout-sidebar-mount-2026-05-18.md",
  "docs/migration/reports/dropdown-component-structure-audit-2026-05-17.md",
  "docs/migration/reports/dropdown-deep-analysis-2026-05-17.md",
  "docs/migration/reports/legacy-token-deletion-status-2026-05-19.md",
  "docs/migration/reports/media-grid-warm-revisit-regression-2026-05-27.md",
  "docs/migration/reports/migration-explicit-progress-analysis-2026-05-18.md",
  "docs/migration/reports/n-n-locations-closure-qa.md",
  "docs/migration/reports/padding-and-hit-area-audit-2026-05-16.md",
  "docs/migration/reports/phase-10-manual-visual-matrix-gap-2026-05-18.md",
  "docs/migration/reports/phase-10-migration-smoke-gates-2026-05-18.md",
  "docs/migration/reports/phase-10-part2-issues.json",
  "docs/migration/reports/settings-overlay-notion-adjacent-ux-2026-05-18.md",
  "docs/migration/reports/settings-overlay-sections-layout-audit-2026-05-17.md",
  "docs/migration/reports/upload-panel-design-audit-2026-05-17.md",
  "docs/migration/reports/workspace-pane-round2-analysis-2026-05-19.md",
  "docs/migration/reports/workspace-pane-structure-audit-2026-05-19.md",
]);

/**
 * Violations that predate this gate.
 *
 * **Empty, and that is the point.** It carried two entries when this check was
 * written on 2026-09-22 — STUDY-009's `status: decided` and its
 * `corrected-by: self (…)`, both introduced by `cfc7c78` (2026-09-21) — because
 * fixing either needed a decision the product owner owns. The owner took both
 * the same day: `decided` became `accepted`, and the self-correction moved out
 * of the frontmatter into a banner at the top of the body, which is where a
 * reader needed it and what a reference field could never have said.
 *
 * The list is a ratchet in both directions. A violation outside it fails, and
 * an entry that no longer matches fails too — so debt cannot outlive its fix,
 * which is how this list emptied instead of quietly going stale.
 *
 * @see docs/study/013-study-system-audit.md § S-01, § S-02
 */
const KNOWN_DEBT = [];

const violations = [];
const matchedDebt = new Set();

/** Record a violation, or park it against a known-debt entry. */
function fail(file, rule, detail) {
  const debt = KNOWN_DEBT.findIndex(
    (d) => d.file === file && d.rule === rule && d.detail === detail,
  );
  if (debt !== -1) {
    matchedDebt.add(debt);
    return;
  }
  violations.push(`✗ docs/study/${file}  [${rule}] ${detail}`);
}

// ─── 1–5: the studies themselves ────────────────────────────────────────────

const files = readdirSync(STUDY_DIR)
  .filter((f) => /^\d{3}-.+\.md$/.test(f))
  .sort();

/** Parse the leading YAML frontmatter block. Flat `key: value` only, which is all the format uses. */
function readFrontmatter(source) {
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!block) return null;
  const fields = new Map();
  for (const line of block[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z][A-Za-z-]*):\s*(.*)$/);
    if (pair) fields.set(pair[1], pair[2].trim());
  }
  return fields;
}

/** `none`, or a comma-separated list of `STUDY-NNN`. Returns null when the shape is wrong. */
function parseReferences(value) {
  if (value === "none") return [];
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (!parts.every((p) => /^STUDY-\d{3}$/.test(p))) return null;
  return parts;
}

const studies = new Map(); // id -> { file, status }
const idOwner = new Map(); // id -> first file that claimed it

for (const file of files) {
  const source = readFileSync(join(STUDY_DIR, file), "utf8");
  const fields = readFrontmatter(source);

  if (!fields) {
    fail(file, "frontmatter", "no YAML frontmatter block at the top of the file");
    continue;
  }

  const missing = REQUIRED.filter((key) => !fields.has(key));
  if (missing.length) {
    fail(
      file,
      "frontmatter",
      `missing field(s): ${missing.join(", ")} — use \`none\` rather than omitting`,
    );
  }

  const id = fields.get("id");
  const expectedId = `STUDY-${file.slice(0, 3)}`;

  if (id !== undefined) {
    if (!/^STUDY-\d{3}$/.test(id)) {
      fail(file, "id-shape", `id "${id}" is not of the form STUDY-NNN`);
    } else if (id !== expectedId) {
      fail(file, "id-filename", `id ${id} does not match the filename's ${expectedId}`);
    } else if (idOwner.has(id)) {
      fail(file, "id-duplicate", `id ${id} is already used by ${idOwner.get(id)}`);
    } else {
      idOwner.set(id, file);
    }
  }

  const type = fields.get("type");
  if (type !== undefined && !TYPES.includes(type)) {
    fail(file, "type-vocabulary", `type "${type}" is not in the documented vocabulary`);
  }

  const status = fields.get("status");
  if (status !== undefined && !STATUSES.includes(status)) {
    fail(file, "status-vocabulary", `status "${status}" is not in the documented vocabulary`);
  }

  for (const field of ["supersedes", "corrected-by"]) {
    const raw = fields.get(field);
    if (raw === undefined) continue;
    const refs = parseReferences(raw);
    if (refs === null) {
      fail(file, "reference-shape", `${field} "${raw}" is not \`none\` or a list of STUDY-NNN ids`);
      continue;
    }
    for (const ref of refs) {
      if (!files.some((f) => f.startsWith(`${ref.slice(6)}-`))) {
        fail(file, "reference-target", `${field} names ${ref}, which has no file in docs/study/`);
      }
    }
  }

  // The filename is what the index links to, so key the index check on it even
  // when the id is wrong — otherwise one bad id hides a second problem.
  studies.set(file, { id: id ?? expectedId, status });
}

// ─── 4: the index ───────────────────────────────────────────────────────────

const INDEX = join(STUDY_DIR, "README.md");
const indexRows = new Map(); // filename -> { id, status, line }

readFileSync(INDEX, "utf8")
  .split(/\r?\n/)
  .forEach((line, i) => {
    // | STUDY-NNN | [title](./NNN-slug.md) | type | `status` | subject |
    const row = line.match(
      /^\|\s*(STUDY-\d{3})\s*\|\s*\[[^\]]*\]\(\s*\.\/(\d{3}-[^)\s]+\.md)\s*\)\s*\|[^|]*\|\s*`?([^|`]*?)`?\s*\|/,
    );
    if (!row) return;
    const [, id, target, status] = row;
    if (indexRows.has(target)) {
      violations.push(
        `✗ docs/study/README.md:${i + 1}  [index-duplicate] ${target} has more than one index row`,
      );
      return;
    }
    indexRows.set(target, { id, status: status.trim(), line: i + 1 });
  });

for (const [file, study] of studies) {
  const row = indexRows.get(file);
  if (!row) {
    fail(file, "index-missing", "no row in docs/study/README.md § Index");
    continue;
  }
  if (row.id !== study.id) {
    fail(file, "index-id", `index row says ${row.id}, the file says ${study.id}`);
  }
  if (study.status !== undefined && row.status !== study.status) {
    fail(
      file,
      "index-status",
      `index row says \`${row.status}\`, the file says \`${study.status}\``,
    );
  }
}

for (const [target, row] of indexRows) {
  if (!studies.has(target)) {
    violations.push(
      `✗ docs/study/README.md:${row.line}  [index-orphan] row links ./${target}, which does not exist`,
    );
  }
}

// ─── 6: the closed folders ──────────────────────────────────────────────────

/** `git ls-files` so untracked scratch files never fail the gate — same rule as doc-links. */
const closedFolderFiles = execFileSync("git", ["ls-files", "-z", ...CLOSED_FOLDERS], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

for (const path of closedFolderFiles) {
  if (CLOSED_FOLDER_BASELINE.has(path)) continue;
  violations.push(
    `✗ ${path}  [closed-folder] added to a folder closed to new documents on 2026-09-10\n` +
      "  → New reasoning is a study: docs/study/README.md § Where new reasoning goes",
  );
}

// ─── Report ─────────────────────────────────────────────────────────────────

// A debt entry that no longer matches has been paid. Carrying it would let the
// next violation of the same shape pass silently, so removing it is part of the
// fix rather than a follow-up.
const stale = KNOWN_DEBT.filter((_, i) => !matchedDebt.has(i));
for (const entry of stale) {
  violations.push(
    `✗ scripts/check-study-format.mjs  [debt-cleared] known debt no longer applies: ` +
      `${entry.file} [${entry.rule}] ${entry.detail}\n` +
      "  → Delete its KNOWN_DEBT entry in the same change. The ratchet may only go down.",
  );
}

if (matchedDebt.size) {
  console.log(
    `! study-format: ${matchedDebt.size} known debt violation(s) carried (see KNOWN_DEBT, measured 2026-09-22):`,
  );
  for (const i of [...matchedDebt].sort()) {
    const entry = KNOWN_DEBT[i];
    console.log(`    docs/study/${entry.file}  [${entry.rule}] ${entry.detail}`);
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  console.error(
    `\n✗ study-format: ${violations.length} violation(s) across ${files.length} studies ` +
      `and ${closedFolderFiles.length} closed-folder files`,
  );
  process.exit(1);
}

console.log(
  `✓ study-format: ${files.length} studies have valid frontmatter, unique ids matching their ` +
    `filenames, one index row each with a matching status, and resolving references; ` +
    `${closedFolderFiles.length} files in the four closed folders, none new`,
);
