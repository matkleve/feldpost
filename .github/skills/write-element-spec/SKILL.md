---
name: write-element-spec
description: "Write a structured element spec for a UI element. Use when planning a new feature before implementation, creating spec documents in docs/specs/."
---

<!-- canonical: .cursor/skills/write-element-spec/SKILL.md -->

# write-element-spec — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/write-element-spec/SKILL.md`](../../../.cursor/skills/write-element-spec/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `write-element-spec` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
