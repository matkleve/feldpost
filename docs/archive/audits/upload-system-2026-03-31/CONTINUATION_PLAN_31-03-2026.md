# Feldpost Upload System — Fortschrittplan (31.03.2026)

**Status**: P0-Auto-Switch Violation entfernt. Codebase ready für P0-Fixes.  
**Audit Coverage**: 85% spec compliance documented in [UPLOAD_SYSTEM_AUDIT_SUMMARY.md](UPLOAD_SYSTEM_AUDIT_SUMMARY.md)

---

## Phase 1: P0-Violations Beheben (2–3 Stunden total)

### 1.1 Auto-Switch Removal ✅ DONE

- **Status**: COMPLETED
- **What**: Removed `setAutoSwitchCallback()` registration + execution
- **Files Modified**:
  - `upload-panel-setup.service.ts`: Line 51 deleted
  - `upload-panel-lifecycle.service.ts`: Lines 65-66 deleted
- **Verification**: `get_errors()` passed; no compilation errors
- **Remaining**: Could orphan unused `setAutoSwitchCallback()` method definition (line 45-51 in lifecycle.service) — safe to leave for now, or remove if no other callers found

### 1.2 Project Auto-Create Implementation ⏳ PENDING

- **Status**: TODO
- **File**: `apps/web/src/app/core/upload/upload-manager-submit.util.ts` (line ~110)
- **Function**: `resolveUploadProjectIdFromFolderName()`
- **Current Behavior**:

  ```typescript
  // Line 103: Lookup existing project (case-insensitive)
  const match = projects.find(
    (p) => p.name.toLowerCase() === projectNameHint.toLowerCase(),
  );

  // Line 110: Return undefined if no match (❌ GAP)
  return match?.id ?? undefined;
  ```

- **Required Change**:
  1. Check if `match` exists; if NOT, call `deps.createProject(projectNameHint)`
  2. Handle async operation (need Promise<string> return)
  3. Error handling: fallback if creation fails
  4. Return new project.id
- **Estimated Effort**: 15–30 minutes
- **Dependencies**:
  - `UploadManagerSubmitDeps` interface must have: `createProject: (name: string) => Promise<Project>`
  - `ProjectsService` must support project creation (verify in codebase)
- **Testing**:
  - Manual: Upload folder named "Project: TestProject" → should create automatically
  - Unit: Mock `deps.createProject()` in tests
- **Blocking**: If createProject() doesn't exist in ProjectsService, implement it first

### 1.3 Verification & Sign-Off

- [ ] Manual test: Upload folder "Project: NewProject123" → auto-creates project
- [ ] Run `ng build` successfully
- [ ] Run `ng test` — all upload-related tests pass
- [ ] No console errors in dev tools

---

## Phase 2: P1-Gaps Research & Planning (2–3 hours reading + design)

### 2.1 LocationPathParser Implementation (P1 — High Impact)

- **Status**: UNIMPLEMENTED (0 matches in codebase)
- **Spec Reference**: `docs/specs/service/location-path-parser/location-path-parser.md` (50+ lines)
- **Purpose**: Parse address string into components (city, zip, street) + validate against city registry
- **Current State**: FilenameParserService extracts raw address string; no component parsing
- **What Needs to Happen**:
  1. **Read spec**: `docs/specs/service/location-path-parser/location-path-parser.md`
  2. **Design API**:
     -createService: `LocationPathParserService`
     - `parseAddressComponent(address: string): Promise<ParsedAddress>` (interfaces: city, zip, street, confidence)
     - `validateCity(cityName: string): Promise<CityMatch>`
     - `disambiguateMatches(candidates: Address[]): Address` (fuzzy match logic)
  3. **Integration Point**: `FilenameParserService.extractAddress()` should delegate
  4. **City Registry**: Source of truth — likely from Supabase or static data
  5. **Error Handling**: Graceful fallback if parsing fails
- **Estimated Effort**: 3–4 hours (design, implementation, unit tests)
- **Blocks**: Better error messaging for invalid addresses; improved confidence scoring
- **Priority**: Medium (affects UX for address validation)

### 2.2 FolderScanService Observable Refactor (P1 — Architectural)

- **Status**: PARTIAL — Uses callback instead of Observable
- **Spec Reference**: `docs/specs/service/folder-scan/folder-scan.md` § Entry Points
- **Current Pattern**:
  ```typescript
  walkDirectory(onFileFound?: (file: File, count: number) => void)
  ```
- **Required Pattern**:
  ```typescript
  scanProgress$ = new Subject<FileScanProgress>();
  // where FileScanProgress = { loadedCount: number, currentFile?: string }
  ```
- **Caller Update**: `upload-manager-submit.util.ts` line ~60 changes from callback to `.subscribe(scanProgress$)`
- **Estimated Effort**: 1–2 hours (minimal; existing tests remain valid)
- **Blocks**: Cleaner Observable composition in feature services
- **Priority**: Medium (architectural consistency with event-driven model)

### 2.3 Ordering Recommendation

1. **Parallel**: Read both specs (LocationPathParser + FolderScan)
2. **Sequential**: Implement FolderScan first (1–2 hours, lower risk)
3. **Then**: Design LocationPathParser (3–4 hours, higher complexity)

---

## Phase 3: Code Quality Improvements (1–2 hours)

### 3.1 Remove Orphaned Auto-Switch Methods

- **File**: `upload-panel-lifecycle.service.ts`
- **Lines to Remove**:
  - Line 35: `private autoSwitchCallback?: () => void;` (property)
  - Lines 45–51: `setAutoSwitchCallback(cb: () => void): void { ... }` (method)
- **Verification**: grep for any remaining callers
- **Effort**: 5 minutes (if no other callers found)
- **Timing**: After Phase 1.2 passes (to ensure no other code re-adds the registration)

### 3.2 i18n Audit

- **Check**: Do any new comments or error messages need i18n keys?
- **If Yes**: Add to `docs/i18n/translation-workbench.csv` + regenerate SQL
- **Effort**: 15 minutes (if needed)

### 3.3 Comments Review

- **Scope**: Verify all 36+ documented files have correct, non-intrusive comments
- **Check**: No comments between imports; no formatting errors
- **Effort**: 20 minutes

---

## Phase 4: Testing & Deployment (3–4 hours)

### 4.1 Unit Tests (Priority 1)

- [ ] `upload-manager-submit.util.ts`: Test `resolveUploadProjectIdFromFolderName()` with and without existing project
- [ ] `upload-new-prepare-route.util.ts`: Confidence gating (high-only to upload)
- [ ] `upload-panel-lifecycle.service.ts`: Removed auto-switch callback — verify lane stays stable
- [ ] `upload-panel-item.component.ts`: Action visibility gating

### 4.2 Integration Tests (Priority 2)

- [ ] Full new-upload pipeline: file → conflict → upload → save → enrichment
- [ ] Folder import with "Project: NewProject" pattern → auto-create + assign
- [ ] Lane stability: error occurs, lane selector doesn't change (verify fix)
- [ ] Conflict resolution: duplicate modal → choose resolution → correct action

### 4.3 E2E Tests (Priority 3)

- [ ] Drag-drop file → upload → complete → download matches original
- [ ] Error handling: upload fails → retry from issues lane → succeeds
- [ ] Duplicate photo → resolution modal → correct action taken
- [ ] Folder import with project pattern → auto-creates project

### 4.4 Build Verification

- [ ] `ng build` passes (no errors, no warnings)
- [ ] `ng test` — all tests pass (both existing + new P0 tests)
- [ ] `npm run design-system:check` passes (if design-system.md affected)

### 4.5 Manual Smoke Test

1. Upload single file → should complete without lane-jumping on error
2. Upload folder "Project: TestProject" → should create project if missing
3. Delete file with mistake correction → no crashes
4. Long file list (50+ items) → scroll works, performance OK

---

## Phase 5: Documentation & Sign-Off (30 minutes)

### 5.1 Update UPLOAD_SYSTEM_AUDIT_SUMMARY.md

- [ ] Mark P0-Auto-Switch as **✅ FIXED**
- [ ] Update P0-Project-Auto-Create status: **✅ FIXED** or **⏳ IN PROGRESS**
- [ ] Note: "P0 violations addressed; ready for production. P1 improvements scheduled for sprint N+1."

### 5.2 Commit Messages (Conventional Commits)

```bash
# P0 Fix 1
git commit -m "fix(upload): remove auto-switch lane on error (spec violation)

BREAKING CHANGE: Lane selector now requires explicit user selection on error.
Users must manually click 'issues' lane to see error messages.

Fixes: UPLOAD_SYSTEM_AUDIT_SUMMARY.md P0-Violations, Action 8g
- Removed setAutoSwitchCallback() registration in upload-panel-setup.service.ts
- Removed callback execution in upload-panel-lifecycle.service.ts
- Lane now remains stable after error; user retains control

Tests: upload-panel-lifecycle, upload-panel-setup
"

# P0 Fix 2
git commit -m "feat(upload): implement project auto-create from folder pattern

Implements spec requirement: 'creates project if missing, otherwise assign to existing project'

- Added project creation in resolveUploadProjectIdFromFolderName()
- Falls back if creation fails; user can assign manually
- Supports pattern: 'Project: [name]' in folder name

Fixes: UPLOAD_SYSTEM_AUDIT_SUMMARY.md P0-Violations, Action 2a
Tests: upload-manager-submit, folder-import integration tests
"
```

### 5.3 PR Checklist

- [ ] All P0 violations fixed
- [ ] Tests pass (ng test, ng build)
- [ ] No console errors / TypeScript errors
- [ ] Specs updated if behavior changed
- [ ] i18n keys added (if needed)
- [ ] Docs updated (if applicable)

---

## Timeline & Dependencies

```
Phase 1 (P0 Fixes)
├─ 1.1: Auto-Switch Removal ✅ DONE (1 min)
└─ 1.2: Project Auto-Create (20 min)
    └─ Dependency: ProjectsService.createProject() exists? (5 min research)

Phase 2 (P1 Planning & Research)
├─ 2.1: Read LocationPathParser spec (15 min)
├─ 2.2: Read FolderScan spec (10 min)
└─ 2.3: Design & estimate both (30 min)

Phase 3 (Quality Cleanup)
├─ 3.1: Remove orphaned auto-switch code (5 min)
└─ 3.2 & 3.3: Comments + i18n audit (35 min)

Phase 4 (Testing & Build)
├─ 4.1: Unit tests for P0 fixes (45 min)
├─ 4.2: Integration tests (60 min)
├─ 4.3: E2E spot checks (30 min)
└─ 4.4: Build verification (15 min)

Phase 5 (Documentation & Merge)
└─ Commit, PR, sign-off (30 min)

Total: ~3.5–4 hours for P0 completion
+ 4–6 hours for P1 (next sprint)
```

---

## Success Criteria

### P0 Fixes Complete When:

- ✅ `upload-panel-setup.service.ts:51` auto-switch call removed
- ✅ `upload-panel-lifecycle.service.ts:65-66` callback execution removed
- ✅ Project auto-create implemented + tested
- ✅ `ng build` passes with no errors
- ✅ Unit tests for both fixes pass
- ✅ Manual smoke test confirms lane stability on error
- ✅ Manual smoke test confirms project auto-create works

### Ready for Deployment When:

- ✅ All P0 tests pass
- ✅ No P0 violations remain
- ✅ Spec compliance audit shows ≥ 90%
- ✅ PR approved + merged to main

---

## Next Immediate Action

**Step 1** (5 min): Check if `ProjectsService.createProject()` exists

- File: `apps/web/src/app/core/projects/`
- If found: Proceed to implement P0 project auto-create
- If not found: Create stub or update interface plan

**Step 2** (20 min): Implement project auto-create in submit.util.ts

**Step 3** (10 min): Manual test + verification

**Step 4** (30 min): Commit + document

Then: Schedule P1 improvements for sprint planning.

---

**Document prepared**: 31.03.2026 15:30 CET  
**Prepared by**: GitHub Copilot (quality-improved)  
**Last audit**: [UPLOAD_SYSTEM_AUDIT_SUMMARY.md](UPLOAD_SYSTEM_AUDIT_SUMMARY.md)
