#!/usr/bin/env node
/**
 * Gate: every production component is named in at least one spec.
 *
 * This is the reverse direction of `check-spec-code-paths.mjs`. That one asks
 * "does every path a spec cites exist in code?" and catches specs that outlive
 * the code. This one asks "is every component in code named by some spec?" and
 * catches the opposite drift: a component that shipped without documentation.
 * Nothing checked that direction before, so it accumulated silently — and the
 * silence was load-bearing, because `.cursor/rules/component-reuse-gate.mdc`
 * tells agents to search the spec system for an existing component before
 * building a new one. A component absent from the specs is invisible to that
 * search and gets rebuilt.
 *
 * READ THIS BEFORE TRUSTING THE NAME. This check does *not* verify AGENTS.md
 * § Component Spec Coverage, which requires every component to have its own
 * *dedicated* spec. It verifies the weaker floor: the component is mentioned
 * somewhere, by filename or selector. Passing here means "documented at all",
 * not "compliant". The stronger check is worth building later; this one is the
 * part that can be enforced today with zero false positives, and calling it
 * what it is beats a gate whose name overstates it.
 *
 * Coverage is by *literal mention* of the component's filename or selector in
 * any `docs/specs/**.md`. A spec that describes a component in prose without
 * ever naming its file or selector will read as uncovered. That is intentional:
 * every spec is supposed to carry a File Map naming its implementation, so the
 * fix is to add the path to the spec rather than to loosen the check.
 *
 * ALLOWLIST is a ratchet, not an exemption. It holds the components already
 * uncovered when this gate was introduced (2026-09-10). It may only shrink: the
 * check fails if a listed component becomes covered or stops existing, so
 * removing an entry is forced rather than remembered. A new component may never
 * be added to it.
 */

import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * Uncovered when the gate was introduced (2026-09-10). Not scattered drift —
 * three whole feature areas shipped without specs: the seven organization
 * sections, five of the projects surfaces, and the three colleagues surfaces.
 * Tracked in issue #180. `projects-confirm-dialog` is the sharpest case: it is
 * recommended *by name* in component-reuse-gate.mdc as the destructive-confirm
 * component and has no spec of its own.
 */
const ALLOWLIST = new Set([
  "apps/web/src/app/layout/shell-route-placeholder.component.ts",
  "apps/web/src/app/features/organization/sections/audit/organization-audit-section.component.ts",
  "apps/web/src/app/features/organization/sections/billing/organization-billing-section.component.ts",
  "apps/web/src/app/features/organization/sections/branding/organization-branding-section.component.ts",
  "apps/web/src/app/features/organization/sections/export/organization-export-section.component.ts",
  "apps/web/src/app/features/organization/sections/integrations/organization-integrations-section.component.ts",
  "apps/web/src/app/features/organization/sections/profile/organization-profile-section.component.ts",
  "apps/web/src/app/features/organization/sections/roles/organization-roles-section.component.ts",
  "apps/web/src/app/features/projects/dashboard/project-dashboard-view.component.ts",
  "apps/web/src/app/features/projects/details-panel/project-details-panel.component.ts",
  "apps/web/src/app/features/projects/dialogs/projects-confirm-dialog.component.ts",
  "apps/web/src/app/features/projects/media-section/project-media-section.component.ts",
  "apps/web/src/app/features/projects/sidebar/projects-sidebar.component.ts",
  "apps/web/src/app/features/settings-overlay/sections/search-tuning-settings-section.component.ts",
  "apps/web/src/app/features/colleagues/invites/colleagues-invite-reusable-links-panel.component.ts",
  "apps/web/src/app/features/colleagues/invites/colleagues-invites-panel.component.ts",
  "apps/web/src/app/features/colleagues/page/colleagues-page.component.ts",
]);

function tracked(pathspec) {
  return execFileSync("git", ["ls-files", "-z", pathspec], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

// Filter by suffix in JS rather than with a `**/*.component.ts` pathspec: git
// treats the `**/` as requiring at least one directory, so that glob silently
// omits apps/web/src/app/app.component.ts, the root component. A gate that
// quietly skips a file is worse than no gate.
//
// apps/web/src/app/archive/** is excluded from the app build and is dead code
// by AGENTS.md § Dead code, so it is not production and needs no spec.
const components = tracked("apps/web/src/app")
  .filter((f) => f.endsWith(".component.ts"))
  .filter((f) => !f.startsWith("apps/web/src/app/archive/"));

const specText = tracked("docs/specs")
  .filter((f) => f.endsWith(".md"))
  .map((f) => readFileSync(join(ROOT, f), "utf8"))
  .join("\n");

const SELECTOR = /selector:\s*['"]([^'"]+)['"]/;

function isCovered(file) {
  if (specText.includes(basename(file))) return true;
  const selector = SELECTOR.exec(readFileSync(join(ROOT, file), "utf8"))?.[1];
  return Boolean(selector) && specText.includes(selector);
}

const uncovered = [];
const staleAllowlist = [];

for (const file of components) {
  const covered = isCovered(file);
  if (covered && ALLOWLIST.has(file)) {
    staleAllowlist.push(`${file} — now named in a spec; remove it from ALLOWLIST`);
    continue;
  }
  if (!covered && !ALLOWLIST.has(file)) uncovered.push(file);
}

for (const file of ALLOWLIST) {
  if (!components.includes(file)) {
    staleAllowlist.push(`${file} — no longer exists; remove it from ALLOWLIST`);
  }
}

const problems = [
  ...uncovered.map((f) => `✗ ${f}  named in no spec`),
  ...staleAllowlist.map((m) => `✗ ${m}`),
];

if (problems.length) {
  console.error(problems.join("\n"));
  if (uncovered.length) {
    console.error(
      "\nEvery production component must be named by a spec — by filename or selector, in" +
        "\nits spec's File Map. A component no spec names is invisible to the component" +
        "\nreuse gate and gets rebuilt by the next agent. Write the spec; do not extend" +
        "\nALLOWLIST, which is a closed ratchet for pre-existing gaps only.",
    );
  }
  console.error(
    `\n✗ spec-coverage: ${uncovered.length} uncovered component(s), ` +
      `${staleAllowlist.length} stale allowlist entr(ies) of ${components.length} components`,
  );
  process.exit(1);
}

console.log(
  `✓ spec-coverage: all ${components.length - ALLOWLIST.size} of ${components.length} ` +
    `components are named in a spec (${ALLOWLIST.size} pre-existing gaps allowlisted, issue #180)`,
);
