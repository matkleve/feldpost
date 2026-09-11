---
name: implement-from-spec
description: "Implement a UI element from its element spec. Specs are contracts — follow them literally."
---

<!-- canonical: .cursor/skills/implement-from-spec/SKILL.md -->

# implement-from-spec — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/implement-from-spec/SKILL.md`](../../../.cursor/skills/implement-from-spec/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `implement-from-spec` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
