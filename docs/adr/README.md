# Architecture Decision Records

An ADR answers **"why is it this way, and what did we reject?"** — the question that
otherwise gets re-litigated every few months by someone who found the current arrangement
surprising and had no way to discover the reasoning.

Before this folder existed, Feldpost's hard, expensive-to-reverse decisions were recorded in
whatever file happened to be open at the time —
[`registry-format-decision.md`](../design/design-system/registry-format-decision.md),
[`decisions-log.md`](../migration/decisions-log.md),
[`agent-token-decision-closure.md`](../migration/reports/agent-token-decision-closure.md).
None was findable from a decision-shaped question, and none recorded the *rejected*
alternative, which is the part that stops a decision being quietly reversed.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](./0001-spec-folder-taxonomy.md) | `docs/specs/` is organised by contract kind (`ui` · `component` · `service` · `system` · `page`), not by feature | accepted |
| [0002](./0002-registry-format-json-as-source.md) | JSON is the source for the design-system registry; prose is generated or secondary | accepted (component registry not yet migrated) |
| [0003](./0003-rls-is-the-security-boundary.md) | Row-Level Security is *the* security boundary; the frontend is untrusted | accepted |
| [0004](./0004-tailwind-and-scss-coexist.md) | Tailwind utilities and component SCSS coexist; one owner per visual concern | accepted |
| [0005](./0005-docs-specs-over-docs-element-specs.md) | Contracts live in `docs/specs/`; a legacy `element-specs` path is a rename | accepted |
| [0006](./0006-one-instruction-file.md) | `AGENTS.md` is the only instruction file; tool-specific files are pointers | accepted |
| [0007](./0007-phase-transition-map-does-not-veto-the-pipeline.md) | The upload phase transition map asserts; only terminality vetoes | accepted |

Template: [`0000-template.md`](./0000-template.md).

## Never edit history

**A superseded ADR stays exactly where it is.** When a decision is replaced:

1. Write a **new** ADR with the next free number. It states what it replaces and why the old
   reasoning no longer holds.
2. On the **old** file, change `Status` to `superseded by ADR-NNNN` and fill in its
   `## Superseded by` section with a link. Change nothing else — not the context, not the
   rejected alternatives, not a claim that turned out wrong.
3. Update this index: the old row keeps its number, and its status becomes a link to the
   replacement.

An ADR is never deleted and never edited into agreement with the present. The old reasoning
is the whole point: it is how the next reader learns that this option was already tried, and
under what conditions it stopped working. An ADR quietly rewritten is indistinguishable from
one that was always right, which is how the same alternative gets proposed a third time.

Corrections of *fact* (a broken link, a wrong path, a typo) are fine. Corrections of
*judgement* are a new ADR.

## Writing one

1. Take the next free number — they are sequential and never reused.
2. Copy [`0000-template.md`](./0000-template.md) to `NNNN-slug.md`.
3. Fill in **Alternatives considered** first. If nothing was rejected, no decision was made
   and you are writing documentation, not an ADR — put it in a spec.
4. Name the **gate** that enforces the decision, or write *none* explicitly. A decision with
   no gate and no admission that it has none becomes folklore.
5. Add a row to the index above.

## What is not an ADR

| Document | Goes to | Because |
| --- | --- | --- |
| What a component or service **must do** | [`docs/specs/`](../specs/README.md) | a contract, not a choice between options |
| An analysis or proposal, with evidence grades | [`docs/study/`](../study/README.md) | reasoning that nobody has accepted yet; a study is `[D]` until an owner signs it off |
| What happened in a work session | [`docs/ai-diary/`](../ai-diary/) | narrative, dated, append-only |
| How the code misleads a reader | [`docs/TRAPS.md`](../TRAPS.md) | a recurring trap, not a decision |
| A non-negotiable that outranks everything | [`docs/CONSTITUTION.md`](../CONSTITUTION.md) | an ADR can be superseded; a constitutional clause is amended by a pull request that changes only that file |

A study that gets accepted often produces an ADR: the study keeps the evidence and the
alternatives in full, the ADR states the decision in a form you can act on in thirty seconds.
Link them to each other when that happens.
