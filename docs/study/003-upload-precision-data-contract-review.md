---
id: STUDY-003
type: review
status: partially-remediated
supersedes: none
corrected-by: none
---

# Data and contract layer of the upload precision branch

**Written:** 2026-09-10 · **Branch:** `cursor/upload-heic-hash-order-3be6`, first read at `8fc56deb`, re-checked at `18f8c208`
**Scope:** the `address_precision` work — migration `20260910140000_upload_address_precision.sql`, the location RPCs it touches, their frontend callers, and the specs that describe them.

---

## The measurement ceiling: nothing here was executed

**No claim in this study is graded above `[B]`, and the reason is structural, not modest.** This review was **entirely static**:

- There were **no Supabase credentials in the environment**.
- **No migration was applied** — not to hosted, not to a local instance.
- **No RPC was executed.** Function signatures were read from `.sql` files, not from `pg_proc`.
- **No RLS policy was exercised.** Authorization claims come from reading `SECURITY DEFINER` bodies and `GRANT` statements.

So every finding below is of the form *"the committed SQL and the committed TypeScript disagree"*, which is real and actionable, but is **not** the same as *"this fails in production"*. A function that exists on hosted from an earlier out-of-band apply, an overload PostgREST resolves differently than a reader expects, or a policy inherited from a parent table would all change the verdict, and none of them is visible from here. See [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) for what `[B]` licenses.

## Remediation is in flight — read the status field

A parallel agent is fixing several of these findings **on this same branch while this study is being written**. Rows below carry their state as of `18f8c208`. Anything marked *remediated* was fixed by that work, not by this study, and should be re-read from the code rather than trusted from here.

---

## Findings

| # | Finding | Severity | State at `18f8c208` |
| --- | --- | :---: | --- |
| 1 | Code-before-migration deploy order | **BLOCKER** | open |
| 2 | `add_media_item_location` never extended | HIGH | remediated |
| 3 | `list_locations_for_media` cannot read back what the write path stores | MEDIUM | remediated |
| 4 | Writer inventory incomplete in the spec | MEDIUM | remediated |
| 5 | `count_zoomable_locations_for_media` drift unrecorded | MEDIUM | open |
| 6 | `active-selection-view.md` states containment as current behaviour | MEDIUM | remediated |
| 7 | `retire_dedup_hashes_for_media_item` is org-scoped, not owner-scoped | LOW | open |
| 8 | The same RPC returns `0` silently for a media id that does not exist | LOW | open |

### 1 — Deploy order is a blocker `[B]`

`resolve_media_location` gains `p_house_number` and `p_address_precision` **only** in `20260910140000_upload_address_precision.sql:156`. The upload address path sends `p_address_precision` on every call (`apps/web/src/app/core/upload/address-resolution/upload-address-resolve.util.ts:66`, `:106`), as do the resolver and media-detail paths (`core/location-resolver/location-resolver.service.ts:439`, `:462`, `:522`; `core/media-location-update/media-location-update.service.ts:46`, `:99`, `:171`).

If the frontend ships before the migration applies, PostgREST cannot resolve the function for the parameter set it is given and **every location write fails** — for uploads that means addresses silently stop being persisted. This is a **deploy-order** defect, not a code defect: both halves are correct, and the order between them is not enforced anywhere. `20260910160000_fix_address_precision_overloads.sql` adds a second migration to the same chain, which widens the window rather than closing it.

### 2 — `add_media_item_location` was never extended `[B]` *(remediated)*

The adapter's `patchToRpcParams()` always emits `p_address_precision` (`core/media-locations/adapters/supabase-media-locations.adapter.ts:134`) and is shared by `add`, `update` and `findOrCreate` (`:37`, `:48`, `:77`). `20260910140000` extended five functions and **not** `add_media_item_location`, so the add path sent a parameter the function did not declare. Fixed by `20260910160000_fix_address_precision_overloads.sql:68`.

### 3 — The write path could not be read back `[B]` *(remediated)*

`list_locations_for_media` was last defined in `20260524120000_locations_nn_junction.sql`, before the column existed, so it did not return `address_precision`. Precision could be written and never read — the worst shape for a new column, because nothing surfaces the gap. Fixed by `20260910160000:143`, which also exposes it from `search_locations` (`:220`).

### 4 — Writer inventory incomplete `[B]` *(remediated)*

`address-resolution-model.address-precision-writers.supplement.md` now states it covers **all** RPC writers including those with no precision producer, and records the `add_media_item_location` gap explicitly. An unlisted writer reads as "does not write locations", which is precisely how finding 2 survived review.

### 5 — `count_zoomable_locations_for_media` drift is unrecorded `[B]`

The SQL counts links whose location has coordinates, with **no street and no precision predicate** (`supabase/migrations/20260524120000_locations_nn_junction.sql:467-482`). The client-side counterpart requires street text: `countZoomableLinks` → `locationsWithGps` → `locationPinEligible` (`apps/web/src/app/core/media-locations/media-locations.helpers.ts:309-325`), whose comment claims the *"same rule as batch `zoomable_location_count`"*. The two rules are different, and a grep of `docs/specs/**` returns **no** occurrence of `count_zoomable_locations_for_media` — the divergence is documented nowhere. It will be re-derived by whoever implements the `locationPinEligible` removal.

### 6 — Containment described as current behaviour `[B]` *(remediated)*

`docs/specs/component/workspace/active-selection-view.md:94` described radius selection as a containment filter on known area. Containment is a decision, not behaviour: the shipped code tests centroid distance (`apps/web/src/app/features/map/map-shell/radius/radius-selection.service.ts:56-60`). The line now reads **"Target is a containment filter"**, which is the honest form. See [STUDY-001](./001-area-selection-geometry.md) for whether the target geometry itself is right.

### 7 — Intra-org griefing on hash retirement `[B]`

`retire_dedup_hashes_for_media_item` (`supabase/migrations/20260910120000_retire_dedup_hashes_for_media_item.sql`) derives the organization server-side and raises `42501` across organizations (`:28-31`) — the tenant boundary holds. It does **not** check who uploaded the media item. Any authenticated member of the organization can retire any other member's dedup hashes for any media id in that organization, which re-opens the duplicate-upload window the hashes exist to close. Low severity because the blast radius is bounded by the tenant and the damage is duplicate rows rather than data loss, but it is a wider grant than the replace flow needs.

### 8 — Silent zero for a missing media id `[B]`

The same function returns `0` when the media item does not exist (`:24-26`), which is indistinguishable from "there was nothing to retire". A replace flow that passes a stale or wrong id gets a success-shaped answer and moves on.

---

## What this study could not prove

| Open | What would settle it |
| --- | --- |
| Whether the hosted database already carries any of these functions in a different shape | `supabase migration list` plus a `pg_proc` query against hosted, with credentials. |
| Whether finding 1 actually breaks a real deploy | Apply the frontend build against a database at the previous migration and attempt one upload with coordinates. |
| Whether `20260910140000` / `20260910160000` apply cleanly to hosted | Neither has been applied in an agent environment. The writers supplement records `20260910160000` as replayed locally against PostgreSQL 16; hosted remains unverified. |
| Whether any RLS policy blocks the paths above in practice | No policy was exercised; all authorization reasoning is from reading policy SQL. |
| Whether findings 7 and 8 are reachable through the UI | Requires a live session and a second organization member. |

## Related

- [`06-improvement-plan.md`](../audits/upload-flow-review-2026-09-10/06-improvement-plan.md) items 14–15 — the precision and extent work this branch implements.
- [`02-new-issues.md`](../audits/upload-flow-review-2026-09-10/02-new-issues.md) NF-40 — the product defect that motivated the column.
- [`address-resolution-model.address-precision-writers.supplement.md`](../specs/service/media-upload-service/address-resolution-model.address-precision-writers.supplement.md) — the normative writer inventory.
