# 08 — Data and security (Phase 8)

**Commit:** `8e4b1e09` · **Read first, as plan § 4 Phase 8 requires:** `supabase/AGENTS.md`, `docs/security-boundaries.md`.

**Method and its limit.** This phase reads **committed SQL** and the TypeScript that calls it. There is no Supabase CLI and no credentials in this environment (`00-baseline.md` § 9), and `npm run supabase:smoke` is a static migration-text check, not a live probe (`00-baseline.md` § 5). Therefore:

> **Every statement below describes the migrations as committed. Whether the hosted database matches them is `unverified`** — `supabase/AGENTS.md` § "Hosted migration history" documents that this repo has repeatedly drifted. The check that would settle it is `supabase migration list` against the linked project, with Local and Remote matching on every row.

**Report only. No migration is written in this pass** (plan § 4 Phase 8).

---

## 1. Everything the upload path touches

| Kind | Name | Ops used by upload | Defining migration |
| --- | --- | --- | --- |
| Table | `public.media_items` | insert (new), update (replace/attach, mismatch), delete (cancel rollback), select (panel lookup) | `supabase/migrations/20260317110000_mixed_media_tables.sql`; location columns dropped by `…/20260525130000_drop_media_items_location_columns.sql`; upload columns added by `…/20260617140000_upload_metadata_columns.sql` |
| Table | `public.profiles` | select `organization_id` | `…/20260303000005_rls.sql` (per `supabase/AGENTS.md` § References) |
| Table | `public.dedup_hashes` | insert | `…/20260311100001_dedup_hashes.sql`; org scope + RLS rewritten by `…/20260611120000_dedup_hashes_org_scope.sql` |
| Bucket | `media` (private) | upload, remove, createSignedUrl, download | `…/20260327121000_storage_media_bucket_init.sql` |
| Bucket | `images` (private, legacy) | **read fallback only** — `core/upload/upload.service.ts:76,97` iterate `['media','images']` | `…/20260304000001_storage_images.sql` |
| RPC | `resolve_media_location` (10-arg) | 5 call sites | `…/20260526140000_resolve_media_location_enrich_primary_link.sql`; 9-arg overload dropped by `…/20260525210000_drop_resolve_media_location_nine_arg_overload.sql` |
| RPC | `check_dedup_hashes(text[])` | 1 call site | `…/20260611120000_dedup_hashes_org_scope.sql` |
| RPC | `find_photoless_conflicts(uuid, float8, float8, text)` | 1 call site | `…/20260526200000_fix_find_photoless_conflicts_locations_join.sql` |
| RPC | `list_project_locations(uuid)` | 1 call site | `…/20260527140000_project_locations.sql` |
| RPC | `list_locations_for_media(...)` | 1 call site | `…/20260524120000_locations_nn_junction.sql` |
| RPC | `get_location_by_address_components(...)` | 1 call site | `…/20260526180000_get_location_by_address_components.sql` |

Client call-site counts (`grep` over the 129 non-test files): `.from('media_items')` ×12, `.from('profiles')` ×4, `.from('dedup_hashes')` ×3, `storage.from('media')` ×14.

---

## 2. What the client writes **directly** vs through an RPC (plan § 4 Phase 8.1)

| Write | Path | Guarded by |
| --- | --- | --- |
| `media_items` **insert** | direct — `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:173-196` | RLS `"media_items: own insert"` |
| `media_items` **update** (replace/attach) | direct — `core/upload/pipelines/replace/upload-replace-update-data.util.ts:8-25`, `core/upload/pipelines/attach/upload-attach-update-data.util.ts:19-37` | RLS `"media_items: owner or admin update"` |
| `media_items.location_mismatch_meters` | direct — `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:124-129` | same |
| `media_items` **delete** (cancel rollback) | direct — `…/upload-new-run-upload-phase.util.ts:264-267`, `core/upload/support/upload-file-persist.util.ts:204-207` | RLS `"media_items: owner or admin delete"` |
| `dedup_hashes` **insert** | direct — `core/upload/support/upload-db-postwrite.util.ts:32-38` | RLS `"Users insert org dedup hashes"` |
| **location + address** | **RPC only** — `resolve_media_location`; no direct write to `locations` or `media_item_location_links` exists in the subsystem | the RPC's own org guard (§ 4) |
| Storage object | direct — `core/upload/support/upload-file-persist.util.ts:123-129` | storage policy `"media: org members can upload"` |

The client never writes location rows directly. That is the correct boundary and it holds.

---

## 3. Dedup org scoping — **verified in SQL and RLS** (plan § 4 Phase 8.2)

`supabase/migrations/20260611120000_dedup_hashes_org_scope.sql` implements every claim in `docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md`:

| Spec claim | SQL |
| --- | --- |
| Lookup key `(organization_id, content_hash)` | `CREATE UNIQUE INDEX idx_dedup_hashes_org_hash ON public.dedup_hashes (organization_id, content_hash)` |
| Cross-org: never | `check_dedup_hashes` filters `WHERE dh.organization_id = public.user_org_id()` — the org is derived **server-side**, not taken from the caller |
| Orphan guard on `storage_path` | `JOIN public.media_items m ON m.id = dh.media_item_id … AND m.storage_path IS NOT NULL` |
| Returns `registered_by_user_id` | `SELECT dh.content_hash, dh.media_item_id, dh.user_id AS registered_by_user_id` |
| `hash_algo` column | `ADD COLUMN IF NOT EXISTS hash_algo text NOT NULL DEFAULT 'photo_v1'` |

RLS on `dedup_hashes`:

```sql
CREATE POLICY "Org members read dedup hashes" FOR SELECT USING (organization_id = public.user_org_id());
CREATE POLICY "Users insert org dedup hashes" FOR INSERT WITH CHECK (
  auth.uid() = user_id AND organization_id = public.user_org_id()
);
```

The client computes `organization_id` by **string-parsing its own storage path** (`organizationIdFromStoragePath` at `core/upload/support/upload-db-postwrite.util.ts:19-25`, called from `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:242`). That is untrusted input, but the `WITH CHECK` rejects any value other than the caller's real org. **Correct defence in depth.**

No `UPDATE` or `DELETE` policy exists on `dedup_hashes` after the migration drops `"Users manage own hashes"` — with RLS enabled that means both are denied. **Fail-closed, correct.**

**Resolves `03-branch-matrix.md` D8 and D9 statically.** The runtime half stays `unverified` (§ preamble).

---

## 4. `resolve_media_location` — overload and usage (plan § 4 Phase 8.3)

The canonical signature is 10 parameters (`…/20260526140000_resolve_media_location_enrich_primary_link.sql:72-83`): `p_media_item_id, p_latitude, p_longitude, p_address_label, p_city, p_district, p_street, p_country, p_location_status, p_postcode`, all but the first defaulting to `NULL`. The ambiguous 9-arg overload was dropped by `…/20260525210000_drop_resolve_media_location_nine_arg_overload.sql:12-22`, with the execute grant re-asserted on the 10-arg form.

All five upload call sites use **named parameters** and pass a subset:

| Call site | Parameters passed |
| --- | --- |
| `core/upload/address-resolution/upload-address-resolve.util.ts:27-36` | `p_media_item_id, p_latitude, p_longitude, p_address_label, p_city, p_district, p_street, p_country` |
| `core/upload/address-resolution/upload-address-resolve.util.ts:66-69` | `p_media_item_id, p_location_status` |
| `core/upload/support/upload-enrichment.service.ts:65-73` | same eight as the first |
| `core/upload/support/upload-enrichment.service.ts:113-116` | `p_media_item_id, p_location_status` |
| `core/upload/manager/upload-manager-missing-data.service.ts:31-…` | `p_media_item_id, p_latitude, p_longitude` |

**No site passes `p_postcode`.** With the 9-arg overload gone and every other parameter defaulted, PostgREST resolves all five unambiguously. **Verdict: usage matches the surviving overload.** ✓

The function's own guard is correct:

```sql
-- 20260526140000_resolve_media_location_enrich_primary_link.sql:96-104
SELECT organization_id, id INTO _org_id, _media_id FROM public.media_items m
 WHERE m.organization_id = public.user_org_id()
   AND (m.id = p_media_item_id OR m.source_image_id = p_media_item_id) LIMIT 1;
IF _org_id IS NULL THEN RAISE EXCEPTION 'User profile or organization not found'; END IF;
```

`SECURITY DEFINER` with a server-derived org check — the right pattern.

### Dropped columns are no longer written ✓

`…/20260525130000_drop_media_items_location_columns.sql:379-386` dropped `geog, latitude, longitude, address_label, street, city, district, country` from `media_items`. Every upload write payload was inspected:

- insert — `core/upload/support/upload-file-persist.util.ts:175-191`: `organization_id, created_by, media_type, mime_type, storage_path, original_filename, relative_path, file_size_bytes, captured_at, exif_latitude, exif_longitude, exif_raw, location_status, gps_assignment_allowed, address_notes`. **None dropped.**
- replace — `core/upload/pipelines/replace/upload-replace-update-data.util.ts:8-24`: `storage_path, thumbnail_path, original_filename, exif_latitude, exif_longitude, captured_at, direction`. **None dropped.**
- attach — `core/upload/pipelines/attach/upload-attach-update-data.util.ts:19-34`: same set, with an explicit comment at `:36` ("Resolved GPS/address is written via `resolve_media_location` → locations + links (not `media_items`)"). **None dropped.**

The many `latitude:` / `city:` / `street:` occurrences elsewhere in the subsystem are on `locations` DTOs and Search Object shapes, not on `media_items` payloads. **Verdict: clean.** ✓

---

## 5. 🔴 Cross-tenant read via `find_photoless_conflicts` (plan § 4 Phase 8 — "anything exploitable goes at the top")

```sql
-- supabase/migrations/20260526200000_fix_find_photoless_conflicts_locations_join.sql:13-18,28-29,54
CREATE OR REPLACE FUNCTION public.find_photoless_conflicts(
  p_org_id uuid, p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL, p_address text DEFAULT NULL)
RETURNS TABLE(id uuid, address_label text, latitude double precision,
              longitude double precision, distance_m double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$ … WHERE m.organization_id = p_org_id … $$;
-- :99-102
REVOKE ALL ON FUNCTION public.find_photoless_conflicts(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_photoless_conflicts(...) TO authenticated;
```

**The function is `SECURITY DEFINER`, granted to every authenticated user, and filters on a caller-supplied `p_org_id` that it never compares to `public.user_org_id()`.** RLS is bypassed by `SECURITY DEFINER`, so the parameter *is* the only tenant boundary.

The client passes its own org (`core/upload/support/upload-conflict.service.ts:54-59`, `p_org_id: profile.organization_id`), but `supabase/AGENTS.md` states plainly that **the frontend is untrusted** — a scripted client can pass anything.

**What an attacker gets per call:** one row — a `media_items` UUID, its `address_label`, its exact `latitude`/`longitude`, and a distance — for a photoless photo row in the target organisation.

**Preconditions, stated honestly:**
1. A valid target `organization_id` UUID. It is not enumerable, but it is **the first path segment of every storage key** (`{org_id}/{user_id}/{uuid}.ext`, `supabase/AGENTS.md` § Storage), so it appears in signed URLs and in any exported or shared file reference.
2. Either coordinates within 50 m of the target row (`ST_DWithin(..., 50)`) or an exact case-insensitive `address_label` match.
3. `LIMIT 1` — one row per call, so bulk extraction requires many queries; but coordinates can be swept.

**Why this is the only outlier.** Every other RPC on the upload path derives the tenant server-side: `check_dedup_hashes` (`…20260611120000:…` `dh.organization_id = public.user_org_id()`), `resolve_media_location` (§ 4), `get_location_by_address_components` (`…/20260526180000_…sql:25` — `v_org := public.user_org_id()`), `find_or_create_location` and `link_media_to_location` (`…/20260524120000_locations_nn_junction.sql:235,271`), `list_project_locations` (`SECURITY INVOKER`, `…/20260527140000_project_locations.sql:65,85-86`). **`find_photoless_conflicts` is the sole function in this path that takes the org as an argument** — and it has been that way since it was introduced (`…/20260411103000_align_photoless_contract_and_conflict_rpc.sql`, no `user_org_id` reference), through two rewrites.

| Field | Value |
| --- | --- |
| Severity | **blocker** (security/RLS gap, plan § 5) |
| Effort | **S** — add `AND m.organization_id = public.user_org_id()` to the `photoless` CTE, or drop `p_org_id` entirely and derive it; the client already has no reason to pass it |
| Verified | the migration text, the grant, and the absence of any guard |
| **`unverified`** | that the hosted database has this exact definition, and that no later hosted-only change added a guard. **Check needed:** `supabase migration list` plus `\df+ public.find_photoless_conflicts` against the linked project. |

---

## 6. Storage path construction and tenant isolation (plan § 4 Phase 8.4)

```ts
// apps/web/src/app/core/upload/support/upload-file-persist.util.ts:82-84
const uuid = crypto.randomUUID();
const ext = (input.file.name.split('.').pop() ?? 'jpg').toLowerCase();
const storagePath = `${orgId}/${user.id}/${uuid}.${ext}`;
```

The server-side policy is the real boundary and it is correct:

```sql
-- supabase/migrations/20260327121000_storage_media_bucket_init.sql:66-77
create policy "media: org members can upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = public.user_org_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
  and not public.is_viewer()
);
```

Read is org-scoped (`:79-87`), delete is owner-or-admin within the org (`:89-101`), there is **no UPDATE policy** (so overwrite is denied, matching the client's `upsert: false` at `upload-file-persist.util.ts:127`), and viewers cannot upload.

### Correction to `02-happy-path.md` F9

Phase 2 flagged the unsanitised `ext` as a possible path-injection vector. Having now read the policy, the assessment must be narrowed:

- A crafted extension containing `/` (e.g. `photo.jpg/../../x`) yields `foldername = {orgId, userId, "uuid.jpg", "..", ".."}`. Elements `[1]` and `[2]` are still the attacker's **own** org and user, so the policy **passes** — but the object still lands inside the attacker's own prefix. **No cross-tenant write is possible.**
- The residual issue is a malformed key (`..` segments, control characters, unbounded length) inside the caller's own namespace, which can confuse later path parsing — notably `organizationIdFromStoragePath` (`core/upload/support/upload-db-postwrite.util.ts:19-25`), which takes the first `/` segment, and the `[1]`/`[2]` indices above.
- Whether Supabase Storage normalises or rejects such keys server-side is **`unverified`**. **Check needed:** POST a crafted object key to the storage API against a live project.

**Revised severity: `low`** (was implied higher in Phase 2), effort `S` — sanitise `ext` to `[a-z0-9]{1,10}`. Filed as a hardening item, not a vulnerability.

---

## 7. Client validation mirrored server-side (plan § 4 Phase 8.5) — **it is**

| Guard | Client | Server | Match |
| --- | --- | --- | --- |
| Max size | `MAX_FILE_SIZE = 25 * 1024 * 1024` = 26,214,400 (`core/upload/support/upload-file-types.ts:2`), enforced at `core/upload/support/upload.service.util.ts:69-75` | `file_size_limit = 26214400` (`…/20260327121000_storage_media_bucket_init.sql:20`) | **exact** |
| MIME allowlist | 22 types (`upload-file-types.ts:5-28`), enforced at `upload.service.util.ts:77-83` | 23 types (`…20260327121000…:22-49`) | **superset** — the bucket additionally allows `image/tiff`; **every client-allowed type is server-allowed, and nothing the client rejects is server-only** |
| Role | none client-side | `and not public.is_viewer()` on both the storage insert policy and `"media_items: own insert"` | **server-only, correct** |
| Tenant | client sends `organization_id` read from its own `profiles` row | `WITH CHECK (organization_id = (select public.user_org_id()))` (`…/20260620100200_rls_initplan_perf_wrap.sql:22-29`) | **server-verified** |
| Ownership | client sends `created_by: user.id` | `WITH CHECK (created_by = (select auth.uid()))` | **server-verified** |

**Verdict: client-side validation is a UX convenience, not the boundary, and the boundary exists.** This is the correct posture per `docs/security-boundaries.md`. Two notes:

- `image/tiff` in the bucket with no client counterpart is a **dead allowance** — `resolveUploadMimeType` (`upload.service.util.ts:11-66`) has no `.tif`/`.tiff` case, so the client can never produce it. Harmless; worth removing for tidiness. `low`.
- Conversely, `'application/csv'` is in the client allow-set (`upload-file-types.ts:27`) and in the bucket, but the client's extension fallback maps `.csv` → `text/csv`, so `application/csv` is only reachable when the browser reports it directly. `low`.

---

## 8. `npm run supabase:smoke` (plan § 4 Phase 8.6)

Runs and exits 0 (`00-baseline.md` § 5), but both scripts parse migration text:

- `scripts/validate-supabase-rpc-media-type.mjs` → resolves `find_photoless_conflicts` and `idx_media_items_photoless_lookup` to `…/20260526200000_fix_find_photoless_conflicts_locations_join.sql`, asserting the index predicate `media_type = 'photo' AND storage_path IS NULL`. **Note that this is the same migration that carries the § 5 gap — the smoke test asserts the media-type contract and says nothing about tenancy.**
- `scripts/validate-supabase-storage-cleanup-api-mode.mjs` → resolves `cleanup_orphaned_storage_objects` / `run_storage_cleanup_job` to `…/20260318144000_storage_cleanup_runner_api_only.sql`.

A green result proves the committed migrations are internally consistent. It proves nothing about the hosted schema. **`unverified` stands.**

The existence of `cleanup_orphaned_storage_objects` is relevant to `07-failure-modes.md` F1.1: the orphaned objects the client leaves behind are **eventually collectable by a server-side job**. That reduces the long-run data footprint; it does not make the client behaviour correct, and it does not help the mirror-image case (F1.2–F1.4: a row whose object was deleted), for which no equivalent reconciler was found.

---

## 9. Findings summary

| ID | Severity | Effort | Finding | Evidence |
| --- | --- | --- | --- | --- |
| S1 | **blocker** | S | `find_photoless_conflicts` is `SECURITY DEFINER`, granted to `authenticated`, and trusts a caller-supplied `p_org_id` — cross-tenant read of photoless media coordinates and address labels | `supabase/migrations/20260526200000_fix_find_photoless_conflicts_locations_join.sql:13-18,28,54,99-102`; caller `apps/web/src/app/core/upload/support/upload-conflict.service.ts:54-59` |
| S2 | high | S | Orphaned storage object on DB-insert failure (carried from `07-failure-modes.md` F1.1) — a server-side reconciler exists but the client leaves the residue and the spec ticks the opposite | `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:198-200`; `docs/specs/service/media-upload-service/upload-manager.md:277` |
| S3 | high | M | Three cancel paths delete the storage object and keep the `media_items` row, un-awaited; **no reconciler was found for this direction** | `06-health.md` § 1.1 |
| S4 | low | S | Unsanitised, user-controlled path extension — cannot cross tenants (§ 6) but can produce malformed keys inside the caller's own prefix | `core/upload/support/upload-file-persist.util.ts:83-84` |
| S5 | low | S | `image/tiff` allowed by the bucket with no client path; `application/csv` allowed on both sides but unreachable via the extension fallback | `…20260327121000…:27`; `core/upload/support/upload-file-types.ts:27` |
| S6 | info | — | Dedup org scoping, `resolve_media_location` usage, dropped-column hygiene, storage tenant policies and client/server validation mirroring are all **verified correct** | §§ 3, 4, 6, 7 |

---

## 10. Not verified in this phase

| Claim not made | Check needed |
| --- | --- |
| That the hosted schema matches the committed migrations | `supabase migration list` — Local and Remote equal on every row (`supabase/AGENTS.md`) |
| That S1 is exploitable against the live project | Call `find_photoless_conflicts` with a foreign `p_org_id` as an authenticated user of another org |
| That RLS is actually **enabled** on `media_items`, `dedup_hashes`, `locations` in the hosted DB | `SELECT relrowsecurity FROM pg_class WHERE relname IN (...)` |
| That the `images` legacy bucket's read policies are equally org-scoped | `core/upload/upload.service.ts:76,97` fall back to it for reads; its policies were not audited here — **check `supabase/migrations/20260304000001_storage_images.sql` and `…/20260317114000_mixed_media_storage_policy.sql`** |
| Whether Supabase Storage normalises `..` in object keys (§ 6) | POST a crafted key to the storage API |
| That no *other* upload-adjacent RPC has S1's shape | Only the six RPCs the upload path calls were audited; `validate-*-rls.sql` scripts referenced by root `AGENTS.md` § Change Classification were not run (they need a database) |
| DSGVO/retention implications of `exif_raw` (the full EXIF blob is persisted at `upload-file-persist.util.ts:187`) | `scripts/validate-dsgvo-security.sql` against a live database; out of scope for this plan but worth naming |
