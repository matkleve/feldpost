---
name: safe-file-split
description: "Safely split large files in any part of the codebase without changing behavior. Use when asked to split/aufsplitten/refactor large files with strict anti-regression gates."
argument-hint: "Target file path (e.g., apps/web/src/app/core/upload/upload-manager.service.ts)"
---

# Safe File Splitting

Use this workflow for high-risk file splitting where behavior must remain identical.

## Scope

- Any source file in the repository
- Refactors that reduce file/function size by extraction only
- Not for feature changes

## Non-Negotiable Rules

1. Behavior parity first: no new product logic while splitting.
2. One split unit per step: only one file or one tightly scoped extraction per change.
3. No mixed changes: never combine split work with bug fixes/features.
4. Preserve execution order exactly in orchestrators and pipelines.
5. Keep cancellation/abort/event semantics identical where applicable.

## Split Method (Mechanical)

1. Baseline

- Run lint for impacted paths.
- Run nearest regression tests for the target area.
- Record key state/phase/event expectations from tests.

2. Extract by lowest risk first

- Constants/maps/messages
- Pure helper functions (no I/O)
- Internal private helpers
- Only then service/module extraction for orchestration/phase handlers

3. 1:1 move strategy

- Copy block to new file first.
- Keep old callsite and delegate to extracted function.
- Do not alter conditions, return paths, or side-effect order.

4. Verify immediately after each extraction

- Re-run targeted lint.
- Re-run nearest regression tests.
- If any deviation appears, stop and rollback that extraction only.

## Validation Gate per Step

- No new lint errors in impacted paths
- Relevant tests remain green
- No state/event/order changes unless explicitly approved

## Stop Conditions

Stop and ask the user before continuing if:

- A split requires branch-logic changes to compile
- Event timing/order changes
- Cancellation/abort behavior differs
- Test expectations must be rewritten for behavior, not structure

## Output Contract

After each step, report:

- What moved (from -> to)
- What stayed as delegating wrapper
- Validation commands run
- Whether behavior parity is preserved
