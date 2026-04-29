---
name: issue-triage-next
description: "Triage Feldpost GitHub issues and recommend the single best next issue to solve now. Use when the user asks which issue to do next, asks for the top issue, wants issue prioritization, or wants a why/how plan before implementation."
argument-hint: "Optional issue scope, label, milestone, or area"
---

# Issue Triage Next

Pick the best next GitHub issue to implement now, explain why, and outline the smallest safe solution path.

## Role

Read-only triage and implementation planning. Do not edit code, close issues, or create issues in this workflow.

## Required Inputs

- Optional: issue number(s), label, area, milestone, or natural-language scope.
- If no scope is provided, triage all open issues.

## Required Context

Before ranking, gather:

1. Open issues:
   ```bash
   gh issue list --state open --limit 200 --json number,title,labels,body,url,assignees,milestone,updatedAt
   ```
2. Current repo state:
   ```bash
   git status --short
   ```
3. Recent local context if needed:
   - Read only files/specs directly relevant to the top candidates.
   - If the candidate involves RLS, publication, uniqueness, immutability, feasibility, or history, inspect migrations/RLS/triggers before recommending it.

If `gh` is unavailable or unauthenticated, stop and report the exact `gh issue list` command the user should run.

## Ranking Rules

Rank issues by practical next-action value, not label alone:

1. Priority label: `priority:P0` > `priority:P1` > `priority:P2` > `priority:P3`.
2. Blocker status: security/data/RLS semantics and build blockers outrank cleanup.
3. Verification clarity: prefer issues with concrete acceptance and obvious test/build checks.
4. Blast radius: prefer smaller, isolated work unless a higher-priority invariant blocks other work.
5. Dependency order: choose prerequisite issues before dependent refactors.
6. Dirty tree risk: avoid issues likely to collide with unrelated current changes.
7. Context warmth: prefer issues in the area the session has already investigated when priority is otherwise comparable.

Do not recommend an `idea` issue as top work unless no actionable `task` issues are available or the user explicitly asks for decisions/product planning.

## Output Format

Return exactly one top recommendation and up to two backups:

```markdown
## Top Issue To Solve Now

#<number> — <title>
GitHub: <url>

Why now:
- <priority/blocker/dependency reason>
- <verification or scope reason>

Invariant touched:
- <RLS / service symmetry / glossary / i18n / FSM / adapter boundary / n/a>

How the solution would look:
- <smallest safe implementation step>
- <next step>
- <final alignment step>

Files/specs to inspect first:
- `<path>`
- `<path>`

Verification:
- `<command or targeted check>`

Work shape:
- Solo issue / batchable with #<number> / split first

## Backups

- #<number> — <title>: <one-line why it is next-best>
- #<number> — <title>: <one-line why it is next-best>
```

Keep the answer concise. Do not produce a full implementation unless the user asks to proceed.
