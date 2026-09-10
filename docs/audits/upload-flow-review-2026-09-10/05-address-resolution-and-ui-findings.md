# 05 — Address resolution and panel/tray findings

**Measured:** 2026-09-10 against HEAD, static reading. Continues the `NF-` numbering from [`02-new-issues.md`](02-new-issues.md) so there is one findings namespace for this review.

Two areas the 2026-09-08 audit named but left unverified: the **Branch C city tray and the address-resolution orchestrator** (its § 4 item #1), and the **panel/tray UI** beyond the four issues it already recorded. Path shorthand: `core/…` = `apps/web/src/app/core/…`, `features/…` = `apps/web/src/app/features/…`.

---

## 1. Which location path actually runs

Worth stating first, because it changes how to read everything below: there are **two live location paths**, and the sophisticated one is not the common one.

| Path | Gate | What runs |
| --- | --- | --- |
| **Search Object / orchestrator** | `highConfidence && job.groupingKey` | Orchestrator cache → group geocode → trays → `finalizePlacementForJob` |
| **Legacy free-text** | everything else | `resolveJobTitleAddress` (Nominatim `search`), or EXIF-only, or `missing_data` |

The orchestrator path needs a parseable address structure in the folder or filename. A plain camera file (`IMG_1234.jpg`) dropped without an address-bearing folder takes the **legacy** path. So does a job that *has* a `groupingKey` but `highConfidence: false` — that third case bypasses group geocoding entirely and is the least documented of the three.

`classifyBatch` itself is not optional: it runs on every submit before the queue drains (`core/upload/manager/upload-manager-facade-deps.util.ts:110-114`).

Precedence inside `classifyBatch` is strictly ordered: admin-level conflicts → layer-package conflicts → meaningless-SO filter → branch completeness gate → DB dedup lookup → defer geocode to the pre-resolve wave. Jobs stopped at the first two steps get a `groupingKey` but **skip leaf processing**, which is what lets the tray ask before any Photon call.

---

## 2. Findings

| ID | Sev | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| **NF-17** | high | tray / spec | **"Ask later" does nothing but close the menu.** The spec requires it to call `isolateJobFromGroup` — pull the job out of the group and keep the tray on the current question. The handler's entire body is `closeMediaMenu()`. | `features/upload/upload-resolver-tray/upload-resolver-tray.component.ts:446-448` vs `docs/specs/component/upload/upload-resolver-tray.question-copy.md` § Affected-media chip |
| **NF-18** | high | tray | **"No number needed" on the house step performs a Skip.** `onStreetCentroid()` calls `onDefer()` → `skipActiveItem()`, so answering "this address has no house number" forfeits the address instead of resolving to the street centroid. | `…/upload-resolver-tray.component.ts:396-398`; contract in `upload-resolver-tray.stepper-fsm.supplement.md` § Step 1B |
| **NF-19** | high | issues lane | **`address_deferred` rows offer Dismiss only.** The kind is written by the tray's defer path and rendered by the lane, but `availableMenuActions()` has no branch for it — so a deferred address has no placement or retry action and the sole exit is to throw the job away. | written `core/upload/location/upload-location-candidate-apply.service.ts:168-172`; rendered `features/upload/upload-phase.helpers.ts:62-63`; no branch at `features/upload/upload-panel/upload-panel-item.component.ts:253-285` |
| **NF-20** | high | Branch C | **CITY-01 is implemented as a distance test, but specified as a city-name test.** The spec requires comparing the Photon candidate's city against the EXIF **reverse-geocoded** city; the code compares haversine distance against `sourceAgreementRadiusMeters` (150 m). So it misses cities that differ by name but sit within 150 m, and fires on same-city pairs that are farther apart. | `core/upload/location/upload-location-resolution.helpers.ts:446-461` vs `docs/specs/service/media-upload-service/upload-address-resolution.branch-c-city-tray.md:14` |
| **NF-21** | high | Branch C | **When CITY-01 does fire, the tray cannot disambiguate.** It forces `ambiguous` carrying only the single Photon candidate; `pickDiscriminatingField` on one candidate returns `null`, and the EXIF-implied city is never injected as a second option. The user is shown a one-option city question. This is why the spec's Neustiftgasse acceptance criterion is unmet. | `core/upload/location/upload-location-geocode-group.service.ts:204-218`; `…/upload-location-geocode-outcome.util.ts:36-42`; `…/upload-location-pre-resolve-orchestrator.service.ts:201-204` |
| **NF-22** | high | i18n | **Hardcoded German button labels in the project-select dialog**, with ASCII umlaut: `confirmLabel="Auswaehlen"`. Violates the i18n workflow rule and its diacritics rule in one line. Not caught because the guard scans for missing `t()` in a different shape. | `features/upload/upload-panel/upload-panel.component.html:510-511` |
| **NF-23** | medium | consistency | **`source-none` writes two different issue kinds depending on timing.** The tray path defers the group and writes `address_deferred`; the late-join replay writes `missing_gps` as the spec requires. Same user answer, different lane row and different available actions. Compounds NF-19. | `core/upload/location/upload-location-candidate-apply.service.ts:156-173` vs `core/upload/location/upload-location-source-conflict.service.ts:108-114`; spec `upload-manager-pipeline.location-routing.supplement.md:56` |
| **NF-24** | medium | Branch C | **A wrong auto-assigned city can skip the city step entirely** when EXIF happens to be within 150 m of the wrong pin — the job goes straight to the house-number step. Direct consequence of NF-20's predicate. | `…/upload-location-geocode-group.service.ts:234-235` vs `:261-277` |
| **NF-25** | medium | panel / spec | **Row actions are hardcoded, not registry-filtered.** The spec states actions MUST be declared in a registry and filtered by lane/state/capability, and MUST NOT have visibility hardcoded in scattered conditionals. The implementation is one inline branching method. NF-19 is the first bug this shape produced. | `features/upload/upload-panel/upload-panel-item.component.ts:241-310` vs `upload-panel.lane-and-row-actions.md` |
| **NF-26** | medium | state exclusivity | **Two loading indicators render simultaneously on an active row** — the `[uploadOverlay]` on `app-universal-media` and a separate thumbnail spinner, both driven by the same phase set. Violates the "Loading/Error/Empty are mutually exclusive, each has exactly one visual owner" hard blocker. | `features/upload/upload-panel/upload-panel-item.component.html:42-54`; driver `…/upload-panel-item.component.ts:482-497` |
| **NF-27** | medium | a11y | **The overlay's status text is duplicated and the accessible copy is hidden.** The row passes raw `job.statusLabel` as the overlay label while the universal-media overlay carrying the same information is `aria-hidden="true"` — a visible label with no accessible equivalent, and a raw service string outside the i18n pipeline. | `…/upload-panel-item.component.ts:174-177`; `shared/…/universal-media.component.html:45-54` |
| **NF-28** | medium | a11y | **No focus management on any modal surface in the upload panel.** The duplicate dialog declares `role="dialog"` and `aria-modal="true"` with no initial focus and no trap; the location editor moves no focus on open; nothing restores focus on close. | `features/upload/upload-panel/upload-panel.component.html:446-501`, `:380-443` |
| **NF-29** | medium | a11y | **The location editor's close button is named "Clear search"** — it reuses `workspace.addressSearch.aria.clear`. The accessible name does not match the control's purpose. | `…/upload-panel.component.html:395` |
| **NF-30** | medium | session state | **The location-mode override picks an arbitrary project when several are filtered.** The spec defines the override for *one* selected project filter; the code takes `Array.from(selected.values())[0]`, so with a multi-select the toggle silently binds to whichever project the Set iterates first. | `features/upload/upload-panel/upload-panel-signals.service.ts:94-97`; spec `upload-manager-pipeline.location-routing.supplement.md` § Session override |
| **NF-31** | medium | lifecycle | **The address-search debounce timer is never cleared on destroy**, so a geocode can fire after the panel is torn down. | set `…/upload-panel-dialog-actions.service.ts:129-132`; stored `…/upload-panel-dialog-signals.service.ts:32,99-105`; absent from `…/upload-panel.component.ts:279-281` |
| **NF-32** | medium | tray | **The affected-media chip list does not prune vanished jobs** — it maps `jobIds` through `jobs.find(…)` and falls back to the raw id, so cancelled or dismissed jobs linger as bare ids. Same root cause as [NF-11](02-new-issues.md), seen from the rendering side. | `…/upload-resolver-tray.component.ts:165-180` |
| **NF-33** | low | i18n | Four more hardcoded English/German strings outside `t()`: the folder-scan status (`'Scanning... '` + count), two template ARIA labels, three row-action ARIA labels built in TypeScript, and a `'Download fehlgeschlagen.'` toast fallback (also missing its `ä`). | `…/upload-panel-state.service.ts:59-61`; `…/upload-panel-item.component.html:78`; `…/upload-panel.component.html:288`; `…/upload-panel-item.component.ts:212-218`; `…/upload-panel-job-file-actions.service.ts:68` |
| **NF-34** | low | robustness | **`NaN` progress produces an invalid overlay width.** The clamp is `Math.max(0, Math.min(100, raw))`, which passes `NaN` through unchanged into `[style.width.%]`. | `shared/media-item/media-item-upload-overlay.component.ts:18-21` |
| **NF-35** | low | Branch C | `confirmTrayCity` falls back to **the first whitespace token of `titleAddress`** when the Search Object has no street — wrong for every multi-word street name ("Mariahilfer Straße" → "Mariahilfer"). | `core/upload/location/upload-location-tray-flow.service.ts:259` |
| **NF-36** | low | tests | **`shouldForceBranchCCityTray` has no unit test.** The single most spec-divergent predicate in address resolution (NF-20) is unguarded against regression. | zero `*.spec.ts` references |
| **NF-37** | low | tray FSM | The tray has **no transition map and no guard**; navigation is direct orchestrator calls, and the root's `data-state` is a constant `'active'` while the blocked substate lives on a child alongside three parallel boolean computeds. Subsystem-level instance of UP-11. | `…/upload-resolver-tray.component.ts:356-394`, `:159-163`; `…/upload-resolver-tray.component.html:13`, `:75-77` |

---

## 3. Where the specs are right and the code is behind

The Branch C review turned up more agreement than disagreement, which is worth recording so the divergences stand out:

**Aligned:** Branch A/B/C completeness gates; project centroid passed as geocode bias **only** on Branch B and never as a fallback; the far-hit filter dropping candidates beyond the org distance cap before trays are built; Branch B's 0-hit fall back to a Branch C text step; the 1A→1B chaining through `dependsOnItemId`; CITY-02 (no EXIF → auto-assign) and CITY-03 (multiple hits → city step); and the three `source-*` placement outcomes.

**Deliberately absent:** `registerContextDistanceGroup` and the C5 `context_distance` tray are unimplemented *by design* — the adapter spec says so in its header. The distance **filter** ships; the **tray** does not. That corroborates [NF-15](02-new-issues.md) from the other direction: the dead union member is dead because the feature was deferred, not because it was removed.

**Undocumented but implemented:** `isExifAuthoritativeOverWeakFilenameStreet` — EXIF wins over a weak filename street and skips the city tray. Real, tested, and absent from the Branch C spec.

So the trust problem in address resolution is not "specs describe things that were never built". It is narrower and more specific: **CITY-01's written predicate and its implemented predicate are different algorithms**, and the spec's own acceptance scenario is the one the implementation cannot satisfy. That has to be resolved in one direction or the other before anything else in Branch C can be trusted.

---

## 4. Verified correct — do not re-audit

| Area | Evidence |
| --- | --- |
| Tray keyboard handling (arrows, 1–9, Enter, Escape) with an input-field guard | `…/upload-resolver-tray.component.ts:297-354` |
| Blocked steps disable Continue and show the depends-on hint | `…/upload-resolver-tray.component.ts:183-186`; `…html:74-77` |
| Orchestrator dedupes duplicate tray groups | `core/upload/address-resolution/upload-resolver-tray-orchestrator.service.ts:329-361` |
| Two-step destructive confirm on remove/delete, with a single destructive separator | `…/upload-panel-item.component.ts:388-402` |
| Subscription hygiene — panel and tray streams use `takeUntilDestroyed` | `…/upload-panel-lifecycle.service.ts:66-82`; `…/upload-resolver-tray.component.ts:298-303` |
| Batch-progress divide-by-zero guarded in core | `core/upload/support/upload-batch.service.ts:98-99` |
| The row's overlay button is not a button-in-button — the menu and thumbnail are excluded by `pointer-events` layering | `…/upload-panel-item.component.scss:131-149` |
| Session location override behaves per spec on five of its six rows (the sixth is NF-30) | `…/upload-panel-signals.service.ts:100-127` |
| All intake handlers pass `locationRequirementMode` on submit | `…/upload-panel-input-handlers.ts:52-76,146,178` |
