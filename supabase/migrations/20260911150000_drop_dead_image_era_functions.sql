-- Drop six dead functions. Each is unreachable, and four of them raise on
-- every call because they reference media_items location columns that
-- 20260525130000 dropped (latitude, longitude, address_label, street, city,
-- district, country, geog).
--
-- CREATE OR REPLACE FUNCTION does not plan a plpgsql body, so dropping a
-- column the body references fails nothing at migration time. The breakage
-- only shows on execution -- and since nothing executes these, nothing ever
-- showed. They have been broken since 2026-05-25.
--
-- Measured on a live PostgreSQL 16 + PostGIS instance with the full chain
-- applied (scripts/local-verify/):
--
--   sync_media_items_from_primary_location -> column "street" of relation "media_items" does not exist
--   resolve_image_location                 -> column m.latitude does not exist
--   bulk_update_image_addresses            -> column "address_label" of relation "media_items" does not exist
--   get_unresolved_images                  -> column m.latitude does not exist
--
-- Reachability, checked rather than assumed:
--   * Zero frontend call sites for all four
--     (grep -rn "'<fn>'" apps/web/src --include=*.ts, excluding specs).
--   * No live trigger invokes any of them. 20260524120000:206-207 dropped
--     trg_media_item_locations_sync_projection and
--     trg_media_item_locations_promote_primary during the n:n locations
--     refactor, leaving their two trigger functions behind with nothing to
--     fire them. Those two are the only remaining callers of
--     sync_media_items_from_primary_location, and they go here too, so the
--     dependency graph closes.
--   * No policy or view references any of them.
--
-- Their media_* successors are live and unaffected: resolve_media_location,
-- bulk_update_media_addresses and get_unresolved_media all execute fine.
-- cluster_images is also kept -- it still has a frontend call site as the
-- fallback from cluster_media.
--
-- 20260911140000 already revoked every client-facing grant on three of these,
-- so this removes dead schema rather than closing exposure.
-- @see GitHub issue #202

DROP FUNCTION IF EXISTS public.media_item_locations_sync_projection();
DROP FUNCTION IF EXISTS public.media_item_locations_promote_primary_on_delete();
DROP FUNCTION IF EXISTS public.sync_media_items_from_primary_location(uuid);
DROP FUNCTION IF EXISTS public.resolve_image_location(uuid, numeric, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.bulk_update_image_addresses(uuid[], text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_unresolved_images(integer);
