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
6. Do not delete documentation comments just to satisfy line-count lint rules.

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

3. 1:1 move strategy

- Copy block to new file first.
- Keep old callsite and delegate to extracted function.
- Do not alter conditions, return paths, or side-effect order.

4. Verify immediately after each extraction

- Re-run targeted lint.
- Re-run nearest regression tests.
- If any deviation appears, stop and rollback that extraction only.
- For panel/component splits: if baseline is not exactly reproducible (same suite, same pass/fail profile), rollback immediately and continue splitting in a different area.

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

## Output Contract

After each step, report:

- What moved (from -> to)
- What stayed as delegating wrapper
- Validation commands run
- Whether behavior parity is preserved

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

### Phase 1: Prepare New File (Exact Copy)

**Goal:** Create the new file with **identical code** before removing anything from the old file.

**Steps:**

1. Identify the extraction block (function, helper, or tightly scoped method).
2. Create new file with copy of the block + required imports.
3. Format and validate new file syntax (build/lint should pass for new file in isolation).
4. **Do NOT yet delete** or modify the old file.

**Example:**

```bash
# Before this phase: old file has 900+ lines
# After this phase: old file unchanged (900+ lines), new file created with 200 lines (copy)
#                    Build: ✅, Lint: ✅ (both files)
```

### Phase 2: Add Delegation + Integration (Comment Out, Don't Delete)

**Goal:** Point the old file to the new file without removing old code yet.

**Steps:**

1. In the old file, add the import for the new extracted function/service.
2. Replace the old implementation **with a call** to the extracted version (one-line delegation).
3. **Comment out the old implementation** (do NOT delete it yet).
4. Build and test — this is your **validation checkpoint**.

**Example (before Phase 2):**

```typescript
// Old file, 900 lines
export class OldComponent {
  private longHelperFunction() {
    // 50 lines of helper logic
  }
}
```

**After Phase 2:**

```typescript
import { longHelperFunction } from "./new-helper.ts";

export class OldComponent {
  private delegateHelper() {
    return longHelperFunction();
  }

  /* COMMENTED OUT - Phase 2 safety net (can be deleted in Phase 3)
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

### Phase 3: Remove Commented Code (After All Validations Pass)

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

**If Phase 2 validation fails:**

1. Uncomment the old code (it's still there).
2. Remove the delegation line.
3. Delete the import and the new file.
4. Rebuild — should be back to pre-Phase-2 state.
5. Choose a different extraction unit or replan the split.

**This workflow ensures:**

- ✅ Zero line-by-line behavior changes during the split.
- ✅ Commented code serves as a safety net until validation passes.
- ✅ Easy rollback if tests fail.
- ✅ Clear audit trail (comments show what moved and when).
- ✅ One logical unit per phase (no co-mingled changes).
