# Feldpost Upload System — 4 Structured Fix Prompts

**Execution Order**: P0-A ✅ → P0-B (this) → P1-B → P1-A

---

## P0-A: Auto-Switch entfernen ✅ DONE

**Status**: COMPLETED 31.03.2026 15:15 CET

```
You are working on the Feldpost Angular codebase.

AUDIT FIRST. Before touching any code, read these files and list every line that calls or references setAutoSwitchCallback():
- apps/web/src/app/features/upload/upload-panel-lifecycle.service.ts
- apps/web/src/app/features/upload/upload-panel-setup.service.ts

Produce a table: | File | Line | Code snippet |

Then delete ONLY those call sites. Do not touch anything else — no refactoring, no renames, no logic changes.

After the edit, confirm: "Auto-switch removed. Lines deleted: X"
```

**Result**:

- ✅ upload-panel-setup.service.ts:51 deleted
- ✅ upload-panel-lifecycle.service.ts:65-66 deleted
- ✅ Confirmed via `get_errors()` — no errors

---

## P0-B: Project Auto-Create ⏳ PENDING

**Status**: READY TO START

```
You are working on the Feldpost Angular codebase.

AUDIT FIRST. Read upload-manager-submit.util.ts lines 90–120. Show me exactly what happens when the "Project: [name]" pattern matches but no project is found (the return undefined path).

Then check: does ProjectsService (or equivalent) already have a createProject() method? List what you find.

Only after the audit: add project auto-creation when no match is found. Follow existing async/await patterns — no RxJS. No other changes.
```

**Execution Plan**:

1. Read `upload-manager-submit.util.ts` lines 90–120
2. Identify the `resolveUploadProjectIdFromFolderName()` function
3. Search for `createProject()` in codebase (ProjectsService, etc.)
4. Implement auto-create logic
5. Confirm: "Project auto-create implemented. Lines changed: X"

---

## P1-B: FolderScan Observable ⏳ PENDING (AFTER P0-B)

**Status**: READY AFTER P0-B

```
You are working on the Feldpost Angular codebase.

AUDIT FIRST. Read folder-scan.service.ts completely. List every place onFileFound callback is used (callers inside and outside the service).

Then refactor the callback to a Subject<FileScanProgress> named scanProgress$. Expose it as a public Observable. Update all callers to subscribe instead of passing a callback.

No logic changes — only the delivery mechanism changes. No new features.
```

**Execution Plan**:

1. Read `folder-scan.service.ts` completely
2. List all `onFileFound` callback usages (callers)
3. Create `FileScanProgress` interface
4. Add `scanProgress$ = new Subject<FileScanProgress>()`
5. Replace callback emissions with `.next()`
6. Update callers to `.subscribe()`
7. Verify: No behavior changes, only Observable pattern
8. Confirm: "FolderScan refactored to Observable. Files changed: X"

---

## P1-A: LocationPathParser ⏳ PENDING (AFTER P1-B)

**Status**: READY AFTER P1-B

```
You are working on the Feldpost Angular codebase.

AUDIT FIRST. Read:
- docs/specs/service/location-path-parser/location-path-parser.md (full spec)
- apps/web/src/app/core/filename-parser.service.ts

Produce a table of all methods the spec requires vs. what exists today.

Then implement LocationPathParserService as a new file in apps/web/src/app/core/. Follow the providedIn: 'root' pattern. Use async/await, no RxJS. Inject it into FilenameParserService where the spec requires delegation.

No template changes. No API surface changes beyond what the spec defines.
```

**Execution Plan**:

1. Read `docs/specs/service/location-path-parser/location-path-parser.md`
2. Read `apps/web/src/app/core/filename-parser.service.ts`
3. Create spec-vs-code table
4. Create `LocationPathParserService` in `apps/web/src/app/core/location-path-parser.service.ts`
5. Implement required methods from spec
6. Inject into FilenameParserService at delegation point
7. No UI changes
8. Confirm: "LocationPathParserService implemented. Lines changed: X"

---

## Timeline Summary

| Fix  | Type                  | Effort  | Status   | Blocker                    |
| ---- | --------------------- | ------- | -------- | -------------------------- |
| P0-A | Auto-Switch Remove    | 1 min   | ✅ DONE  | None                       |
| P0-B | Project Auto-Create   | 20 min  | ⏳ NEXT  | Need ProjectsService check |
| P1-B | FolderScan Observable | 90 min  | ⏳ READY | After P0-B                 |
| P1-A | LocationPathParser    | 3–4 hrs | ⏳ READY | After P1-B                 |

**Total**: ~5 hours (2 P0s = 21 min, 2 P1s = 4 hrs)

---

## Ground Rules for ALL Fixes

1. **AUDIT FIRST** — Always read code before touching it
2. **Produce audit table** — List findings clearly
3. **No scope creep** — Only implement what the prompt says
4. **Verify after** — `get_errors()` + `ng build` after each fix
5. **Confirm completion** — Message with exact changes made
6. **Sequential execution** — Do NOT start next fix until previous passes build

---

**Starting NOW with P0-B: Project Auto-Create**
