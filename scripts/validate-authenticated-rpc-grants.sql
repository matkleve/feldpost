-- Authenticated-only RPC grant validation
-- Purpose: assert that every RPC intended as "authenticated only" is NOT
--          executable by anon, and IS executable by authenticated; that
--          RPCs intended as service_role-only are executable by neither
--          anon nor authenticated; and that RPCs intended as callable by
--          no client-facing role at all (internal-only helpers) are
--          executable by neither.
-- Why:     REVOKE ALL ON FUNCTION ... FROM PUBLIC does not revoke Supabase's
--          own default anon/authenticated grants (ALTER DEFAULT PRIVILEGES
--          ... GRANT ALL ON FUNCTIONS TO anon, authenticated, applied at
--          CREATE FUNCTION time). A function gated only "FROM PUBLIC" is
--          still anon- and authenticated-callable regardless of who it was
--          meant for. See issue #193 and issue #201.
-- Scope:   the RPCs fixed in
--          20260911120000_revoke_anon_execute_on_authenticated_rpcs.sql and
--          20260911130000_revoke_anon_execute_on_remaining_authenticated_rpcs.sql.
--          Add a row to the relevant `_expected_*` table below whenever a
--          new RPC of that shape is added, so this cannot regress silently.
--
-- Run against a live database (needs real catalog state, not the offline
-- sandbox):
--   psql "$DATABASE_URL" -f scripts/validate-authenticated-rpc-grants.sql

begin;

-- ---------------------------------------------------------------------------
-- Category 1: authenticated-only (anon: NO EXECUTE, authenticated: EXECUTE)
-- ---------------------------------------------------------------------------
create temporary table _expected_authenticated_only (
  regprocedure text primary key
) on commit drop;

insert into _expected_authenticated_only (regprocedure) values
  ('public.find_photoless_conflicts(double precision, double precision, text)'),
  ('public.retire_dedup_hashes_for_media_item(uuid, text)'),
  ('public.add_media_item_location(uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text)'),
  ('public.assign_org_member_role(uuid, uuid)'),
  ('public.bulk_update_image_addresses(uuid[], text, text, text, text, text)'),
  ('public.bulk_update_media_addresses(uuid[], text, text, text, text, text, text)'),
  ('public.check_dedup_hashes(text[])'),
  ('public.cluster_images(numeric, numeric, integer)'),
  ('public.cluster_images_multi(jsonb, int)'),
  ('public.count_zoomable_locations_for_media(uuid)'),
  ('public.create_or_reuse_share_set(uuid[], timestamptz, public.share_link_audience, public.share_link_grant, uuid[])'),
  ('public.delete_media_item_location(uuid)'),
  ('public.delete_own_account()'),
  ('public.find_or_create_dm_channel(uuid)'),
  ('public.find_or_create_location(text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text)'),
  ('public.get_chat_unread_counts(uuid)'),
  ('public.get_location_by_address_components(text, text, text, text, text, text, text, text)'),
  ('public.get_media_clusters(uuid, double precision)'),
  ('public.get_unresolved_images(integer)'),
  ('public.get_unresolved_media(integer)'),
  ('public.invite_chat_channel_member(uuid, uuid)'),
  ('public.link_media_to_location(uuid, uuid)'),
  ('public.list_locations_for_media(uuid, integer, integer)'),
  ('public.list_media_item_locations(uuid, integer, integer)'),
  ('public.process_org_export_job(uuid)'),
  ('public.remove_org_member(uuid)'),
  ('public.resolve_image_location(uuid, numeric, numeric, text, text, text, text, text)'),
  ('public.resolve_media_location(uuid, numeric, numeric, text, text, text, text, text, text, text, text, text)'),
  ('public.search_locations(text, integer, uuid)'),
  ('public.set_primary_media_item_location(uuid)'),
  ('public.suspend_org_member(uuid)'),
  ('public.sync_media_items_from_primary_location(uuid)'),
  ('public.unlink_media_from_location(uuid, uuid)'),
  ('public.unsuspend_org_member(uuid)'),
  ('public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text)'),
  ('public.update_media_item_location(uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text)'),
  ('public.validate_media_membership_rules(uuid)'),
  ('public.viewport_markers(numeric, numeric, numeric, numeric, integer)'),
  ('public.user_role_level()'),
  ('public.target_user_role_level(uuid)'),
  ('public.can_manage_user(uuid)');

-- ---------------------------------------------------------------------------
-- Category 2: service_role-only (anon: NO EXECUTE, authenticated: NO
-- EXECUTE, service_role: EXECUTE)
-- ---------------------------------------------------------------------------
create temporary table _expected_service_role_only (
  regprocedure text primary key
) on commit drop;

insert into _expected_service_role_only (regprocedure) values
  ('public.list_orphaned_storage_paths(integer)'),
  ('public.cleanup_orphaned_storage_objects(int)'),
  ('public.run_storage_cleanup_job(int)');

-- ---------------------------------------------------------------------------
-- Category 3: no client-facing role at all (anon: NO EXECUTE,
-- authenticated: NO EXECUTE). Only ever invoked internally by other
-- SECURITY DEFINER functions, which run as the owner and are unaffected
-- by these revokes.
-- ---------------------------------------------------------------------------
create temporary table _expected_internal_only (
  regprocedure text primary key
) on commit drop;

insert into _expected_internal_only (regprocedure) values
  ('public.seed_org_default_roles(uuid)');

create temporary table _grant_results (
  regprocedure text not null,
  role_name text not null,
  expected boolean not null,
  actual boolean not null,
  passed boolean not null
) on commit drop;

do $$
declare
  rec record;
  anon_can_exec boolean;
  authenticated_can_exec boolean;
  service_role_can_exec boolean;
begin
  for rec in select regprocedure from _expected_authenticated_only loop
    anon_can_exec := has_function_privilege('anon', rec.regprocedure::regprocedure, 'EXECUTE');
    authenticated_can_exec := has_function_privilege('authenticated', rec.regprocedure::regprocedure, 'EXECUTE');

    insert into _grant_results values (
      rec.regprocedure, 'anon', false, anon_can_exec, anon_can_exec = false
    );
    insert into _grant_results values (
      rec.regprocedure, 'authenticated', true, authenticated_can_exec, authenticated_can_exec = true
    );
  end loop;

  for rec in select regprocedure from _expected_service_role_only loop
    anon_can_exec := has_function_privilege('anon', rec.regprocedure::regprocedure, 'EXECUTE');
    authenticated_can_exec := has_function_privilege('authenticated', rec.regprocedure::regprocedure, 'EXECUTE');
    service_role_can_exec := has_function_privilege('service_role', rec.regprocedure::regprocedure, 'EXECUTE');

    insert into _grant_results values (
      rec.regprocedure, 'anon', false, anon_can_exec, anon_can_exec = false
    );
    insert into _grant_results values (
      rec.regprocedure, 'authenticated', false, authenticated_can_exec, authenticated_can_exec = false
    );
    insert into _grant_results values (
      rec.regprocedure, 'service_role', true, service_role_can_exec, service_role_can_exec = true
    );
  end loop;

  for rec in select regprocedure from _expected_internal_only loop
    anon_can_exec := has_function_privilege('anon', rec.regprocedure::regprocedure, 'EXECUTE');
    authenticated_can_exec := has_function_privilege('authenticated', rec.regprocedure::regprocedure, 'EXECUTE');

    insert into _grant_results values (
      rec.regprocedure, 'anon', false, anon_can_exec, anon_can_exec = false
    );
    insert into _grant_results values (
      rec.regprocedure, 'authenticated', false, authenticated_can_exec, authenticated_can_exec = false
    );
  end loop;
end;
$$;

select regprocedure, role_name,
       case when expected then 'EXECUTE' else 'NO EXECUTE' end as expected,
       case when actual then 'EXECUTE' else 'NO EXECUTE' end as actual,
       case when passed then 'PASS' else 'FAIL' end as result
from _grant_results
order by regprocedure, role_name;

do $$
declare
  failures int;
begin
  select count(*) into failures from _grant_results where not passed;
  if failures > 0 then
    raise exception 'Authenticated-only RPC grant validation failed: % check(s) did not match expectation', failures;
  end if;
end;
$$;

rollback;
