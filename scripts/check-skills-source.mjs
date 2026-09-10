#!/usr/bin/env node
/**
 * Gate: one source per skill.
 *
 * Skills are discovered by several harnesses from several directories —
 * `.cursor/skills/` (Cursor), and `.github/skills/` / `.claude/skills/` /
 * `.agents/skills/` (the Agent Skills spec, read by GitHub Copilot's cloud
 * agent, code review, CLI and IDE agent mode). Keeping a real copy in more
 * than one of them means each harness runs whichever copy its own directory
 * happens to hold, and nothing reports the difference.
 *
 * That is not hypothetical here. Before this gate, 11 skills existed twice and
 * two had already diverged: `.cursor/skills/component-structure` had gained an
 * "FSM ↔ CSS ↔ DOM" section and `.cursor/skills/implement-from-spec` a
 * "Stateful / layered UI (FSM)" section, neither of which the `.github/` copy
 * ever got. So a Copilot session was running an older contract than a Cursor
 * session. Two copies of a rule that have drifted are worse than either copy
 * alone, because a reader cannot tell which one is current.
 *
 * The fix is structural: `.cursor/skills/` holds the instructions, and every
 * other discovery directory holds a generated pointer stub carrying no rules of
 * its own. This script owns the stub text, so "is the mirror still a pointer?"
 * is byte-exact rather than a judgement call.
 *
 * Rules (all hard):
 *   1. A mirrored skill must be exactly the generated stub — any content of its
 *      own is drift.
 *   2. A mirrored skill must have a canonical counterpart — otherwise the only
 *      copy of that skill lives outside the canonical tree.
 *   3. A mirrored skill directory holds nothing but SKILL.md — no duplicated
 *      `references/`.
 *   4. Every canonical skill has a stub in every mirror tree present in the
 *      repo, so a harness reading that tree can still find the skill by name.
 *   5. Archived skills (`.cursor/skills/archive/**`) are never mirrored — a
 *      retired workflow must not be auto-loaded as a live one.
 *
 * `--fix` regenerates every stub. See docs/audits/2026-09-08-grundriss-adoption.md § E3.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/** The one tree that holds instructions. Everything else points at it. */
const CANONICAL = ".cursor/skills";

/**
 * Trees a harness discovers skills from. Only those present in the repo are
 * checked, so adding `.claude/skills/` later brings it under the gate with no
 * change here.
 */
const MIRRORS = [".github/skills", ".claude/skills", ".agents/skills"];

/** Retired skills. Kept for reference, never mirrored into a live tree. */
const ARCHIVE_SEGMENT = "archive";

const fix = process.argv.includes("--fix");

/** Every `<dir>/SKILL.md` under `tree`, as tree-relative directory names. */
function skillDirs(tree) {
  const abs = join(ROOT, tree);
  if (!existsSync(abs)) return null;

  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "SKILL.md") found.push(relative(abs, dir).split("\\").join("/"));
    }
  };
  walk(abs);
  return found.sort();
}

/** `name` and `description` from the YAML frontmatter, or null when absent. */
function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) return null;

  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;

  const fields = {};
  for (const line of text.slice(4, end).split("\n")) {
    const match = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim();
    fields[match[1]] =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;
  }
  return fields;
}

/**
 * The stub text. Frontmatter mirrors the canonical skill so relevance matching
 * by name and description still works; the body carries no rules, only the
 * instruction to go read the one that does.
 */
function renderStub({ mirror, skill, name, description }) {
  const canonicalPath = `${CANONICAL}/${skill}/SKILL.md`;
  const href = relative(join(ROOT, mirror, skill), join(ROOT, canonicalPath)).split("\\").join("/");

  return `---
name: ${name}
description: ${JSON.stringify(description)}
---

<!-- canonical: ${canonicalPath} -->

# ${name} — pointer, not a skill

The instructions for this skill live in exactly one place:

**[\`${canonicalPath}\`](${href})**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under \`${mirror}/\`
still finds \`${name}\` by name and gets sent to the single source.

Do not copy the instructions back into this file. \`node scripts/check-skills-source.mjs\`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to \`component-structure\` and \`implement-from-spec\`.
`;
}

const canonical = skillDirs(CANONICAL);
if (canonical === null) {
  console.error(`✗ skills-source: canonical tree ${CANONICAL}/ does not exist`);
  process.exit(1);
}

const isArchived = (skill) => skill.split("/").includes(ARCHIVE_SEGMENT);
const live = canonical.filter((skill) => !isArchived(skill));

const problems = [];
let written = 0;
let stubs = 0;

for (const mirror of MIRRORS) {
  const mirrored = skillDirs(mirror);
  if (mirrored === null) continue;

  for (const skill of mirrored) {
    const file = join(ROOT, mirror, skill, "SKILL.md");

    if (isArchived(skill) || !canonical.includes(skill)) {
      const reason = isArchived(skill)
        ? `archived skills are not mirrored — delete it, ${CANONICAL}/${skill}/ is the reference copy`
        : `no counterpart at ${CANONICAL}/${skill}/SKILL.md — move the content there and leave a stub (--fix writes it)`;
      problems.push(`✗ ${mirror}/${skill}/SKILL.md\n  → ${reason}`);
      continue;
    }

    const extras = readdirSync(join(ROOT, mirror, skill), { withFileTypes: true })
      .filter((entry) => entry.name !== "SKILL.md")
      .map((entry) => entry.name);
    if (extras.length) {
      problems.push(
        `✗ ${mirror}/${skill}/\n` +
          `  → mirrored skills hold nothing but SKILL.md; found ${extras.join(", ")}\n` +
          `  → the canonical copy owns supporting files: ${CANONICAL}/${skill}/`,
      );
    }

    const meta = frontmatter(join(ROOT, CANONICAL, skill, "SKILL.md"));
    if (!meta?.name || !meta?.description) {
      problems.push(
        `✗ ${CANONICAL}/${skill}/SKILL.md\n  → frontmatter needs \`name\` and \`description\`; the stub is generated from them`,
      );
      continue;
    }

    const expected = renderStub({ mirror, skill, name: meta.name, description: meta.description });
    if (readFileSync(file, "utf8") === expected) {
      stubs += 1;
      continue;
    }

    if (fix) {
      writeFileSync(file, expected);
      written += 1;
      continue;
    }

    problems.push(
      `✗ ${mirror}/${skill}/SKILL.md\n` +
        `  → not the generated pointer stub. ${CANONICAL}/${skill}/SKILL.md is the one source.\n` +
        `  → run: node scripts/check-skills-source.mjs --fix`,
    );
  }

  for (const skill of live) {
    if (mirrored.includes(skill)) continue;

    const meta = frontmatter(join(ROOT, CANONICAL, skill, "SKILL.md"));
    if (!meta?.name || !meta?.description) continue; // reported above

    if (fix) {
      mkdirSync(join(ROOT, mirror, skill), { recursive: true });
      writeFileSync(
        join(ROOT, mirror, skill, "SKILL.md"),
        renderStub({ mirror, skill, name: meta.name, description: meta.description }),
      );
      written += 1;
      continue;
    }

    problems.push(
      `✗ ${mirror}/${skill}/SKILL.md is missing\n` +
        `  → a harness reading ${mirror}/ cannot discover this skill.\n` +
        `  → run: node scripts/check-skills-source.mjs --fix`,
    );
  }
}

/** Sanity: the canonical tree must not itself be a pile of pointers. */
for (const skill of live) {
  const text = readFileSync(join(ROOT, CANONICAL, skill, "SKILL.md"), "utf8");
  if (text.includes("<!-- canonical:")) {
    problems.push(
      `✗ ${CANONICAL}/${skill}/SKILL.md\n  → the canonical copy is a pointer stub; the instructions have to live here`,
    );
  }
}

if (written) {
  console.log(`✓ skills-source: wrote ${written} pointer stub(s)`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✗ skills-source: ${problems.length} problem(s)`);
  process.exit(1);
}

const trees = MIRRORS.filter((m) => existsSync(join(ROOT, m)));
console.log(
  `✓ skills-source: ${live.length} skills in ${CANONICAL}/, ` +
    `${stubs + written} pointer stub(s) across ${trees.length} mirror tree(s) (${trees.join(", ")}), no duplicated content`,
);
