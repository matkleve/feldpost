---
name: audit-scope-to-issues
description: "Audit a Feldpost folder or file for spec drift, likely bugs, and naming/glossary drift, then create GitHub issues from findings. Use when the user asks to check/audit a path and file issues."
---

<!-- canonical: .cursor/skills/audit-scope-to-issues/SKILL.md -->

# audit-scope-to-issues — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/audit-scope-to-issues/SKILL.md`](../../../.cursor/skills/audit-scope-to-issues/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `audit-scope-to-issues` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
