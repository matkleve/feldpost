-- Upload Role/RLS Validation Script
-- Purpose: verify allow/deny behavior for admin, clerk, worker, viewer on the
--          current media schema. Replaces the obsolete version that targeted the
--          dropped `images` table and the removed global `roles`/`user_roles.role_id`.
-- Scope:   media_items, media_projects, metadata_keys, media_metadata,
--          storage.objects (`media` bucket).
-- Model:   actors are resolved via per-org `org_roles` (name in
--          admin/clerk/worker/viewer) -> `user_roles.org_role_id`.
-- Safety:  runs inside a transaction and ends with ROLLBACK.
--
-- Run against a live, seeded database (cannot run in the offline sandbox):
--   psql "$DATABASE_URL" -f scripts/validate-upload-role-rls.sql

begin;

create temporary table if not exists _rls_results (
  check_name text not null,
  actor_role text not null,
  expected text not null,
  actual text not null,
  passed boolean not null,
  details text
) on commit drop;

create or replace function pg_temp.run_check(
  p_check_name text,
  p_actor_role text,
  p_sql text,
  p_should_succeed boolean
)
returns void
language plpgsql
as $$
declare
  ok boolean := true;
  err text := null;
begin
  begin
    execute p_sql;
  exception
    when others then
      ok := false;
      err := SQLERRM;
  end;

  insert into _rls_results(check_name, actor_role, expected, actual, passed, details)
  values (
    p_check_name,
    p_actor_role,
    case when p_should_succeed then 'ALLOW' else 'DENY' end,
    case when ok then 'ALLOW' else 'DENY' end,
    ok = p_should_succeed,
    err
  );
end;
$$;

create or replace function pg_temp.act_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', p_user_id::text)::text,
    true
  );
end;
$$;

do $$
declare
  org_id uuid;
  admin_id uuid;
  project_id uuid;
  metadata_key_id uuid;
  admin_media_id uuid;
  roles text[] := array['admin', 'clerk', 'worker', 'viewer'];
  role_name text;
  actor_id uuid;
  is_viewer boolean;
begin
  -- Resolve one user per org role from the current org_roles model.
  select ur.user_id into admin_id
  from public.user_roles ur
  join public.org_roles orole on orole.id = ur.org_role_id
  where orole.name = 'admin'
  limit 1;

  if admin_id is null then
    raise exception 'No admin user found (org_roles.name = admin)';
  end if;

  select p.organization_id into org_id from public.profiles p where p.id = admin_id;
  if org_id is null then
    raise exception 'Admin profile has no organization_id';
  end if;

  -- Seed shared fixtures as admin.
  perform pg_temp.act_as(admin_id);

  insert into public.projects (organization_id, created_by, name)
  values (org_id, admin_id, 'RLS Validation Project')
  returning id into project_id;

  insert into public.media_items
    (organization_id, created_by, media_type, mime_type, storage_path,
     file_name, file_size_bytes, location_status)
  values
    (org_id, admin_id, 'photo', 'image/jpeg',
     format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()),
     'admin.jpg', 1024, 'unresolved')
  returning id into admin_media_id;

  insert into public.media_projects (media_item_id, project_id)
  values (admin_media_id, project_id)
  on conflict do nothing;

  insert into public.metadata_keys (organization_id, created_by, name)
  values (org_id, admin_id, 'rls_validation_key')
  returning id into metadata_key_id;

  insert into public.media_metadata (media_item_id, key_id, value)
  values (admin_media_id, metadata_key_id, 'seed')
  on conflict do nothing;

  -- Per-role allow/deny matrix.
  foreach role_name in array roles loop
    select ur.user_id into actor_id
    from public.user_roles ur
    join public.org_roles orole on orole.id = ur.org_role_id
    join public.profiles p on p.id = ur.user_id
    where orole.name = role_name
      and p.organization_id = org_id
    limit 1;

    if actor_id is null then
      raise notice 'Skipping role % (no seeded user in org)', role_name;
      continue;
    end if;

    is_viewer := role_name = 'viewer';
    perform pg_temp.act_as(actor_id);

    -- 1) Insert own media item: allowed for non-viewers.
    perform pg_temp.run_check(
      'media_items insert (own)', role_name,
      format(
        'insert into public.media_items (organization_id, created_by, media_type, mime_type, storage_path, file_name, file_size_bytes, location_status) '
        || 'values (%L, %L, %L, %L, %L, %L, %s, %L)',
        org_id, actor_id, 'photo', 'image/jpeg',
        format('%s/%s/%s.jpg', org_id, actor_id, gen_random_uuid()),
        'own.jpg', 2048, 'unresolved'),
      not is_viewer
    );

    -- 2) Update another user's (admin's) media item: only admin may (is_admin()).
    perform pg_temp.run_check(
      'media_items update (other user''s)', role_name,
      format('update public.media_items set file_name = %L where id = %L', 'touched.jpg', admin_media_id),
      role_name = 'admin'
    );

    -- 3) media_metadata insert on an org media item: allowed for non-viewers.
    perform pg_temp.run_check(
      'media_metadata insert', role_name,
      format('insert into public.media_metadata (media_item_id, key_id, value) values (%L, %L, %L) on conflict (media_item_id, key_id) do update set value = excluded.value',
             admin_media_id, metadata_key_id, role_name),
      not is_viewer
    );

    -- 4) metadata_keys insert: allowed for non-viewers.
    perform pg_temp.run_check(
      'metadata_keys insert', role_name,
      format('insert into public.metadata_keys (organization_id, created_by, name) values (%L, %L, %L)',
             org_id, actor_id, 'key_' || role_name),
      not is_viewer
    );

    -- 5) Storage upload into OWN path in the media bucket: allowed for non-viewers.
    perform pg_temp.run_check(
      'storage media upload (own path)', role_name,
      format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)',
             'media', format('%s/%s/%s.jpg', org_id, actor_id, gen_random_uuid()), actor_id),
      not is_viewer
    );

    -- 6) Storage upload into another user's path: denied (path guard) unless it is
    --    the actor's own path (true only for the admin actor here).
    perform pg_temp.run_check(
      'storage media upload (foreign path)', role_name,
      format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)',
             'media', format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()), actor_id),
      actor_id = admin_id
    );
  end loop;
end;
$$;

select check_name, actor_role, expected, actual,
       case when passed then 'PASS' else 'FAIL' end as result,
       details
from _rls_results
order by check_name, actor_role;

do $$
declare
  failures int;
begin
  select count(*) into failures from _rls_results where not passed;
  if failures > 0 then
    raise exception 'Upload RLS validation failed: % check(s) did not match expectation', failures;
  end if;
end;
$$;

rollback;
