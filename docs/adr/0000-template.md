# ADR-0000 — Title in the imperative ("Use X for Y")

- **Status:** proposed | accepted | superseded by ADR-NNNN (link it)
- **Date:** YYYY-MM-DD (the date the decision was *made*, not the date it was written down)
- **Deciders:** who could overrule this
- **Applies to:** the paths, folders, or subsystems this binds

## Context

What forced a choice. State the constraint, not the preference: what was true about the
repository, the product, or the data that made "just pick one later" unaffordable.

## Decision

One paragraph, present tense, imperative. A reader must be able to act on this without
reading anything below.

## Alternatives considered

The part that stops the decision being quietly reversed. One subsection per rejected
option, each answering **why not** — not "it was worse" but the concrete cost.

### Alternative A — <name>

Rejected because …

### Alternative B — <name>

Rejected because …

## Consequences

What this costs. Include the parts that are annoying, because an ADR that lists only
benefits reads as advocacy and gets re-litigated by the first person it inconveniences.

- **Good:** …
- **Cost:** …
- **Gate:** the check that enforces this, or *none* — say so explicitly.

## Evidence

Where the decision is visible in the repository today: file paths, commits, script names.
An ADR whose claims cannot be re-checked is a story. Grade claims that were measured rather
than observed, using the vocabulary in [`docs/study/STUDY-FORMAT.md`](../study/STUDY-FORMAT.md).

## Superseded by

*none* — or a link to the ADR that replaced this one, added **on this file** when the
replacement lands. This file is never edited into agreement with the new decision and is
never deleted; see [`README.md`](./README.md) § Never edit history.
