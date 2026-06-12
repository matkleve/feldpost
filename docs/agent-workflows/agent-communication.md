# Agent communication — Feldpost

Normative habits for working with the product owner. Narrative examples live in [`docs/ai-diary/`](../ai-diary/) (latest geocoder arc: [`2026-05-23.md`](../ai-diary/2026-05-23.md)).

---

## Goals

- Align on **invariants** before multi-file work.
- Ask **enough questions that ambiguity is gone** — not a fixed cap of one or two. Wrong assumptions cost more than a short clarification round.
- **Batch** open points in one message (numbered list or **AskQuestion** with multiple items) so the user can answer in one pass; avoid drip-feeding ten single-question turns.
- Keep **plan vs execute** explicit when the user attaches a phased prompt.

---

## When to ask (mandatory triggers)

Before coding, walk this checklist. If **any** row is unclear, ask — add as many questions as needed until you could write the acceptance test:

| Trigger | Clarify |
| ------- | ------- |
| Dedupe, merge, equivalence, history | Whole **list/set** vs single **row**? Order-sensitive? Multiset vs set? |
| Geographic scope | Map viewport, project clusters, marker, country codes — **precedence**? |
| Fallback | Empty RPC / 0 clusters → which path? |
| Identity key | Label only vs label + coordinates vs stable id? |
| UI state | Skip push vs refresh UI when “equivalent”? What does the user still see? |
| Allowed file list | Need a file outside the list? **Stop** and request permission. |
| Prompt vs repo names | Table/column/tuning keys in prompt ≠ `database-schema.md` / types → confirm in Phase 0. |
| Call budget / performance | Max HTTP per keystroke? Parallel OK? Cache expectations? |
| Regression | What must **not** change from the previous phase? |

Use **AskQuestion** when choices are discrete (e.g. project scope: WorkspaceViewService vs media-detail context vs map-only). Use a **numbered clarification block** when questions are open-ended or there are more than a few.

**Stop implementing** when you are still unsure about the user’s invariant — even mid-task. A correction after three wrong assumptions means you should have asked more up front.

---

## Clarification round (before multi-file work)

When the task is non-trivial, prefer this sequence:

1. **Restate** the goal and invariant in your own words → “Is this correct?”
2. **List ambiguities** you found (grep/schema/plan gaps) — all of them, not just the first.
3. **Ask** for decisions on each ambiguity the user cares about; skip only what the spec/plan already locks.
4. **Summarize** agreed behavior in bullets; then implement.

It is better to send **six specific questions once** than to ship code after guessing on five of them.

---

## What to state before non-trivial edits

1. **Invariant** (one sentence).
2. **Files** (≤3 primary).
3. **Will not touch** (allowed list, no full reload, no new RxJS, etc.).
4. **Verify** (vitest paths, manual scenario, SQL check).

---

## 🔴 LIVE VERIFICATION — owner must run (not optional)

When an agent touches **route session cache**, **warm revisit**, **media preview FSM**, **signed-URL cache**, **per-tile aspect cache**, or **upload location routing** (post-save geocode order, folder webkit fallback, upload panel Auto location default), automated gates (`ng build`, vitest) are **necessary but not sufficient** for browser-only behavior. The agent **must** end the turn with an explicit **LIVE CHECK** block when the table below applies. The product owner **must run it in the browser** before treating the task as done — agents cannot see your DevTools or second navigation.

**Upload placement:** Agents without a browser **cannot** complete manual folder-upload smoke. Vitest + `ng build` are the agent completion gate; owner checks supplement AC “Manual browser smoke.”

### You (human) — do this when the agent lists it

| If the agent changed… | You must live-check… |
| --------------------- | -------------------- |
| `media-display` FSM / transitions / `goTo` | **Map → `/media` → map → `/media` again** (second visit is the bug surface). |
| Layer opacity / `data-state` CSS | DevTools: `app-media-display` `data-state` + `.media-display__layer--content` has `<img src>` (not empty). |
| Download / signing / `no-media` | Network: signed URL OK **and** state not stuck at `no-media` / `media-ready`. |
| `media-item` grid aspect / session cache | Slot aspect looks right **and** thumbnails visible (not white boxes). |
| Row vs grid geometry | Toggle row ↔ grid once; both modes should show previews. |
| Upload location routing / post-save geocode / webkit folder fallback | Cold load → **Auto location ON** (default) → FSA folder named e.g. `Mariahilferstraße 56` → upload `IMG_*.jpg` → workspace detail: **location field filled** + **GPS** chip (not “No GPS” with only EXIF in Details). |

### Red flags — stop and reply with a screenshot

- `app-media-display` stays at **`media-ready`** after ~1s on second `/media` visit.
- Content layer **empty** but slot aspect already correct (e.g. `1.33`, `0.75`).
- **`no-media`** or error layer visible while Network shows a loaded image URL.
- Agent says “fixed” but only ran **`ng build`** — **not accepted** for this class of work.

### Do not confuse these `data-state` values

- **`app-media-item` `idle`** = not selected (normal for grid tiles).
- **`app-media-display` `idle`** = no valid handoff / display not started.
- Inspect **`app-media-display`** (or `.media-display__viewport`) for preview FSM — never the item shell alone.

Agents: copy the table row(s) that apply into every handoff; use the heading **🔴 LIVE CHECK (you)** so it is visible in the chat log.

---

## What helps from the user (optional but high signal)

- Invariant first: “Two lists are the same iff every address matches.”
- Hard constraints: “don’t reload the pane”, “patch only”, “STOP”.
- Plan mode: “update plan only” vs “green light — implement”.
- One precise correction: SQL snippet, precedence rule, or “option C”.
- Symptom split: “Internet zone updates but New address row doesn’t” → view/CD vs signals.

---

## Prompting guide (for humans)

See diary § *How to improve prompting* in [`2026-05-23.md`](../ai-diary/2026-05-23.md). Minimum for pipeline/geocoder tasks:

- **Must not regress** (prior phases).
- **Allowed files** + permission to expand.
- **Phase 0 read-only** with STOP conditions.
- **Locked decisions** (do not re-debate in implementation).
- **Call-budget / verification** table.

Map prompt names to repo truth: `media_items`, `contextDistanceMaxMeters`, `apps/web/src/app/core/geocoding/geocoding.service.ts`.

---

## Anti-patterns (agent)

- Re-running the same search after a user correction without changing the model.
- **Under-asking** — implementing dedupe, history, viewport, or merge logic while still guessing the invariant.
- **Over-asking** — the same question twice, or asking what the user already stated in the last message (read first).
- Row-level dedupe when the user described **list-level** identity.
- Inventing tuning keys or table names from the prompt without grep/schema check.
- Long architecture essays when **simple fix gate** applies (≤3 lines / one conditional).
- Implementing while the user is still iterating the **plan document** (unless they say execute).

---

## After a correction

1. Acknowledge the invariant in one sentence.
2. Update **spec or plan section** if the user cares about the contract (same session).
3. Fix code with minimal diff.
4. Add a line to **ai-diary** if the mistake is likely to recur (geocoder, history, location sync, media-display FSM).

---

## Related

- [`AGENTS.md`](../../AGENTS.md) — § Collaboration with the user
- [`agent-quick-reference.md`](./agent-quick-reference.md) — simple fix / anti-loop
- [`element-spec-format.md`](./element-spec-format.md) — SPEC GAP
