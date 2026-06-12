---
name: verify-issues
description: "Verify Feldpost GitHub issues against code, specs, and acceptance criteria, then close only issues that are proven complete. Use when asked to check open issues, mark done, close completed issues, or audit issue status."
argument-hint: "Issue number(s), label, or query, for example #9, label:task, or all open task issues"
---

# Verify Issues

Check GitHub issues against repository evidence and close only items that are proven complete.

## Inputs

Accept one of:

- Specific issue numbers, for example `#9 #10`.
- A label/query, for example `label:task`.
- "All open task issues".

If the target set is unclear, ask before running issue operations.

## Required Commands

Use GitHub CLI from the repository root:

```bash
gh issue list
gh issue view <number>
gh issue comment <number> --body "..."
gh issue close <number> --comment "..."
```

If `gh` is unavailable or authentication fails, stop and report the failure. Do not guess issue state.

## Verification Protocol

For each candidate issue:

1. Read the issue title, labels, body, comments, linked PRs, and acceptance criteria.
2. Identify relevant specs, code paths, tests, migrations, or docs from the issue body.
3. Inspect repository evidence before deciding status.
4. Run relevant verification commands only when they are scoped to the issue and safe.
5. Check metadata:
   - Actionable `task` issues must have exactly one priority label: `priority:P0`, `priority:P1`, `priority:P2`, or `priority:P3`.
   - `idea` issues should have `priority:P3` unless the issue body explains a higher priority.
   - Missing or multiple priority labels make the issue metadata unverifiable; do not treat this as proof that implementation acceptance failed.
6. Decide:
   - Complete: all acceptance criteria are satisfied with evidence.
   - Incomplete: at least one acceptance criterion is missing or failing.
   - Unverifiable: the issue lacks enough acceptance criteria or evidence to check.
   - Metadata unverifiable: acceptance may be checkable, but the priority label contract is missing or ambiguous.

## Closing Rules

Close an issue only when all acceptance criteria are verifiably complete.

When closing, add a comment with:

- Evidence checked.
- Verification command(s) and result, or `n/a` with reason.
- Any residual risk.

If incomplete, leave it open and comment with the remaining blocker(s).

If unverifiable, leave it open and comment asking for clearer acceptance criteria.

If metadata is unverifiable, leave it open and comment with the exact priority-label fix needed. Do not create labels automatically.

## Output To Chat

Report:

| Issue | Priority | Decision | Evidence | Action |
| --- | --- | --- | --- | --- |

Include URLs for closed or commented issues.

## Constraints

- Do not edit application code unless the user explicitly asks for a fix pass.
- Do not close `idea` issues unless the issue itself says it is resolved or the user explicitly asks.
- Do not create new labels, milestones, or projects.
- Do not close issues based only on branch names, commit messages, or PR titles; verify the repository state.
