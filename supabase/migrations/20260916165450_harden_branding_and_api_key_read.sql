-- =============================================================================
-- Security hardening (STUDY-010 F-04, F-05)
-- =============================================================================
-- F-04: stop accepting SVG logos in the public org-branding bucket (stored-XSS
--       surface if any consumer inlines the file). PNG/JPEG/WebP remain.
-- F-05: stop listing org_api_keys to every org member; require
--       org.api_keys.manage (the existing FOR ALL manage policy already covers
--       SELECT/INSERT/UPDATE/DELETE for holders of that permission).
-- @see docs/study/010-defensive-security-review.md
-- =============================================================================

-- F-04 — mime allowlist (bucket stays public for hotlinkable raster logos)
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'org-branding';

-- F-05 — drop the broad org-wide SELECT; manage policy retains access
drop policy if exists "org_api_keys: org read" on public.org_api_keys;
