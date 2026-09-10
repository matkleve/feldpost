---
name: design-audit
description: "Audits proposed or existing UI designs before implementation for ownership, wiring, token use, component reuse, overflow risk, accessibility, state coverage, and current external pattern evidence. Use when the user asks to review a design, UI plan, mockup, vibe-coded UI, auth/form layout, component composition, visual treatment, or asks whether to reuse or create UI components."
---

<!-- canonical: .cursor/skills/design-audit/SKILL.md -->

# design-audit — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/design-audit/SKILL.md`](../../../.cursor/skills/design-audit/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `design-audit` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
