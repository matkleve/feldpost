---
name: issue-triage-next
description: "Triage Feldpost GitHub issues and recommend the single best next issue to solve now. Use when the user asks which issue to do next, asks for the top issue, wants issue prioritization, or wants a why/how plan before implementation."
---

<!-- canonical: .cursor/skills/issue-triage-next/SKILL.md -->

# issue-triage-next — pointer, not a skill

The instructions for this skill live in exactly one place:

**[`.cursor/skills/issue-triage-next/SKILL.md`](../../../.cursor/skills/issue-triage-next/SKILL.md)**

Read that file and follow it. This file deliberately carries no rules of its
own — it exists so that a harness which discovers skills under `.github/skills/`
still finds `issue-triage-next` by name and gets sent to the single source.

Do not copy the instructions back into this file. `node scripts/check-skills-source.mjs`
fails if a mirrored skill grows content of its own, because two copies of a rule
drift and then nobody can tell which one is current — which is exactly what had
already happened to `component-structure` and `implement-from-spec`.
