# Upload Manager Pipeline — Content-hash dedup scope (supplement)

> **Parent:** [upload-manager-pipeline.md](./upload-manager-pipeline.md)  
> **Related:** [upload-manager-pipeline.data.md](./upload-manager-pipeline.data.md), [upload-panel.dedup-ux.supplement.md](../../component/upload/upload-panel.dedup-ux.supplement.md)  
> **DB:** [database-schema.md](../../../architecture/database-schema.md) § `public.dedup_hashes`

## What It Is

Normative contract for **content-hash deduplication scope**: org partition, media-type tiers, hash algorithms, and resume vs colleague UX. Parent Actions 7–11 remain the UI index.

## Goals (priority order)

| # | Goal | User-visible outcome |
| --- | --- | --- |
| 1 | **Resume-safe uploads** | Same user re-selects an interrupted folder → finished files are not re-uploaded |
| 2 | **Org-wide duplicate avoidance** | Colleagues in the same company do not store identical bytes twice |
| 3 | **Accidental re-upload guard** | Renamed copies / double folder pick detected before storage write |

**Not a goal:** cross-org dedup, perceptual duplicate detection, content-addressable storage.

## Media-type tiers

| Tier | Media types | Hash algo | Dedup? |
| --- | --- | --- | --- |
| A — geo photo | `photo` | `photo_v1` | Yes |
| B — byte-static | `document` (PDF, Office, TXT, CSV, …) | `binary_v1` | Yes |
| C — video resume | `video` | `binary_v1` | Yes (identical bytes only) |

Implementation: `isContentHashDedupEligible()` in `upload-dedup-eligibility.util.ts`.

## Hash algorithms

| Algo | Inputs | Used for |
| --- | --- | --- |
| `photo_v1` | First 64 KB + file size + EXIF GPS, `capturedAt`, `direction` | Field photos |
| `binary_v1` | First 64 KB + file size + `\|algo=binary_v1` | Documents, video |

Filename is never in the fingerprint. EXIF edits change `photo_v1` only.

Dispatch: `computeUploadContentHash(file, parsedExif, mediaType)` in `content-hash.util.ts`.

## Dedup scope (tenant)

| Dimension | Contract |
| --- | --- |
| Lookup key | `(organization_id, content_hash)` |
| RPC | `check_dedup_hashes` → `{ content_hash, media_item_id, registered_by_user_id }` |
| Orphan guard | Joined `media_items.storage_path IS NOT NULL` |
| Cross-org | Never |

Migration: `20260611120000_dedup_hashes_org_scope.sql`.

### `public.dedup_hashes`

| Column | Role |
| --- | --- |
| `organization_id` | Dedup partition |
| `content_hash` | Client fingerprint |
| `hash_algo` | `photo_v1` \| `binary_v1` |
| `media_item_id` | Canonical org media row |
| `user_id` | First uploader (audit) |

## Behavior matrix

| Scenario | UX |
| --- | --- |
| Same user, hash match | **Auto-skip** — `phase=skipped`, "Already uploaded" |
| Colleague, hash match | **Issue** — `issueKind=duplicate_file`, modal via `duplicateDetected$` |
| `upload_anyway` | New media row + storage object; org hash row unchanged |
| Replace / attach | Same dedup gate (photo-only validation on those flows) |

## Single gate, deterministic intra-batch

Content-hash dedup is a **single** gate, run **before** title extraction /
geocode / trays — duplicates never enter location resolution or the tray, and
progress never regresses to `dedup_check` after placement.

| Layer | Mechanism | Covers |
| --- | --- | --- |
| Intra-batch (same selection) | Per-batch in-memory hash registry on the manager (`claimBatchHash`); first job owns the hash, later byte-identical siblings skip — **deterministic, no server call** | Double folder pick / renamed copies within one batch (Goal 3) |
| Org / resume / colleague | One `check_dedup_hashes` RPC at the same gate | Prior uploads, colleague duplicates |
| Cross-client race | DB `UNIQUE(organization_id, content_hash)` arbitration (below) | Two clients, identical bytes, same instant |

Intra-batch skips are visible (`uploadSkipped`); `existingMediaId` MAY be
undefined until the owning sibling finishes uploading.

## Concurrency contract (cross-client race)

When two clients write identical bytes for the same org simultaneously, neither
sees the other at check time. The unique index is the arbiter: the hash
registration MUST use `ON CONFLICT (organization_id, content_hash) DO NOTHING`;
the client that inserts **0 rows** lost the race and reconciles its file as a
duplicate (remove the orphan storage object + media row, surface as skip/issue).
This replaces the legacy best-effort **second** client dedup check.

## Acceptance criteria

- [x] `dedup_hashes` uses `UNIQUE(organization_id, content_hash)` with `organization_id` backfill
- [x] `check_dedup_hashes` is org-scoped and returns `registered_by_user_id`
- [x] Orphan guard on `storage_path`
- [x] Same-user match auto-skips without modal
- [x] Cross-user org match surfaces `duplicate_file` issue + modal
- [x] `photo_v1` + `binary_v1` cover photo, document, and video
- [x] Intra-batch (same-selection) duplicates skipped deterministically before storage write, single early gate
- [ ] Hash registration uses `ON CONFLICT DO NOTHING`; losing client reconciles the orphan (cross-client concurrency)
- [ ] `use_existing` links project context when batch has project filter (parent AC — verify end-to-end)
