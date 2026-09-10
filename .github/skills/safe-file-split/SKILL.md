---
name: safe-file-split
description: "Safely split large files in any part of the codebase without changing behavior. Use when asked to split/aufsplitten/refactor large files with strict anti-regression gates."
---

<!-- canonical: .cursor/skills/safe-file-split/SKILL.md -->

# safe-file-split — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/safe-file-split/SKILL.md`](../../../.cursor/skills/safe-file-split/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `safe-file-split` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
