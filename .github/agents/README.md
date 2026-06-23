# Feldpost agent roster

GitHub/Cursor agent personas for the spec → plan → build → verify pipeline.

| Agent | Role | File |
| --- | --- | --- |
| **Lex** | Spec writer | [`lex-the-spec-writer.agent.md`](lex-the-spec-writer.agent.md) |
| **Nav** | Planner | [`nav-the-planner.agent.md`](nav-the-planner.agent.md) |
| **Brix** | Implementer | [`brix-the-implementer.agent.md`](brix-the-implementer.agent.md) |
| **Val** | Spec checker | [`val-the-checker.agent.md`](val-the-checker.agent.md) |
| **Revy** | Reviewer | [`revy-the-reviewer.agent.md`](revy-the-reviewer.agent.md) |

Repository-wide engineering rules: [`../../AGENTS.md`](../../AGENTS.md). Angular app rules: [`../../apps/web/AGENTS.md`](../../apps/web/AGENTS.md).

## Component styling gate (hard — all agents)

**Do not change existing component visual styling without explicit user approval in the current task.**

This includes:

- Component SCSS (geometry, color, border, shadow, opacity, animation)
- Replacing `hlmBtn` / Spartan directives with plain buttons (or the reverse) for visual reasons
- Custom `width`, `height`, `min-height`, `padding`, or `border-radius` on controls that already have a design-system size variant
- Token or theme overrides on shared components (`app-calendar-dropdown`, map toolbar triggers, etc.)

**Allowed without ask:** behavior-only changes (event handlers, FSM, data wiring) that do not alter computed styles; bug fixes explicitly requested by the user; changes the user described in the same message (e.g. “make the histogram shorter”).

**Required when visuals are in scope:** state the intended visual diff in one sentence and wait for confirmation — or implement only the non-visual part and flag `⚠ SPEC GAP: visual change needs product owner approval`.

Lex MUST NOT pin custom pixel/`rem` geometry in specs when a registered `hlmBtn` size or existing shell token applies, unless the user confirmed that visual decision.

Brix MUST NOT “fix” height or color mismatches by inventing custom CSS — ask first or hand to Lex for a spec gap.
