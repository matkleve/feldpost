# ADR-0006 — `AGENTS.md` is the only instruction file; tool-specific files are pointers

- **Status:** accepted
- **Date:** 2026-09-10
- **Deciders:** repository owner
- **Applies to:** `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/*.mdc`, and any future harness file

## Context

Several agent harnesses read this repository — Claude Code, Copilot, Cursor — and each has a
conventional filename it looks for. The tempting arrangement is one instruction file per tool.
This repository has already measured what that costs: eleven skills existed in two copies
(`.github/skills/` and `.cursor/skills/`), nine byte-identical and **two already drifted**, so
a Copilot session was running an older contract than a Cursor session with nothing reporting
it. `.github/copilot-instructions.md` restated a large part of `AGENTS.md` in its own words,
which is the same failure in a different file: two texts that must agree, and no mechanism
that makes them.

Duplicated rules do not stay duplicated. They become *different* rules that look the same,
and the difference is discovered by a reader following the wrong one.

## Decision

**One instruction file: `AGENTS.md` at the repository root.** Tool-specific files are
pointers. A pointer file may contain: where the rules are, the one or two things genuinely
specific to that harness (a hook path, a permission list), and a sentence forbidding project
rules from being added to it. It may **not** restate a rule, even accurately.

`.cursor/rules/*.mdc` are the documented exception, and they are not duplicates: they are
normative *extensions* with a stated precedence (`AGENTS.md` item 3), each owning a subject
`AGENTS.md` only indexes. A rule lives in exactly one of the two, never both.

## Alternatives considered

### One instruction file per tool, kept in sync by review

Rejected on measured evidence: it was tried with the skills tree and drifted within one
migration phase, undetected. "Kept in sync by review" is a promise no reviewer can keep across
two files nobody diffs against each other.

### A generator that renders each tool's file from a single source

Rejected as machinery for a problem a pointer solves. It also produces files that *look*
authoritative, so the next person edits the rendered copy.

### No pointer files at all (let each harness fall back to `AGENTS.md`)

Rejected because the fallback works today but leaves the convention undocumented — and the
next person who wants a harness-specific rule will start a second instruction file rather
than discover why there is only one. The pointer's real payload is the sentence that says
*don't put rules here*.

## Consequences

- **Good:** one file to change; no cross-tool drift; precedence is answerable without
  comparing documents.
- **Cost:** `AGENTS.md` must stay short enough to actually be read — it is capped at 150 lines
  and the cap is enforced (`agents-md-max-lines` in `scripts/lint-specs.mjs`). Detail that
  does not fit moves to a named document and stays normative there; § Document Authority is
  the map. The cap and this ADR are two halves of one decision.
- **Cost:** genuinely tool-specific configuration has to be recognised as such and kept
  minimal, which is a judgement call each time.
- **Gate:** `scripts/check-skills-source.mjs` fails when two skill trees diverge; the
  `AGENTS.md` line cap is checked by `scripts/lint-specs.mjs`. Nothing yet checks that a
  pointer file has not grown rules — that remains a review obligation.

## Evidence

- `AGENTS.md` § Instruction precedence item 7: tool overlays are "pointers and shortcuts
  only… There is **one** instruction file; tool-specific files must not carry project rules."
  `[A]`
- Skill duplication and the two drifted pairs:
  [`docs/audits/2026-09-08-grundriss-adoption.md`](../audits/2026-09-08-grundriss-adoption.md)
  § E3 `[A]`; gate added 2026-09-10 (`scripts/check-skills-source.mjs`).
- The root `CLAUDE.md` pointer lands with this decision (audit item E5).

## Superseded by

*none*
