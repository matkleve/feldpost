-- Close the anon-execute gap identified in GitHub issue #201 across every
-- remaining callable (non-trigger) SECURITY DEFINER function.
--
-- Background: 20260911120000 fixed the two RPCs found live-testing (#193).
-- This migration is the systematic follow-up: every SECURITY DEFINER
-- function in the schema that is not a trigger target was enumerated by
-- static analysis of the current migration history (latest CREATE OR
-- REPLACE per function name) and classified for anon/authenticated
-- reachability. Supabase grants every new function's EXECUTE privilege to
-- `anon` (and `authenticated`) automatically at CREATE time, as its own
-- explicit per-role grant -- independent of the PUBLIC pseudo-role, and NOT
-- removed by `REVOKE ALL ... FROM PUBLIC` alone. Every function below used
-- exactly that REVOKE-FROM-PUBLIC-only pattern (or no REVOKE at all), so
-- every one of them is currently callable by an anonymous caller.
--
-- Three functions get a stronger fix than a plain anon revoke; see the
-- dedicated sections below:
--   * public.list_orphaned_storage_paths, cleanup_orphaned_storage_objects,
--     run_storage_cleanup_job were intended service_role-only (ops
--     scripts), but were never revoked from `authenticated` either -- so
--     any signed-in user could currently call them, and
--     list_orphaned_storage_paths leaks every org's orphaned storage
--     object paths with no org filter at all (cross-tenant enumeration).
--   * public.seed_org_default_roles has no auth check of any kind. It is
--     only ever invoked internally (PERFORM, from the SECURITY DEFINER
--     handle_new_user trigger and a one-time backfill DO block), so it is
--     locked down entirely: no client-facing role should call it directly.
--   * public.sync_media_items_from_primary_location has no org-scoping
--     check. Unlike the two above, it IS reached by ordinary authenticated
--     traffic (the two trigger functions that call it are SECURITY
--     INVOKER, so authenticated must keep EXECUTE for those triggers to
--     keep working) -- so the fix here is an anon-only revoke *plus* an
--     org check added to the function body itself, closing the
--     authenticated-cross-org write vector that a plain grant fix cannot.
--
-- Explicitly NOT touched, with reasons:
--   * public.resolve_share_set -- deliberately public (explicit
--     `GRANT ... TO anon`, documented in docs/security-boundaries.md).
--   * public.find_photoless_conflicts, public.retire_dedup_hashes_for_media_item
--     -- already fixed in 20260911120000 (#193).
--   * public.user_org_id, public.has_permission, public.is_admin,
--     public.is_viewer, public.can_access_chat_channel,
--     public.is_chat_channel_member, public.can_self_join_chat_channel,
--     public.can_create_qr_invites -- referenced directly inside RLS
--     policy USING/WITH CHECK clauses (grep-verified against every
--     CREATE POLICY in supabase/migrations/). Revoking anon EXECUTE on a
--     function a policy calls does not merely deny data: Postgres raises
--     "permission denied for function" for the whole query, breaking RLS
--     evaluation itself for any anon-role query against tables whose
--     policies reference them. Every one of these already fails closed for
--     an unauthenticated caller (auth.uid() is null, so they return
--     false/null), so leaving them anon-executable adds no risk and is
--     required for RLS to keep functioning.
--   * Every trigger-only function (RETURNS trigger) and every non-
--     SECURITY-DEFINER function -- out of scope for #201 (trigger
--     functions are not directly callable via PostgREST in a way that
--     bypasses RLS the way a callable SECURITY DEFINER RPC does; non-
--     SECURITY-DEFINER functions run with the caller's own privileges, so
--     normal RLS already applies to anything they touch).
--
-- Fix: add anon (and, for the three exceptions above, authenticated too)
-- to the REVOKE. Idempotent (REVOKE/GRANT are safe to re-run).
-- @see GitHub issue #201

-- =============================================================================
-- 1) Standard fix: authenticated-only RPCs. Revoke anon, keep authenticated.
-- =============================================================================

REVOKE ALL ON FUNCTION public.add_media_item_location(uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_media_item_location(uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.assign_org_member_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_org_member_role(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.bulk_update_image_addresses(uuid[], text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_image_addresses(uuid[], text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.bulk_update_media_addresses(uuid[], text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_media_addresses(uuid[], text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.check_dedup_hashes(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_dedup_hashes(text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.cluster_images(numeric, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cluster_images(numeric, numeric, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.cluster_images_multi(jsonb, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cluster_images_multi(jsonb, int) TO authenticated;

REVOKE ALL ON FUNCTION public.count_zoomable_locations_for_media(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_zoomable_locations_for_media(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_or_reuse_share_set(uuid[], timestamptz, public.share_link_audience, public.share_link_grant, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_or_reuse_share_set(uuid[], timestamptz, public.share_link_audience, public.share_link_grant, uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_media_item_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_media_item_location(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

REVOKE ALL ON FUNCTION public.find_or_create_dm_channel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_dm_channel(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.find_or_create_location(text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_location(text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_chat_unread_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_counts(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_location_by_address_components(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_location_by_address_components(text, text, text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_media_clusters(uuid, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_media_clusters(uuid, double precision) TO authenticated;

REVOKE ALL ON FUNCTION public.get_unresolved_images(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unresolved_images(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_unresolved_media(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unresolved_media(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.invite_chat_channel_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_chat_channel_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.link_media_to_location(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_media_to_location(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.list_locations_for_media(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_locations_for_media(uuid, integer, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.list_media_item_locations(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_media_item_locations(uuid, integer, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.remove_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_org_member(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_image_location(uuid, numeric, numeric, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_image_location(uuid, numeric, numeric, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_media_location(uuid, numeric, numeric, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_media_location(uuid, numeric, numeric, text, text, text, text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.search_locations(text, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.set_primary_media_item_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_primary_media_item_location(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.suspend_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suspend_org_member(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.unlink_media_from_location(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlink_media_from_location(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.unsuspend_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unsuspend_org_member(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.update_media_item_location(uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_media_item_location(uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.validate_media_membership_rules(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_media_membership_rules(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.viewport_markers(numeric, numeric, numeric, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.viewport_markers(numeric, numeric, numeric, numeric, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.user_role_level() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_role_level() TO authenticated;

REVOKE ALL ON FUNCTION public.target_user_role_level(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.target_user_role_level(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_manage_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_user(uuid) TO authenticated;

-- =============================================================================
-- 2) process_org_export_job: standard grant fix, plus a narrow logic
--    hardening. Its org-ownership check used `<>`, which is NULL for an
--    anon caller (public.user_org_id() is null), so `IF NULL THEN` is
--    never taken and the check silently no-ops instead of raising. The
--    function was still safe in practice only because the *next* line
--    (has_permission('org.export'), which checks auth.uid() = ur.user_id)
--    independently fails closed for anon. Switching to IS DISTINCT FROM
--    makes the intended check actually fire for a null org id, instead of
--    relying on a second, unrelated check to save it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_org_export_job(p_job_id uuid)
RETURNS public.org_export_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.org_export_jobs;
BEGIN
  SELECT * INTO v_job
  FROM public.org_export_jobs
  WHERE id = p_job_id;

  IF v_job.id IS NULL OR v_job.organization_id IS DISTINCT FROM public.user_org_id() THEN
    RAISE EXCEPTION 'Export job not found';
  END IF;

  IF NOT public.has_permission('org.export') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.org_export_jobs
  SET
    status = 'completed',
    completed_at = now(),
    payload = jsonb_build_object(
      'exportedAt', now(),
      'organization', (
        SELECT to_jsonb(o)
        FROM public.organizations o
        WHERE o.id = v_job.organization_id
      ),
      'projects', coalesce(
        (
          SELECT jsonb_agg(to_jsonb(p) ORDER BY p.name)
          FROM public.projects p
          WHERE p.organization_id = v_job.organization_id
        ),
        '[]'::jsonb
      ),
      'members', coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', pr.id,
              'fullName', pr.full_name,
              'suspendedAt', pr.suspended_at,
              'removedAt', pr.removed_at
            )
            ORDER BY pr.full_name
          )
          FROM public.profiles pr
          WHERE pr.organization_id = v_job.organization_id
        ),
        '[]'::jsonb
      ),
      -- to_jsonb(m) is resilient to the media_items schema (location columns and
      -- primary_project_id were dropped in earlier migrations). Storage paths are
      -- stripped so the export never leaks bucket object references.
      'mediaItems', coalesce(
        (
          SELECT jsonb_agg(
            (to_jsonb(m) - 'storage_path' - 'thumbnail_path')
            ORDER BY m.created_at
          )
          FROM public.media_items m
          WHERE m.organization_id = v_job.organization_id
        ),
        '[]'::jsonb
      )
    )
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.process_org_export_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_org_export_job(uuid) TO authenticated;

-- =============================================================================
-- 3) sync_media_items_from_primary_location: anon-only revoke (authenticated
--    must keep EXECUTE -- the two triggers that call it,
--    media_item_locations_promote_primary_on_delete and
--    media_item_locations_sync_projection, are SECURITY INVOKER, so they
--    run as the original authenticated caller and need EXECUTE on this
--    function to keep firing). That alone isn't sufficient: called
--    directly as an RPC (bypassing the trigger path, and with it RLS
--    entirely, since this function is SECURITY DEFINER), any authenticated
--    user could target any org's media_item_id. Add an explicit org check
--    to the UPDATE so a cross-org call now matches zero rows instead of
--    writing, matching the fail-closed pattern used elsewhere
--    (find_photoless_conflicts, process_org_export_job). No behavior
--    change for the legitimate trigger-driven path: those always operate
--    on the acting user's own org via RLS-gated DML on
--    media_item_locations, so m.organization_id = user_org_id() already
--    holds there.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_media_items_from_primary_location(p_media_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loc public.media_item_locations%ROWTYPE;
BEGIN
  SELECT *
    INTO v_loc
    FROM public.media_item_locations l
   WHERE l.media_item_id = p_media_item_id
     AND l.is_primary = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.media_items m
     SET street        = v_loc.street,
         city          = v_loc.city,
         district      = v_loc.district,
         country       = v_loc.country,
         latitude      = v_loc.latitude,
         longitude     = v_loc.longitude,
         address_label = v_loc.address_label,
         location_status = CASE
           WHEN v_loc.latitude IS NOT NULL AND v_loc.longitude IS NOT NULL THEN 'resolved'
           WHEN v_loc.address_label IS NOT NULL OR v_loc.street IS NOT NULL THEN 'resolved'
           ELSE m.location_status
         END,
         updated_at    = now()
   WHERE m.id = p_media_item_id
     AND m.organization_id = public.user_org_id();
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_media_items_from_primary_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_media_items_from_primary_location(uuid) TO authenticated;

-- =============================================================================
-- 4) seed_org_default_roles: no auth check of any kind (only an idempotency
--    guard -- "if this org already has roles, no-op"). Grep-verified it has
--    exactly two callers, both internal PERFORM calls from SECURITY
--    DEFINER context (handle_new_user's own `security definer`, and a
--    one-time backfill DO block that runs as the migration-applying
--    role) -- never called from application code
--    (grep -r seed_org_default_roles apps/ -> no matches). A nested call
--    from inside a SECURITY DEFINER function executes as that function's
--    owner, so revoking every client-facing role here does not affect
--    either existing caller. No role should ever call this directly, so
--    unlike the functions above there is no GRANT ... TO authenticated at
--    the end of this block.
-- =============================================================================

REVOKE ALL ON FUNCTION public.seed_org_default_roles(uuid) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 5) Storage-cleanup ops functions: intended service_role-only (called by
--    scripts/cleanup-storage-orphans.mjs using the service_role key), but
--    only ever revoked from PUBLIC -- never from anon or authenticated.
--    list_orphaned_storage_paths has no org filter at all: it lists every
--    orphaned object path across the whole `media` bucket for every
--    tenant, so this one was a live cross-org information-disclosure gap
--    for any authenticated caller (and anon), not just an accidental
--    anon-reachability issue. cleanup_orphaned_storage_objects always
--    raises before doing anything and run_storage_cleanup_job only writes
--    a fixed-shape row to the ops-only storage_cleanup_runs table, so
--    those two carry no data-disclosure risk, but are locked down to the
--    same standard for consistency with their documented service_role-only
--    intent.
-- =============================================================================

REVOKE ALL ON FUNCTION public.list_orphaned_storage_paths(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_orphaned_storage_paths(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_orphaned_storage_objects(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_storage_objects(int) TO service_role;

REVOKE ALL ON FUNCTION public.run_storage_cleanup_job(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_storage_cleanup_job(int) TO service_role;
