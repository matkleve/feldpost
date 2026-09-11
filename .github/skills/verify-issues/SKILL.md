---
name: verify-issues
description: "Verify Feldpost GitHub issues against code, specs, and acceptance criteria, then close only issues that are proven complete. Use when asked to check open issues, mark done, close completed issues, or audit issue status."
---

<!-- canonical: .cursor/skills/verify-issues/SKILL.md -->

# verify-issues — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/verify-issues/SKILL.md`](../../../.cursor/skills/verify-issues/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `verify-issues` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
