# TRAPS — how this code misleads people

The fourth memory. The other three answer *what it should do* ([`docs/specs/`](./specs/README.md)), *why this and not the alternative* ([`docs/study/`](./study/README.md)) and *what happened* ([`docs/ai-diary/`](./ai-diary/README.md)). This one answers **how a legible piece of this repository leads a careful reader to the wrong conclusion**.

Read it before your **second** attempt at a bug — that is the moment it pays for itself. It is one file on purpose: a trap list that cannot be read in one sitting will not be read before work starts, and then it is just another diary.

## Entry format

Every entry has the same five lines, so the file stays skimmable as it grows:

- **Surface** — what is actually written in the code, the config or the doc.
- **Assumption** — what a competent reader concludes from that surface.
- **Truth** — what is really the case.
- **Detect** — the check that would have caught it, in seconds.
- **Source** — where it is recorded, and the `path:line` proving it today.

Plus a **Status**: `open` (the misleading surface is still in the tree), `pattern open` (these instances are fixed, the shape recurs), or `resolved` (surface and shape both gone — kept, never deleted).

## Promotion rule

A lesson is *noticed* in the diary and *promoted* here. It graduates when it has **bitten twice**, or **once with a user-visible consequence**. Everything else stays a diary entry — this file loses its value the moment it becomes a dump of every observation.

Entries are numbered, never renumbered, and never deleted. Order is by cost, not by date: the shapes that keep recurring stay near the top. When you promote a lesson, take the next free number and place it where a reader would want to meet it.

---

## At a glance

| # | Trap | Status |
| --- | --- | --- |
| [TRAP-001](#trap-001--a-condition-that-does-not-say-what-it-means) | A condition that does not say what it means (four instances) | `pattern open` |
| [TRAP-002](#trap-002--a-guard-that-rejects-by-returning) | A guard that rejects by returning, and callers that ignore the return | `open` |
| [TRAP-003](#trap-003--create-or-replace-function-does-not-replace) | `CREATE OR REPLACE FUNCTION` overloads instead of replacing | `pattern open` |
| [TRAP-004](#trap-004--unlayered-css-beats-every-layer-rule) | Unlayered CSS beats every `@layer` rule, at any specificity | `pattern open` |
| [TRAP-005](#trap-005--component-scss-out-specifies-the-primitive-it-styles) | Component SCSS out-specifies `hlmBtn`'s own hover | `pattern open` |
| [TRAP-006](#trap-006--a-cast-that-invents-an-option) | A cast that invents an option the library never reads | `open` |
| [TRAP-007](#trap-007--apps-web-has-its-own-node_modules) | `apps/web` has its own `node_modules`; a root `npm install` installs almost nothing | `open` |
| [TRAP-008](#trap-008--a-green-build-says-nothing-about-a-second-visit) | A green build says nothing about a second visit | `open` |
| [TRAP-009](#trap-009--two-enums-one-idle-one-data-state-attribute) | Two enums, one `idle`, one `data-state` attribute | `open` |
| [TRAP-010](#trap-010--dead-code-that-outlives-its-producer) | Dead code that outlives its producer, and the spec that outlives both | `open` |
| [TRAP-011](#trap-011--a-prior-findings-own-wording-is-a-lead-not-a-fact) | A prior finding's own wording is a lead, not a fact | `pattern open` |
| [TRAP-012](#trap-012--piping-a-write-side-script-truncates-the-process) | Piping a write-side script truncates the process, not the output | `open` |

---

## TRAP-001 — A condition that does not say what it means

**This is the repository's most expensive recurring shape.** It has bitten four times in four subsystems, and every instance was legible: a reader could read the line, understand it, and still draw the wrong conclusion. The bug is not in the logic — it is that the condition's *name* answers a different question from the one being asked at the call site.

**Surface** — a boolean, a phase label, or a keyword that reads as an answer to the question being asked.

**Assumption** — the name means what the call site needs it to mean.

**Truth** — the condition is a *proxy*: it correlates with the real answer under the conditions the author had in mind, and diverges everywhere else. The four confirmed instances:

1. **`!isHeic(job.file)` used for "file preparation finished."** A question about a *folder name* was therefore gated on image conversion: the resolver tray's Continue button blocked while `heic2any` ran, in a flow the product owner had defined as a background task. True answer now has a name of its own: `job.filePrepareComplete`.
2. **`resolving_address` as the phase label wrapping `enrichWithReverseGeocode`.** The phase says a reverse geocode is happening. The function is empty — the real reverse geocode happens elsewhere, fire-and-forget and unawaited. A reader tracing "where does the address come from" lands on a no-op with an authoritative label.
3. **`locationPinEligible` (street text present + coordinates) used for address precision.** Whether a *string field is non-empty* is not whether the coordinates are precise enough to pin. City-precision locations with real coordinates count as zero client-side while the equivalent RPC counts them as one.
4. **`CREATE OR REPLACE FUNCTION` read as "replace."** See [TRAP-003](#trap-003--create-or-replace-function-does-not-replace) — same shape, in SQL, and the most expensive of the four.

**Detect** — when a condition gates work, ask: *what question is this call site actually asking, and does this name answer that question, or a correlated one?* Two concrete smells:

- The name is about **how something is stored or encoded** (`isHeic`, `street !== ''`) while the call site is about **whether a step is done** or **how good the data is**. Encoding is never a proxy for completion; presence of text is never a proxy for precision.
- The identifier is a **label** (a phase, a status, an enum member) and you are treating it as a **guarantee**. A label is written by whoever set it; a guarantee has to be established by the code that reads it. Grep the function the label wraps before trusting the label.

The remedy in every fixed instance was the same: give the real question its own name and set it where the answer is actually established.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § Mistakes/lessons ("Fourth instance of *a condition that doesn't say what it means*"); [area-extent decisions supplement](./specs/service/media-upload-service/address-resolution-model.area-extent-decisions.supplement.md) Decision 2. In the tree today: `apps/web/src/app/core/upload/address-resolution/upload-tray-resolution-gate.helpers.ts:43` (the fix for #1), `apps/web/src/app/core/upload/support/upload-enrichment.service.ts:49-53` with its caller at `apps/web/src/app/core/upload/pipelines/new/upload-new-post-save.util.ts:146-147` (#2, **still live**), `apps/web/src/app/core/media-locations/media-locations.helpers.ts:310-315` (#3, **still live**, removal is improvement-plan item 15).

**Status** — `pattern open`. Instances #2 and #3 are still in the tree.

---

## TRAP-002 — A guard that rejects by returning

**Surface** — a transition guard that validates an edge against a map and returns the result: `transitionMediaDisplayState(current, next)` returns `current` when the edge is not in the map; `UploadJobStateService.setPhase()` returns `false` when it refuses.

**Assumption** — the guard protects the state machine, so a state machine with a guard is a state machine that cannot go wrong.

**Truth** — the guard is only as trustworthy as the map behind it, and its rejection is **invisible** unless every caller checks the return. Neither condition held:

- `goTo()` in `media-display.component.ts` returns `void`. A missing `media-ready → content-visible` edge silently kept the state, so **every warm revisit to `/media` stuck at `media-ready`** with a blank tile — user-visible, and it read as a signing or caching bug for a long time.
- The upload phase map shipped wrong on **eight** edges after dedup moved ahead of location resolution. `setPhase` returned `false`; **no caller anywhere reads the boolean**; tray resolution and conflict resolution were functionally dead while the pipeline kept running.

And the obvious fix inverts the damage. Making an illegal transition `failJob` was tried and was **worse in a checkable way**: the call sites run on regardless, so a missing edge previously meant a wrong *label* on a job that still finished, whereas failing means storing the file, saving the record, and *then* telling the user the upload failed — on the authority of a map that had been wrong eight times.

**Detect** — two questions, in this order. (a) *Does anything read this guard's return value?* `rg` the call sites. (b) *What happens when the guard itself is wrong?* If the answer is "user work is destroyed", the guard must not have a veto. The settled design for the upload FSM is the one to copy: **terminality is the only hard invariant**; every other edge is an assertion about pipeline structure, so an unmapped non-terminal transition reports loudly (tests throw, dev logs) and then **applies** — when map and pipeline disagree, the pipeline is the authority and the map is the bug.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § The transition map shipped wrong on eight edges; [`2026-05-25`](./ai-diary/2026-05-25.md) issue #1 and invariant 1; [phase-FSM supplement](./specs/service/media-upload-service/upload-manager.phase-fsm.supplement.md) § Guard policy. Settled version: `apps/web/src/app/core/upload/support/upload-job-state.service.ts:146-178`. **Still silent** in the media display: `apps/web/src/app/shared/media-display/media-display-state.ts:37-49`, called from a `void` method at `apps/web/src/app/shared/media-display/media-display.component.ts:949-960`.

**Status** — `open`.

---

## TRAP-003 — `CREATE OR REPLACE FUNCTION` does not replace

**Surface** — a migration that adds a parameter to an existing function using `CREATE OR REPLACE FUNCTION`.

**Assumption** — "or replace" replaces the function. The migration is therefore safe and needs no drop.

**Truth** — Postgres replaces **only on an exact argument-list match**. Adding a parameter changes the signature, so you get a *second overload*, not a replacement. Every call that omits the new argument then matches both candidates and dies with `SQLSTATE 42725` (`function ... is not unique`), surfacing through PostgREST as `PGRST203`. The consequences are not confined to callers that know about the change: `add_media_item_location` broke **internally**, through its own 13-argument positional call to `find_or_create_location`, so media-detail "add address" and `markUnresolvable` failed for every user regardless of what the frontend sent.

Two aggravating details. `DROP FUNCTION IF EXISTS` **silently no-ops on a signature mismatch**, so a repair migration can look successful and fix nothing. And this repository had already fixed this exact bug once, in `20260525210000_drop_resolve_media_location_nine_arg_overload.sql`, with a single-signature assertion in `scripts/verify-locations-nn-migration.sql` that the new migration re-broke.

**Detect** — after any migration that changes an argument list, count signatures rather than trusting the DDL:

```sql
SELECT proname, count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' GROUP BY proname HAVING count(*) > 1;
```

Better: end the migration with a `DO` block that raises when any touched function has more than one signature, so the chain refuses to apply broken. And — the wider lesson from how this was found — **a static read of SQL is not verification**. The first review read the same file and concluded the change was safe. The second installed PostgreSQL 16 + PostGIS and replayed all 132 migrations, which took the answer from wrong to right and turned up a third broken call. A local replay needs no credentials; treat migration review without one as unreviewed.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § `CREATE OR REPLACE` does not replace — it overloads. Repair migration, with the guard block, at [`supabase/migrations/20260910160000_fix_address_precision_overloads.sql`](../supabase/migrations/20260910160000_fix_address_precision_overloads.sql).

**Status** — `pattern open`. Fixed twice; the surface is unchanged and will read the same way to the next author.

---

## TRAP-004 — Unlayered CSS beats every `@layer` rule

**Surface** — a base rule left outside `@layer components`, usually with a comment explaining that it must beat a third-party class.

**Assumption** — layers and specificity compose the way they normally do, so a more specific state rule will still win during `:hover`.

**Truth** — **unlayered CSS outranks every `@layer` rule, at any specificity.** An escape hatch left unlayered to beat someone else's class also permanently beats *your own* `@layer states` hover/active override for the same property. The rule compiles, ships, and never fires. Worse, the escape hatch goes stale: in the case that produced this entry, the button had been refactored to a plain `<button>` with no `hlmBtn` at all, so the rule it was beating no longer existed — and the only thing it still beat was the hover it was blocking.

**Detect** — when a hover, active or `[data-active]` visual "does nothing" despite SCSS that looks correct, **check `@layer` placement before touching specificity, `!important`, or selector order**. Then grep the template for the framework class the unlayered rule claims to beat; if it is not on the element any more, the escape hatch is stale. Invariant: any property changed by a `@layer states` rule must have its resting value declared in `@layer components` — never split across layered and unlayered for the same property and selector.

**Source** — [`.cursor/rules/token-usage-gate.mdc`](../.cursor/rules/token-usage-gate.mdc) § 6 (normative); [`2026-07-01`](./ai-diary/2026-07-01.md). The corrected shape, with the reasoning in a comment, is at `apps/web/src/app/features/map/map-filter-toolbar/map-filter-toolbar.component.scss:29-38`.

**Status** — `pattern open`. Recorded as a second recurrence when the rule was written.

---

## TRAP-005 — Component SCSS out-specifies the primitive it styles

**Surface** — a `color:` (or other interactive property) set on an `hlmBtn` element from the component's own SCSS.

**Assumption** — the design-system primitive owns its interaction states, so its hover still applies.

**Truth** — Angular component SCSS is scoped with an attribute selector, which adds an attribute to every selector in the file. A plain `.my-btn { color: … }` therefore lands at `0,2,0` and out-ranks or ties `hlmBtn`'s Tailwind hover utility, which then loses — so the button's colour is frozen through hover and the primitive appears broken.

**Detect** — if you set an interactive property on an `hlmBtn` element in component SCSS, you own that property in **every** state: add the explicit `&:hover, &:focus-visible { … }` block in the same file. Never rely on the primitive's own hover winning against your component rule. The safer default, used across this codebase, is to keep component SCSS to geometry and leave colour and ink to the variant — several files say so in a comment.

**Source** — [`.cursor/rules/token-usage-gate.mdc`](../.cursor/rules/token-usage-gate.mdc) § 5 (normative); named as the first recurrence of the cascade-priority family in [`2026-07-01`](./ai-diary/2026-07-01.md). Live acknowledgement in the tree: `apps/web/src/app/features/map/map-shell/scss/_map-shell-upload.scss:45`.

**Status** — `pattern open`.

---

## TRAP-006 — A cast that invents an option

**Surface** — `...(abortSignal ? ({ signal: abortSignal } as Record<string, unknown>) : {})` spread into a Supabase Storage `.upload()` options object.

**Assumption** — the upload is abortable; the cast is there to work around a lagging type definition.

**Truth** — `FileOptions` in `@supabase/storage-js@2.105.4` declares `cacheControl`, `contentType`, `upsert`, `duplex`, `metadata` and `headers` — and no `signal`. The runtime never reads one. The cast does not work around a stale type; it **silences the compiler's correct objection** and the option is dropped. The visible consequence was a 180-second timeout that rejected the `Promise.race` while the underlying upload kept going, so a late success could land a storage object and a DB row for a job the UI had already shown as failed.

**Detect** — `as Record<string, unknown>` on an options literal is the smell. Any cast whose purpose is to add a key the target type does not have is a claim about a third-party runtime; verify it by reading the installed `.d.ts` in `node_modules`, not the vendor's current documentation — the installed version is the one that runs. The mitigation in place is a manual `abortSignal?.aborted` check plus late-arrival cleanup, because the option itself is not available.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § P2b. Cast at `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:136`; type at `apps/web/node_modules/@supabase/storage-js/dist/index.d.mts:238`.

**Status** — `open`.

---

## TRAP-007 — `apps/web` has its own `node_modules`

**Surface** — a `package.json` and a lockfile at the repository root, which looks like the workspace root of a monorepo.

**Assumption** — `npm install` at the root installs the project's dependencies.

**Truth** — this is not an npm workspace. `apps/web/` carries its own `package.json` **and its own `package-lock.json`**, and every root script is a delegation (`"build": "cd apps/web && npx ng build"`). A root `npm install` installs the root's thin toolchain and nothing else — measured today: 7 entries in `node_modules/` at the root against 441 in `apps/web/node_modules/`. The failure this produces is well disguised: `npx vitest` then resolves an unpinned version off the network, fails to load `vitest.config.ts`, and the error says nothing about installation.

**Detect** — `ls apps/web/package-lock.json`. Setup is `npm install && npm --prefix apps/web install`, exactly as `AGENTS.md` § Development states. When a test runner fails to load its own config in a fresh environment, suspect the install before the config.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § Mistakes/lessons (P9 session).

**Status** — `open`.

---

## TRAP-008 — A green build says nothing about a second visit

**Surface** — `ng build` green, the unit suite green.

**Assumption** — the change is verified.

**Truth** — for anything touching route caches, the media preview FSM, URL signing or tile aspect caches, both gates passed while **every warm revisit to `/media` was broken**: blank tiles, empty content layers, states stuck at `media-ready`. Nothing in either gate exercises the second visit, because the first visit is the only path a fresh test process ever takes. This is why `AGENTS.md` carries LIVE VERIFICATION as an owner-run step with a named route rather than as advice.

**Detect** — for cache and FSM work, the check is manual and specific: map → `/media` → leave → `/media` **again**, then inspect `app-media-display`'s `data-state` (must be `content-fade-in` or `content-visible`, not `media-ready`) and confirm the content layer actually contains an `<img src>`. Agents must call this out explicitly; if they do not, ask for the LIVE CHECK block.

**Source** — [`2026-05-25`](./ai-diary/2026-05-25.md) § Meta ("Build green ≠ revisit OK") and its prompting guide; [`docs/agent-workflows/agent-communication.md`](./agent-workflows/agent-communication.md) § LIVE VERIFICATION.

**Status** — `open`.

---

## TRAP-009 — Two enums, one `idle`, one `data-state` attribute

**Surface** — `data-state="idle"` in DevTools.

**Assumption** — there is one state machine, and it is idle.

**Truth** — at least three different "ready" concepts render through similarly-named states, and two distinct enums both contain `idle`: `MediaItemState` (`'idle' | 'selected' | 'uploading' | 'error'` — a *selection* shell) and `MediaDisplayState` (`'idle' | 'loading-surface-visible' | … | 'content-visible'` — a *display* FSM). Debugging the selection shell's `idle` as though it were the display FSM's `idle` costs a whole session, and a route cache's notion of "list ready" is a third thing again.

**Detect** — read the host element, not just the attribute: inspect **`app-media-display`** for display state and nothing else. When adding a state name, check whether a sibling component already uses it for a different meaning.

**Source** — [`2026-05-25`](./ai-diary/2026-05-25.md) issue #2 and invariant 3. `apps/web/src/app/shared/media-item/media-item.component.ts:51` and `apps/web/src/app/shared/media-display/media-display-state.ts:1-10`.

**Status** — `open`.

---

## TRAP-010 — Dead code that outlives its producer

**Surface** — a field, an enum member or an i18n key that is declared, typed, handled in a `switch`, and documented in a spec.

**Assumption** — something produces it, therefore the branch handling it is reachable and the spec describes live behaviour.

**Truth** — the producer can be deleted while every consumer survives, and nothing reports it: the types still compile, the branch is still legible, and the spec still reads as a contract. `project_address_a` / `project_address_b` lived on as dead fields *and* in the stepper-FSM spec long after their producer was removed. The shape is still in the tree: the tray question keys `upload.resolver.question.projectAddressA` / `…B` are declared in the `questionKey` union and carry English fallback copy, and **nothing under `apps/web/src/app/core/` emits either one**.

**Detect** — this is the [`AGENTS.md`](../AGENTS.md) Change-Completeness Rule with a name. When you remove behaviour, `grep` the removed symbol across `apps/web/src` **and** `docs/specs` and confirm **0** stray references before declaring done. Reading in the other direction is just as cheap: for a suspicious branch, grep for who *writes* the value, not who reads it — a member with readers and no writers is dead however alive it looks.

**Source** — [`2026-06-13`](./ai-diary/2026-06-13.md) § Mistakes/lessons; [`docs/playbooks/change-classification-upload-example.md`](./playbooks/change-classification-upload-example.md). Live instance: `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.helpers.ts:33-34` and `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.component.ts:595-598`.

**Status** — `open`.

---

## TRAP-011 — A prior finding's own wording is a lead, not a fact

**Surface** — a careful, evidence-heavy audit that characterises a defect in passing.

**Assumption** — the characterisation was measured with the same rigour as the finding it belongs to.

**Truth** — it often was not. The upload audit described the corrupted comment blocks as "double-encoded UTF-8". Reversing one line empirically converged to legible text only after **three** rounds of "decode as WHATWG windows-1252, re-encode as UTF-8" — the damage was triple-encoded, and the first repair attempt, written to the audit's number, produced garbage. The finding was real; the adjective in front of it was not evidence.

**Detect** — before acting on a *description* inside a finding, reproduce the description itself on one instance. This is the practical reason [`docs/study/STUDY-FORMAT.md`](./study/STUDY-FORMAT.md) grades individual claims rather than whole documents: a `[C]` sentence inside an `[A]` document is the normal case, not an anomaly. The grades earned their keep the day a `[B]` static SQL review and an `[A]` database replay disagreed — filed as peer audits with equal standing, the wrong one would have won on recency.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § Mistakes/lessons ("Assumed 'double-encoded' without checking"); the corrected finding at [`UP-40`](./audits/upload-process-analysis-2026-09-08/10-findings.md).

**Status** — `pattern open`.

---

## TRAP-012 — Piping a write-side script truncates the process

**Surface** — `node scripts/create-github-issues.mjs issues.json | head -6`, to preview what a batch script is about to do.

**Assumption** — `head` truncates the *output*; the script runs to completion either way.

**Truth** — `head` closes the pipe, the writer takes `SIGPIPE`, and the **process** dies partway through. For a read-only command that is harmless. For a write-side script it means the side effects stop halfway, in this case after six of the intended issues — leaving duplicates `#130`–`#135` that had to be closed by hand, because the agent token can create issues but not update them (`403 Resource not accessible by integration` on any edit, including comments).

**Detect** — never pipe a script that writes to anything through a pager, `head`, or `tail`. Redirect to a file and read the file. For anything with remote side effects, plan the batch to be correct on first write: from inside an agent there is no cleanup path.

**Source** — [`2026-09-10`](./ai-diary/2026-09-10.md) § Mistakes/lessons; consequence recorded in [`docs/backlog/README.md`](./backlog/README.md) § Where open work lives.

**Status** — `open`.

---

## Rejected candidates

Kept so they are not re-proposed. Both were real when recorded; neither reproduces now.

- **`npm run lint`'s error count is unstable when `apps/web/dist/` exists.** Recorded on [`2026-09-10`](./ai-diary/2026-09-10.md) as three bundled-code false positives. Re-tested on 2026-09-10 with `apps/web/dist/` present (42 emitted `.js` chunks) and ESLint 9.39.4: the full `eslint . --max-warnings 0 --ignore-pattern scripts/*` run reports **zero** findings from `dist/`, and passing a `dist/` chunk explicitly is ignored with and without the CLI flag. The flat-config `ignores: ['dist/**']` holds. Not promoted.
- **Cross-file injector pollution in the upload specs** (`upload-location-resolution.service.spec.ts` passing alone but flaking beside `upload-manager.service.spec.ts` over a real `LocalGeoDataAdapter` fetch of `/assets/geo/…`), from [`2026-05-27`](./ai-diary/2026-05-27.md). `upload-manager.service.spec.ts` now provides a `LocalGeoDataAdapter` fake, which is the fix that entry proposed. Resolved, not a standing trap.
