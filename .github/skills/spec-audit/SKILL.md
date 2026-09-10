---
name: spec-audit
description: "Audits component spec files (markdown) for unclear responsibility boundaries, ownership conflicts, and internal inconsistencies. Use this skill whenever the user wants to review or audit component specs, check for unclear task distribution between components, find ownership conflicts, validate FSM consistency, check input/output completeness, or identify layer/z-index conflicts. Trigger on phrases like \"check the spec\", \"audit these components\", \"who owns what\", \"is this consistent\", \"find inconsistencies in the spec\"."
---

<!-- canonical: .cursor/skills/spec-audit/SKILL.md -->

# spec-audit — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/spec-audit/SKILL.md`](../../../.cursor/skills/spec-audit/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `spec-audit` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
