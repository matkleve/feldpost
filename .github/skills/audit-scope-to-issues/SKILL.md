---
name: audit-scope-to-issues
description: "Audit a Feldpost folder or file for spec drift, likely bugs, and naming/glossary drift, then create GitHub issues from findings. Use when the user asks to check/audit a path and file issues."
argument-hint: "Path to audit, for example apps/web/src/app/core or apps/web/src/app/features/media/media.component.ts"
---

# Audit Scope To Issues

Audit a requested folder or file and create GitHub issues for confirmed findings.

## Inputs

- Required: one file or folder path.
- If no path is provided, ask for exactly one path before auditing.
- Do not default to the whole repository unless the user explicitly asks for a repo-wide audit.

## Required Context

Before judging code, read:

1. `AGENTS.md`.
2. `docs/specs/README.md`.
3. `docs/glossary.md`.
4. The local `README.md` under the relevant `docs/specs/` area.
5. Relevant specs for the audited code area.

For database/security findings involving overlaps, feasibility, immutability, uniqueness, publication, or history, inspect migrations, constraints, triggers, and RLS before opening an issue.

## Audit Targets

Look only for:

- Spec/code mismatch: behavior, state, boundaries, File Map, FSM, Ownership Triad, i18n, or adapter rules differ from specs.
- Likely bugs/risk: clear logic errors, unsafe assumptions, lost error context, broken edge cases, or missing verification hooks.
- Naming/glossary drift: UI copy, symbols, routes, or identifiers that contradict `docs/glossary.md` or active specs.

Do not open issues for style preferences, speculative optimizations, or vague concerns.

## Comprehensive Scope Rule

Audit the entire requested path, not just the first files or first findings that look actionable.

- For a file audit, inspect the whole file and its relevant spec/code dependencies.
- For a folder audit, enumerate the files and subareas that belong to the requested scope before judging findings.
- Do not stop after creating a few issues. Continue until the requested scope is covered or explicitly report why a file/subarea was not examined.
- Keep GitHub issues limited to clearly supported findings. Comprehensiveness means complete coverage and clear reporting, not creating weak issues.

## Finding Quality Gate

Every GitHub issue must be either:

- Confirmed: cite code path(s), spec path(s), and the observed mismatch/risk.
- Hypothesis: cite the evidence and state the exact runtime/test/database check needed to confirm it.

Do not create GitHub issues for unclear or weakly supported suspicions. Record them in the unclear findings report instead.

Use label `task` for concrete actionable findings.
Use label `idea` for hypotheses, product decisions, or larger refactor proposals.

## Priority Labels

Assign exactly one priority label to every issue:

- `priority:P0`: security boundary failure, data loss/corruption risk, build-blocking failure, or release-blocking database/RLS issue.
- `priority:P1`: user-blocking bug or critical workflow regression.
- `priority:P2`: confirmed bounded bug, spec drift, naming drift, or missing verification hook.
- `priority:P3`: hypothesis, cleanup, product decision, or larger refactor proposal.

Default `task` findings to `priority:P2` unless evidence justifies `P0` or `P1`.
Default `idea` findings to `priority:P3`.

## GitHub Issue Creation

Before creating any issues, run the priority-label preflight once:

```bash
gh label list --search "priority:"
```

Do not create labels automatically. If any priority label is missing, stop and output these commands:

```bash
gh label create "priority:P0" --description "Security, data loss, build-blocking, or release-blocking issue"
gh label create "priority:P1" --description "User-blocking bug or critical workflow regression"
gh label create "priority:P2" --description "Confirmed bounded bug, spec drift, or missing verification hook"
gh label create "priority:P3" --description "Hypothesis, cleanup, product decision, or larger refactor"
```

Before creating each planned issue, check for duplicates:

```bash
gh issue list --state open --search "<title keywords>"
```

If an existing issue already covers the finding, do not create a duplicate. Report the existing issue in the output table instead.

Create one issue per distinct finding from the repo root:

```bash
gh issue create --label task --label priority:P2 --title "spec drift: concise title" --body "..."
```

If `gh` is unavailable or authentication fails, stop and output the exact `gh issue create` commands the user should run. Do not silently skip issue creation.

## Issue Body Template

Use this structure for `task` findings:

```markdown
**Spec:** docs/specs/... or n/a
**Code area:** apps/web/src/app/... or supabase/...
**Invariant:** RLS / i18n / FSM / Ownership Triad / Adapter boundary / n/a
**Priority:** priority:Px

**Evidence:**
- Spec: ...
- Code: ...
- Behavior/risk: ...

**Acceptance:**
- [ ] ...

**Verification:** ng build / targeted test / migration check / n/a
**PR:** n/a
```

For `idea` findings, keep the body short but include evidence and the question/product decision.

## Unclear Findings Report

After creating safe issues, report unclear findings separately. Use this for suspicious evidence that should not become an issue yet:

- Possible spec/code differences where the intended behavior is ambiguous.
- Discrepancies between specs, README files, glossary terms, or workflow docs.
- Naming/glossary drift that may be intentional but needs confirmation.
- Risky-looking code paths that need a runtime, test, or database check before an issue is justified.

For each unclear finding, state the exact check or decision needed to promote it to an issue.
Write unclear findings before the created-issues summary table, not after.

## Coverage Ledger

For folder audits, keep an audit ledger while working:

| Area/File | Examined? | Specs checked | Notes |
| --- | --- | --- | --- |

Use the ledger to avoid stopping after the first few findings. Do not create low-quality issues to fill a quota; instead, report unexamined files and the reason they were skipped.

## Output To Chat

After creating safe issues, report unclear findings first:

| Area | Suspicion | Evidence | Check needed |
| --- | --- | --- | --- |

Then report created or reused issues:

| ID | Priority | Type | Summary | GitHub |
| --- | --- | --- | --- | --- |

Then list anything not examined and include the coverage ledger.

## Constraints

- Do not edit implementation code.
- Do not bulk-rename.
- Do not create labels, milestones, or projects.
- Do not close issues in this workflow.
