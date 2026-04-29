---
name: safe-file-split
description: "Safely split large files in any part of the codebase without changing behavior. Use when asked to split/aufsplitten/refactor large files with strict anti-regression gates."
argument-hint: "Target file path (e.g., apps/web/src/app/core/upload/upload-manager.service.ts)"
---

# Safe File Splitting

> **Role:** Specialist skill. Produces a structured findings report. Does not create GitHub issues. Returns output to `audit-scope-to-issues` for issue creation.

## Mode

**Standalone** (invoked directly by user):
Run the full audit, then behave like `audit-scope-to-issues`: present findings checkpoint, wait for confirmation, create issues.

**Orchestrated** (invoked by `audit-scope-to-issues`):
Run the audit, return the structured findings report only. Do not create issues. Do not checkpoint with the user.

Detect mode by context: if the user invoked this skill directly, use Standalone. If called as part of an orchestrated audit, use Orchestrated.

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
6. Do not delete documentation comments just to satisfy line-count lint rules.
7. **Mandatory split order (no exceptions):** comment old block first, then copy to new file, then wire delegation and validate, then delete old block.
8. If the mandatory order is not followed, stop immediately and restart that extraction step from baseline.

## Split Method (Mechanical)

1. Baseline

- Run lint for impacted paths.
- Run nearest regression tests for the target area.
- Record key state/phase/event expectations from tests.
- If the target area is a UI panel/component surface, run and record the panel-specific baseline suite before any extraction.

2. Extract by lowest risk first

- Constants/maps/messages
- Pure helper functions (no I/O)
- Internal private helpers
- Only then service/module extraction for orchestration/phase handlers

3. 1:1 move strategy (MANDATORY ORDER)

- First comment out the old block in the original file as a safety marker.
- Then copy the exact block to the new file.
- Then wire delegation from original file to new file.
- Do not alter conditions, return paths, side-effect order, or async sequencing.

4. Verify immediately after each extraction

- Re-run targeted lint.
- Re-run nearest regression tests.
- If any deviation appears, stop and rollback that extraction only.
- For panel/component splits: if baseline is not exactly reproducible (same suite, same pass/fail profile), rollback immediately and continue splitting in a different area.

5. Delete old code only after green validation

- Remove the commented old block only after lint/build/tests are green.
- Re-run validation after deletion.

## Validation Gate per Step

- No new lint errors in impacted paths
- Relevant tests remain green
- No state/event/order changes unless explicitly approved
- For panel/component files: baseline and post-change test sets must match exactly.

### Gate Command Template

Use explicit, reproducible commands per step (adapt paths as needed):

- Lint (targeted): `npx eslint <touched-file-1> <touched-file-2> ...`
- Core upload regression: `npx vitest run src/app/core/upload/upload.service.spec.ts src/app/core/upload/upload-manager.service.spec.ts`

If `rg` is unavailable in the shell, use PowerShell `Get-ChildItem` / Node API fallback and continue with the same lint/test gate commands.

## Stop Conditions

Stop and ask the user before continuing if:

- A split requires branch-logic changes to compile
- Event timing/order changes
- Cancellation/abort behavior differs
- Test expectations must be rewritten for behavior, not structure
- Panel baseline is unstable or non-reproducible for the same test suite

## Output (Report to Orchestrator)

In Orchestrated mode, return findings in this structure — do not create issues:

### Confirmed Findings
| Area/File | Spec | Observation | Suggested priority |
|---|---|---|---|

### Unclear Findings
| Area/File | Suspicion | Evidence | Check needed |
|---|---|---|---|

### Not Examined
| Area/File | Reason |
|---|---|

## Panel Safety Guard (Mandatory)

When splitting files under a UI panel/component area:

1. Freeze a panel baseline first

- Run the exact panel suite you will use for verification.
- Save pass/fail counts and failing test names.

2. Apply one mechanical extraction only

- No co-mingled refactors, no template behavior edits.

3. Re-run the exact same panel suite

- If results differ unexpectedly, rollback immediately.

4. Prefer fallback scope if panel gate is noisy

- If panel suite cannot be made stable quickly, defer panel splitting and continue with core/service files.

---

## Annotated Security Playbook (Anti-Regression Workflow)

### Phase 1: Freeze Old Block In Place (Comment-First)

**Goal:** Mark and preserve old behavior in the source file before any extraction.

**Steps:**

1. Identify the extraction block (function, helper, or tightly scoped method).
2. Comment out the old block in the original file with a migration marker.
3. Keep the old block text unchanged inside the comment (no edits).
4. Do not delete old code in this phase.

**Example:**

```bash
# Before this phase: old file has 900+ lines
# After this phase: old block is commented in-place as safety net
#                    Build: ✅, Lint: ✅
```

### Phase 2: Copy To New File + Wire Delegation

**Goal:** Move execution path to the new file while keeping old commented fallback.

**Steps:**

1. Create the new file and copy exact old block logic.
2. In the old file, add import for new extracted function/service.
3. Replace the old implementation with one-line delegation.
4. Keep commented old implementation as rollback safety.
5. Build and test as validation checkpoint.

**Example (before Phase 2):**

```typescript
// Old file, 900 lines
export class OldComponent {
  /* PHASE 1 SAFETY NET
  private longHelperFunction() {
    // 50 lines of helper logic (ORIGINAL)
  }
  */
}
```

**After Phase 2 (wired):**

```typescript
import { longHelperFunction } from "./new-helper.ts";

export class OldComponent {
  private delegateHelper() {
    return longHelperFunction();
  }

  /* COMMENTED OUT - Safety net (delete only in Phase 3)
	private longHelperFunction() {
		// 50 lines of helper logic (ORIGINAL - DO NOT EDIT)
	}
	*/
}
```

**Validation Checkpoints at end of Phase 2:**

- `npx eslint <old-file> <new-file>` → **No new errors**
- `npm run build` → **Success (new code path used)**
- `npx vitest run <affected-tests>` → **Same pass/fail as baseline**
- **Manual UI test:** Trigger the delegated function in dev/staging → expected behavior exhibited ✅

### Phase 3: Remove Commented Old Code (After Green Gates)

**Goal:** Clean up after all tests pass and behavior is confirmed.

**Steps:**

1. Only if Phase 2 validation is green, remove the commented-out old implementation.
2. Run lint + build again.
3. Re-run tests one final time.

**Result:**

```typescript
import { longHelperFunction } from "./new-helper.ts";

export class OldComponent {
  private delegateHelper() {
    return longHelperFunction();
  }
  // Old code fully removed; new delegation is permanent.
}
```

### Rollback Strategy (If Anything Fails)

**If Phase 1 or 2 validation fails:**

1. Restore the original active old block immediately.
2. Remove delegation line.
3. Remove new import and delete the new file.
4. Rebuild — must match pre-extraction baseline.
5. Choose a different extraction unit or replan the split.

**This workflow ensures:**

- ✅ Zero line-by-line behavior changes during the split.
- ✅ Commented code serves as a safety net until validation passes.
- ✅ Easy rollback if tests fail.
- ✅ Clear audit trail (comments show what moved and when).
- ✅ One logical unit per phase (no co-mingled changes).
