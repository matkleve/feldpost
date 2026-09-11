---
name: component-structure
description: "Prevent component chaos by enforcing ownership matrix, interactive tree safety, wrapper budget, state exclusivity, CSS ownership gate, and Tailwind-vs-SCSS planning before implementation. Use when creating/refactoring Angular components and subcomponents (spec/html/scss/ts)."
---

<!-- canonical: .cursor/skills/component-structure/SKILL.md -->

# component-structure — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/component-structure/SKILL.md`](../../../.cursor/skills/component-structure/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `component-structure` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
