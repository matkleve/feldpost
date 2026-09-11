---
name: ship-pipeline
description: "Take an idea from intake to shippable code through gated stages (Ready → Specify → Plan → Tasks → Implement → Verify → Done). Trigger with phrases like 'work through the shipping pipeline' or 'let's ship this idea'. Blocks on under-specified work."
---

<!-- canonical: .cursor/skills/ship-pipeline/SKILL.md -->

# ship-pipeline — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/ship-pipeline/SKILL.md`](../../../.cursor/skills/ship-pipeline/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `ship-pipeline` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
