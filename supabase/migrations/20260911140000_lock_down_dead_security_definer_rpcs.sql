-- Close the client-facing grant on three SECURITY DEFINER functions that are
-- dead code: nothing can call them successfully, and nothing tries.
--
-- Found by applying the full migration chain to a real PostgreSQL 16 + PostGIS
-- instance and exercising the functions, which static analysis could not do.
-- 20260911130000 (#201) granted two of them to `authenticated` on the
-- assumption they were live RPCs. They are not:
--
--   * sync_media_items_from_primary_location(uuid)
--     Orphaned. 20260522120000 created it together with two triggers, but
--     20260524120000:206-207 dropped both (trg_media_item_locations_sync_projection,
--     trg_media_item_locations_promote_primary) during the n:n locations
--     refactor. The two trigger *functions* that call it survive but are
--     themselves unreachable. The note in 20260911130000 saying authenticated
--     must keep EXECUTE "so those triggers keep firing" is therefore wrong --
--     there are no such triggers. Correcting the record here rather than
--     editing an applied migration.
--
--   * resolve_image_location(uuid, numeric, numeric, text, text, text, text, text)
--   * bulk_update_image_addresses(uuid[], text, text, text, text, text)
--     Legacy image-era functions, superseded by their media_* equivalents.
--     Zero frontend call sites.
--
-- All three write media_items.street / address_label / latitude / longitude /
-- city / district / country, which 20260525130000 dropped. Measured on a live
-- instance, each raises as soon as it reaches its UPDATE:
--   sync_media_items_from_primary_location -> column "street" of relation "media_items" does not exist
--   resolve_image_location                 -> column m.latitude does not exist
--   bulk_update_image_addresses            -> column "address_label" of relation "media_items" does not exist
-- So no caller can be relying on working behaviour: every real call already
-- fails. Revoking cannot regress anything that currently succeeds.
--
-- Scope note: this closes the grant only. Actually dropping the dead functions
-- (and the two orphaned trigger functions) is tracked separately -- removing
-- schema objects deserves its own change rather than riding along with a
-- security fix.

REVOKE ALL ON FUNCTION public.sync_media_items_from_primary_location(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.resolve_image_location(uuid, numeric, numeric, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.bulk_update_image_addresses(uuid[], text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
