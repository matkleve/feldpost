# Smoke Tests: Media Migration Verification

**Date:** 2026-03-27  
**Scope:** Post-`public.images` drop verification  
**Prerequisites:** Dev server running (`ng serve`), Supabase local/remote connected

---

## Test 1: Map Cluster Rendering (`viewport_markers()` RPC)

**What to Test:** Cluster geometry and image_id fallback through `COALESCE(source_image_id, id)`.

**Prerequisites:**

- Navigate to `/` (Map Page)
- Ensure viewport has ≥2 nearby images (zoom to area with media_items)

**Steps:**

1. Open browser DevTools → Network tab
2. Pan/zoom map to trigger viewport query
3. Inspect the XHR request to `viewport_markers()` RPC
4. Verify response contains:
   - `cluster_center_lat`, `cluster_center_lng` (valid coordinates)
   - `grid_cell` (string, e.g., `"cell_0_0"`)
   - `count` ≥ 1
   - `image_id` (not NULL — should be from `COALESCE(source_image_id, id)`)

**Expected Outcome:**

- ✅ Clusters render on map with count badges
- ✅ Cluster positions are stable on pan/zoom
- ✅ Click cluster → expands to individual markers (no errors in console)

**Manual Verification:**

```sql
-- In supabase console, verify RPC works:
SELECT * FROM viewport_markers(-90, -180, 90, 180, 16);
-- Should return non-empty result with valid image_id, grid_cell, count
```

---

## Test 2: Address Resolution (`resolve_image_location()` RPC)

**What to Test:** Location updates via RPC and persistence to `media_items` table.

**Prerequisites:**

- At least one image with `location_unresolved = TRUE`
- Or manually update an image: `UPDATE media_items SET latitude = 0, longitude = 0, address_label = NULL WHERE id = '<known-id>' LIMIT 1;`

**Steps:**

1. Open image detail view (click marker → right pane)
2. If missing address, click "Resolve Location" (if UI button exists) OR test via RPC:
   ```sql
   -- In supabase console:
   SELECT * FROM resolve_image_location('<image-id-uuid>', 50.1234, 10.5678, 'Test Address, City');
   -- Should return: TRUE if successful
   ```
3. Verify in detail view or direct DB query:
   ```sql
   SELECT id, latitude, longitude, address_label FROM media_items WHERE id = '<image-id-uuid>';
   ```
4. Check: `latitude`, `longitude`, `address_label` are all updated

**Expected Outcome:**

- ✅ Address field updates without error
- ✅ Map marker re-renders at new position
- ✅ `geog` column auto-computed correctly (trigger fires)
- ✅ No errors in backend logs or console

---

## Test 3: Share Set Creation (`create_or_reuse_share_set()` RPC)

**What to Test:** Share-set token generation and media_item reference integrity.

**Prerequisites:**

- Select 1-3 images in the workspace
- Access the "Share" or "Export" UI (usually list workspace selection menu)

**Steps:**

1. In workspace selection, right‑click → "Share" OR click share button
2. Generate share link (triggers `create_or_reuse_share_set()`)
3. Verify in supabase console:

   ```sql
   SELECT * FROM share_sets ORDER BY created_at DESC LIMIT 1;
   -- Should have: id, share_token, created_at, expires_at (if TTL set)

   SELECT * FROM share_set_items
   WHERE share_set_id = '<share_set_id>'
   LIMIT 10;
   -- Should have: image_id (referencing media_items)
   ```

4. Click share link → verify view loads images correctly

**Expected Outcome:**

- ✅ Share token generated without error
- ✅ Share link opens and displays selected images
- ✅ Images load via media bucket with fallback (check browser dev tools → Network)
- ✅ No 403/404 errors on image load

---

## Test 4: Photo Signing & Load (`photo-load.service.getSignedUrl()`)

**What to Test:** Dual-read storage pattern (media → images fallback).

**Prerequisites:**

- Dev tools → Network tab **filter by `blob` or `/storage/`**
- At least 1 image visible on map

**Steps:**

1. Open map with media visible (triggers `photoad.getSignedUrl()` for thumbnails)
2. Observe Network tab:
   - Look for requests to `/storage/...` URLs
   - Note: If bucket is `media`, request should be `/storage/buckets/media/...`
   - If media-signed-URL fails, fallback should be `/storage/buckets/images/...`
3. Verify thumbnail loads (no broken image icon)
4. Open detail view of an image (triggers full-resolution signing)
5. Verify console for any error logs from `PhotoLoadService`

**Check in Code:**

- Open DevTools Console
- Run: `window.JSON.stringify(await fetch('/auth/v1/token?grant_type=refresh_token').json())`
- Verify auth is valid (no 401)

**Verify Service Cache:**

```typescript
// In browser console (if service is injectable):
// This is manual verification only — ignore if not accessible
// Services are internal, not exposed to console
```

**Expected Outcome:**

- ✅ Thumbnails load from `media` bucket
- ✅ No persistent 404 or 403 errors for fallback images
- ✅ Detail view image loads with signed URL
- ✅ Photo-loading cycle completes (loading → loaded, no errors)

---

## Test 5: Legacy Image ID Fallback (Optional Deep Dive)

**What to Test:** `COALESCE(source_image_id, id)` pattern in RLS policies and RPC functions.

**Prerequisites:**

- Access to supabase SQL console
- Knowledge of a media_item with `source_image_id` set

**Steps:**

1. Find a media_item with legacy source_image_id:
   ```sql
   SELECT id, source_image_id FROM media_items
   WHERE source_image_id IS NOT NULL
   LIMIT 1;
   ```
2. Query using legacy image_id:
   ```sql
   SELECT * FROM media_items
   WHERE id = '<the-source_image_id-value>';
   -- Should return the media_item (not NULL)
   ```
3. Test RPC that uses fallback:
   ```sql
   SELECT * FROM bulk_update_image_addresses(
     ARRAY['<source_image_id>', '<another_legacy_id>'],  -- legacy IDs
     ARRAY['New Address 1', 'New Address 2']
   );
   -- Should update both legacy and native media_items
   ```

**Expected Outcome:**

- ✅ Legacy IDs are resolved correctly via `source_image_id` lookup
- ✅ Updates work for both new (native) and old (backfilled) records
- ✅ RLS policies don't block access to legacy-linked records

---

## Failure Triage

| Symptom                                                            | Root Cause                                                             | Resolution                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Clusters don't render / count is 0                                 | `viewport_markers()` not returning rows                                | Check query filters (zoom level, bbox), verify PostGIS extension is enabled                      |
| Address update fails (RPC returns error)                           | `resolve_image_location()` has NULL parameter or invalid media_item_id | Verify UUID format, ensure media_item exists, check RLS policy allows UPDATE                     |
| Share link 404                                                     | `share_set_items` not creating or image missing from storage           | Verify `create_or_reuse_share_set()` succeeded, check storage bucket permissions                 |
| Photo shows broken icon                                            | `PhotoLoadService` signing failed OR fallback bucket has no image      | Check Supabase Storage policies for `media` and `images` buckets; verify `storage_path` is valid |
| Console error: "policy coordinate_corrections depends on image_id" | Phase-4 column drop attempted (should be deferred)                     | Do NOT drop `image_id` columns yet; RLS policies use them for fallback                           |

---

## Approval Checklist

- [ ] **Test 1:** Clusters render on map (≥1 test image set at different zoom levels)
- [ ] **Test 2:** Address resolution updates location + geog trigger fires
- [ ] **Test 3:** Share token creates successfully and link loads images
- [ ] **Test 4:** Photos load from `media` bucket without persistent errors
- [ ] **Test 5 (optional):** Legacy image_id fallback works in policies + RPC

**Once All Passed:**

- [ ] Proceed with Phase-4 Column Drops (if decided)
- [ ] Update this playbook with final pass timestamp
- [ ] Archive testing notes for compliance

---

## Testing Timestamp

**Started:** [Date/Time]  
**Completed:** [Date/Time]  
**Tester:** [Name]  
**Notes:** [Any deviations or edge cases]
